import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    TypeOrmModule.forFeature([Product]),
    AuthModule, // Importar AuthModule para usar el decorador @GetUser
  ],
  exports: [
    ProductsService,
    TypeOrmModule,
  ]
})
export class ProductsModule {}