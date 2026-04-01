import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { KnowledgeDocument } from '../entities/knowledge-document.entity';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);

  private readonly docsPath = path.join(
    process.cwd(),
    'src',
    'ai-help',
    'docs',
  );

  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly knowledgeDocumentRepository: Repository<KnowledgeDocument>,

    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeChunkRepository: Repository<KnowledgeChunk>,
  ) {}

  readMarkdownFiles(): Array<{
    fileName: string;
    title: string;
    slug: string;
    content: string;
    sourcePath: string;
  }> {
    if (!fs.existsSync(this.docsPath)) {
      throw new Error(`No existe la carpeta de docs: ${this.docsPath}`);
    }

    const files = fs
      .readdirSync(this.docsPath)
      .filter((file) => file.endsWith('.md'))
      .sort();

    const documents = files.map((fileName) => {
      const fullPath = path.join(this.docsPath, fileName);
      const content = fs.readFileSync(fullPath, 'utf-8');

      const title = this.extractTitle(content, fileName);
      const slug = this.buildSlug(fileName);

      return {
        fileName,
        title,
        slug,
        content,
        sourcePath: fullPath,
      };
    });

    this.logger.log(`Se leyeron ${documents.length} documentos markdown`);

    return documents;
  }

  async ingestDocuments() {
    const documents = this.readMarkdownFiles();
    const summary: Array<{
      fileName: string;
      documentId: string;
      title: string;
      chunksCreated: number;
    }> = [];

    for (const doc of documents) {
      const savedDocument = await this.upsertDocument(doc);

      await this.knowledgeChunkRepository.delete({
        documentId: savedDocument.id,
      });

      const chunks = this.splitIntoChunks(doc.content);

      const chunkEntities = chunks.map((chunk, index) =>
        this.knowledgeChunkRepository.create({
          documentId: savedDocument.id,
          sectionTitle: chunk.sectionTitle,
          chunkIndex: index,
          content: chunk.content,
          metadata: {
            fileName: doc.fileName,
            slug: doc.slug,
            sourcePath: doc.sourcePath,
          },
        }),
      );

      await this.knowledgeChunkRepository.save(chunkEntities);

      summary.push({
        fileName: doc.fileName,
        documentId: savedDocument.id,
        title: savedDocument.title,
        chunksCreated: chunkEntities.length,
      });

      this.logger.log(
        `Documento "${doc.fileName}" ingerido con ${chunkEntities.length} chunks`,
      );
    }

    return {
      totalDocuments: summary.length,
      documents: summary,
    };
  }

  private async upsertDocument(doc: {
    fileName: string;
    title: string;
    slug: string;
    content: string;
    sourcePath: string;
  }): Promise<KnowledgeDocument> {
    let existing = await this.knowledgeDocumentRepository.findOne({
      where: { slug: doc.slug },
    });

    if (!existing) {
      existing = this.knowledgeDocumentRepository.create({
        title: doc.title,
        slug: doc.slug,
        sourcePath: doc.sourcePath,
        version: 1,
        isActive: true,
      });

      return this.knowledgeDocumentRepository.save(existing);
    }

    existing.title = doc.title;
    existing.sourcePath = doc.sourcePath;
    existing.isActive = true;

    return this.knowledgeDocumentRepository.save(existing);
  }

  private splitIntoChunks(content: string): Array<{
    sectionTitle: string;
    content: string;
  }> {
    const normalized = content.replace(/\r\n/g, '\n').trim();

    const sections = normalized
      .split(/\n(?=##?\s)/g)
      .map((section) => section.trim())
      .filter(Boolean);

    if (sections.length === 0) {
      return [
        {
          sectionTitle: 'Contenido general',
          content: normalized,
        },
      ];
    }

    return sections.map((section) => {
      const lines = section.split('\n');
      const firstLine = lines[0]?.trim() || 'Contenido';
      const sectionTitle = firstLine.replace(/^#+\s*/, '').trim();

      return {
        sectionTitle,
        content: section,
      };
    });
  }

  private extractTitle(content: string, fileName: string): string {
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading?.[1]) {
      return firstHeading[1].trim();
    }

    return fileName.replace('.md', '');
  }

  private buildSlug(fileName: string): string {
    return fileName
      .replace('.md', '')
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}