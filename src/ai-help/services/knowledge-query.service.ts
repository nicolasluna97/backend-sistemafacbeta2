import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KnowledgeDocument } from '../entities/knowledge-document.entity';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';

@Injectable()
export class KnowledgeQueryService {
  constructor(
    @InjectRepository(KnowledgeDocument)
    private readonly knowledgeDocumentRepository: Repository<KnowledgeDocument>,

    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeChunkRepository: Repository<KnowledgeChunk>,
  ) {}

  async getAllDocuments() {
    return this.knowledgeDocumentRepository.find({
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getChunksByDocumentSlug(slug: string) {
    const document = await this.knowledgeDocumentRepository.findOne({
      where: { slug },
    });

    if (!document) {
      return {
        message: `No se encontró un documento con slug "${slug}"`,
      };
    }

    const chunks = await this.knowledgeChunkRepository.find({
      where: { documentId: document.id },
      order: {
        chunkIndex: 'ASC',
      },
    });

    return {
      document: {
        id: document.id,
        title: document.title,
        slug: document.slug,
      },
      totalChunks: chunks.length,
      chunks,
    };
  }
}