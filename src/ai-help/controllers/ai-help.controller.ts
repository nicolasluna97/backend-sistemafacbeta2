import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { AskHelpDto } from '../dto/ask-help.dto';
import { EmbedChunksDto } from '../dto/embed-chunks.dto';
import { IngestDocumentsDto } from '../dto/ingest-documents.dto';
import { SearchAiHelpDto } from '../dto/search-ai-help.dto';

import { KnowledgeIngestionService } from '../services/knowledge-ingestion.service';
import { KnowledgeQueryService } from '../services/knowledge-query.service';
import { KnowledgeEmbeddingService } from '../services/knowledge-embedding.service';
import { VectorSearchService } from '../services/vector-search.service';
import { HelpChatService } from '../services/help-chat.service';
import { AiHelpAdminGuard } from '../guards/ai-help-admin.guard';

@UseGuards(AuthGuard())
@Controller('ai-help')
export class AiHelpController {
  constructor(
    private readonly knowledgeIngestionService: KnowledgeIngestionService,
    private readonly knowledgeQueryService: KnowledgeQueryService,
    private readonly knowledgeEmbeddingService: KnowledgeEmbeddingService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly helpChatService: HelpChatService,
  ) {}

  @Get('docs-preview')
  getDocsPreview() {
    return this.knowledgeIngestionService.readMarkdownFiles();
  }

  @Post('ingest')
  @UseGuards(AiHelpAdminGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async ingestDocuments(@Body() dto: IngestDocumentsDto) {
    // Confirmación explícita para evitar ejecuciones accidentales
    if (!dto.confirm) {
      return {
        ok: false,
        message: 'Debes enviar { "confirm": true } para ejecutar la ingesta.',
      };
    }

    const result = await this.knowledgeIngestionService.ingestDocuments();
    return {
      ok: true,
      action: 'ingest',
      ...result,
    };
  }

  @Get('documents')
  async getAllDocuments() {
    return this.knowledgeQueryService.getAllDocuments();
  }

  @Get('documents/:slug/chunks')
  async getChunksByDocumentSlug(@Param('slug') slug: string) {
    return this.knowledgeQueryService.getChunksByDocumentSlug(slug);
  }

  @Post('embed')
  @UseGuards(AiHelpAdminGuard)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  async embedAllChunks(@Body() dto: EmbedChunksDto) {
    if (!dto.confirm) {
      return {
        ok: false,
        message: 'Debes enviar { "confirm": true } para ejecutar embeddings.',
      };
    }

    const result = await this.knowledgeEmbeddingService.embedAllChunks();
    return {
      ok: true,
      action: 'embed',
      ...result,
    };
  }

  @Get('search')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async search(@Query() queryDto: SearchAiHelpDto) {
    return this.vectorSearchService.searchSimilarChunks(
      queryDto.query,
      queryDto.limit ?? 5,
    );
  }

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async chat(@Body() askHelpDto: AskHelpDto) {
    return this.helpChatService.ask(askHelpDto.question);
  }
}