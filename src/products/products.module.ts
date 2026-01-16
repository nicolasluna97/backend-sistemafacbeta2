import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './entities/product.entity';
import { AuthModule } from '../auth/auth.module';
import { Category } from 'src/categories/entities/category.entity';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  imports: [
    TypeOrmModule.forFeature([Product, Category]),
    AuthModule,
  ],
  exports: [
    ProductsService,
    TypeOrmModule,
  ],
})
export class ProductsModule {}
