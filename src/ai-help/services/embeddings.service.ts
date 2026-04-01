import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class EmbeddingsService {
  private readonly ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Falta GEMINI_API_KEY en las variables de entorno');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateDocumentEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings?.[0]?.values;

    if (!values || !Array.isArray(values) || values.length !== 768) {
      throw new Error('No se pudo generar un embedding válido de 768 dimensiones');
    }

    return this.normalize(values);
  }

  async generateQueryEmbedding(text: string): Promise<number[]> {
    const response = await this.ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents: text,
      config: {
        taskType: 'RETRIEVAL_QUERY',
        outputDimensionality: 768,
      },
    });

    const values = response.embeddings?.[0]?.values;

    if (!values || !Array.isArray(values) || values.length !== 768) {
      throw new Error('No se pudo generar un embedding válido de 768 dimensiones');
    }

    return this.normalize(values);
  }

  private normalize(values: number[]): number[] {
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));

    if (!norm) {
      return values;
    }

    return values.map((value) => value / norm);
  }
}