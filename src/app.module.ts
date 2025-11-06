import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot(),

    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minuto en milisegundos
      limit: 5, // 5 intentos por minuto
    }]),

    TypeOrmModule.forRoot({
      type:'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: true,
    }),

    ProductsModule,

    CommonModule,

    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // Aplica rate limiting global
    },
  ],
})
export class AppModule {}
