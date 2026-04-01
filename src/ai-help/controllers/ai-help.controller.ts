import { Controller, Get, Param, Post, Query, Body } from '@nestjs/common';
import { KnowledgeIngestionService } from '../services/knowledge-ingestion.service';
import { KnowledgeQueryService } from '../services/knowledge-query.service';
import { KnowledgeEmbeddingService } from '../services/knowledge-embedding.service';
import { VectorSearchService } from '../services/vector-search.service';
import { HelpChatService } from '../services/help-chat.service';
import { AskHelpDto } from '../dto/ask-help.dto';

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

  @Get('ingest')
  async ingestDocuments() {
    return this.knowledgeIngestionService.ingestDocuments();
  }

  @Get('documents')
  async getAllDocuments() {
    return this.knowledgeQueryService.getAllDocuments();
  }

  @Get('documents/:slug/chunks')
  async getChunksByDocumentSlug(@Param('slug') slug: string) {
    return this.knowledgeQueryService.getChunksByDocumentSlug(slug);
  }

  @Get('embed')
  async embedAllChunks() {
    return this.knowledgeEmbeddingService.embedAllChunks();
  }

  @Get('search')
  async search(@Query('query') query: string) {
  return this.vectorSearchService.searchSimilarChunks(query);
  }
 
  @Post('chat')
  async chat(@Body() askHelpDto: AskHelpDto) {
    return this.helpChatService.ask(askHelpDto.question);
}
}