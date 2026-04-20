import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsModule } from './products/products.module';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AccountModule } from './account/account.module';
import { CustomersModule } from './customers/customers.module';
import { MovementsModule } from './movements/movements.module';
import { StatisticsModule } from './statistics/statistics.module';
import { CategoriesModule } from './categories/categories.module';
import { AiHelpModule } from './ai-help/ai-help.module';

@Module({
  imports: [
    ConfigModule.forRoot({
    isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      { ttl: 60, limit: 120 },    // Global rate limiting
      { ttl: 900, limit: 3 }      // Login: 3 intentos cada 15 minutos
    ]),

    TypeOrmModule.forRoot({
      type:'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      autoLoadEntities: true,
      synchronize: false,
    }),

    ProductsModule,
    CommonModule,
    AuthModule,
    AccountModule,
    CustomersModule,
    MovementsModule,
    StatisticsModule,
    CategoriesModule,
    AiHelpModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    // VALIDAR SECRETS EN INITIALIZATION
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET debe tener mínimo 32 caracteres y estar configurado');
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
      throw new Error('JWT_REFRESH_SECRET debe tener mínimo 32 caracteres y estar configurado');
    }
  }
}