import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EmbeddingsService } from './embeddings.service';

@Injectable()
export class VectorSearchService {
  constructor(
    private readonly embeddingsService: EmbeddingsService,
    private readonly dataSource: DataSource,
  ) {}

  async searchSimilarChunks(query: string, limit = 5) {
    const queryEmbedding =
      await this.embeddingsService.generateQueryEmbedding(query);

    const pgVector = this.toPgVector(queryEmbedding);

    const results = await this.dataSource.query(
      `
      SELECT
        kc.id,
        kc.document_id AS "documentId",
        kc."sectionTitle" AS "sectionTitle",
        kc."chunkIndex" AS "chunkIndex",
        kc.content,
        kc.metadata,
        kd.title AS "documentTitle",
        kd.slug AS "documentSlug",
        1 - (kc.embedding <=> $1::vector) AS similarity
      FROM knowledge_chunks kc
      INNER JOIN knowledge_documents kd
        ON kd.id = kc.document_id
      WHERE kc.embedding IS NOT NULL
      ORDER BY kc.embedding <=> $1::vector
      LIMIT $2
      `,
      [pgVector, limit],
    );

    return {
      query,
      totalResults: results.length,
      results,
    };
  }

  private toPgVector(values: number[]): string {
    return `[${values.join(',')}]`;
  }
}