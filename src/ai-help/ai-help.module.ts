import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiHelpController } from './controllers/ai-help.controller';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { EmbeddingsService } from './services/embeddings.service';
import { HelpChatService } from './services/help-chat.service';
import { KnowledgeEmbeddingService } from './services/knowledge-embedding.service';
import { KnowledgeIngestionService } from './services/knowledge-ingestion.service';
import { KnowledgeQueryService } from './services/knowledge-query.service';
import { VectorSearchService } from './services/vector-search.service';
import { AiHelpAdminGuard } from './guards/ai-help-admin.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([KnowledgeDocument, KnowledgeChunk]),
  ],
  controllers: [AiHelpController],
  providers: [
    KnowledgeIngestionService,
    KnowledgeQueryService,
    EmbeddingsService,
    KnowledgeEmbeddingService,
    VectorSearchService,
    HelpChatService,
    AiHelpAdminGuard,
  ],
  exports: [
    KnowledgeIngestionService,
    KnowledgeQueryService,
    EmbeddingsService,
    KnowledgeEmbeddingService,
    VectorSearchService,
    HelpChatService,
  ],
})
export class AiHelpModule {}