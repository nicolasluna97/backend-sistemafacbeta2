import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { KnowledgeChunk } from '../entities/knowledge-chunk.entity';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class KnowledgeEmbeddingService {
  private readonly logger = new Logger(KnowledgeEmbeddingService.name);

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly knowledgeChunkRepository: Repository<KnowledgeChunk>,
    private readonly embeddingsService: EmbeddingsService,
    private readonly dataSource: DataSource,
  ) {}

  async embedAllChunks() {
    const chunks = await this.knowledgeChunkRepository.find({
      order: {
        createdAt: 'ASC',
        chunkIndex: 'ASC',
      },
    });

    const summary: Array<{
      chunkId: string;
      sectionTitle: string;
      dimensions: number;
    }> = [];

    for (const chunk of chunks) {
      const embedding = await this.embeddingsService.generateDocumentEmbedding(
        chunk.content,
      );

      await this.dataSource.query(
        `
          UPDATE knowledge_chunks
          SET embedding = $1::vector
          WHERE id = $2
        `,
        [this.toPgVector(embedding), chunk.id],
      );

      summary.push({
        chunkId: chunk.id,
        sectionTitle: chunk.sectionTitle,
        dimensions: embedding.length,
      });

      this.logger.log(
        `Embedding guardado para chunk ${chunk.id} (${chunk.sectionTitle})`,
      );
    }

    return {
      totalChunksEmbedded: summary.length,
      chunks: summary,
    };
  }

  private toPgVector(values: number[]): string {
    return `[${values.join(',')}]`;
  }
}