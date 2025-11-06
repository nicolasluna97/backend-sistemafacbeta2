import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefijo global para tus endpoints
  app.setGlobalPrefix('api');

  // ✅ Habilitar CORS para permitir peticiones desde Angular (localhost:4200)
  app.enableCors({
    origin: ['http://localhost:4200'],  // tu front
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // 🔥 Importante en Docker: escuchar en 0.0.0.0 (no solo localhost)
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  console.log(`🚀 Server running on http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();