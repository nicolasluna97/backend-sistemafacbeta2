import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { VectorSearchService } from './vector-search.service';

@Injectable()
export class HelpChatService {
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly vectorSearchService: VectorSearchService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      throw new Error('Falta GEMINI_API_KEY en las variables de entorno');
    }

    this.ai = new GoogleGenAI({ apiKey });
  }

  async ask(question: string) {
    const normalizedQuestion = question.trim().toLowerCase();

    const greetingPatterns = [
      'hola',
      'buenas',
      'buen día',
      'buen dia',
      'buenas tardes',
      'buenas noches',
      'buenos días',
      'buenos dias',
    ];

    const isGreeting = greetingPatterns.some((greeting) =>
      normalizedQuestion.includes(greeting),
    );

    if (isGreeting) {
      return {
        question,
        answer:
          'Hola. Soy el asistente de ayuda de la aplicación. Podés preguntarme, por ejemplo, cómo registrar una venta, cómo crear un cliente, cómo consultar movimientos o cómo ver el stock disponible.',
        sources: [],
      };
    }

    if (normalizedQuestion.length < 4) {
      return {
        question,
        answer:
          'Podés preguntarme cosas sobre cómo usar la aplicación, por ejemplo: cómo registrar una venta, cómo crear un cliente o cómo consultar movimientos.',
        sources: [],
      };
    }

    const searchResult = await this.vectorSearchService.searchSimilarChunks(
      question,
      3,
    );

    const chunks = searchResult.results;

    if (!chunks.length || chunks[0].similarity < 0.60) {
      return {
        question,
        answer:
          'No encontré esa información con suficiente claridad en el manual actual. Probá reformular la pregunta o agregar más detalle.',
        sources: [],
      };
    }

    const context = chunks
      .map(
        (chunk, index) => `
    [Fuente ${index + 1}]
    Documento: ${chunk.documentTitle}
    Sección: ${chunk.sectionTitle}
    Contenido:
    ${chunk.content}
            `.trim(),
          )
          .join('\n\n');

        const prompt = `
    Sos un asistente de ayuda de una aplicación privada de facturación e inventario.

    Tu tarea es responder únicamente usando el contexto provisto del manual interno.

    Reglas:
    - Respondé solo con la información del contexto.
    - Si la respuesta no está en el contexto, decí claramente que no encontraste esa información en el manual.
    - No inventes funcionalidades, botones, campos ni módulos.
    - Respondé en español.
    - Si corresponde, respondé con pasos claros y ordenados.
    - Sé breve pero útil.

    Pregunta del usuario:
    ${question}

    Contexto:
    ${context}
        `;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const answer =
      response.text?.trim() ||
      'No se pudo generar una respuesta en este momento.';

    return {
      question,
      answer,
      sources: chunks.map((chunk) => ({
        documentTitle: chunk.documentTitle,
        documentSlug: chunk.documentSlug,
        sectionTitle: chunk.sectionTitle,
        similarity: chunk.similarity,
      })),
    };
  }
}