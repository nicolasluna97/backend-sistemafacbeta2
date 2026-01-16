import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { isUUID } from 'class-validator';
import { User } from '../auth/entities/user.entity';

import { DecreaseStockMovementDto } from './dto/decrease-stock-movement.dto';
import { Movement } from 'src/movements/entities/movement.entity';

// NUEVO
import { Category } from 'src/categories/entities/category.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    // NUEVO
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  // ===== Helpers Category =====

  private async assertCategoryBelongsToUser(categoryId: string, userId: string): Promise<Category> {
    if (!isUUID(categoryId)) {
      throw new BadRequestException('categoryId inválido.');
    }

    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, userId },
    });

    if (!category) {
      throw new BadRequestException('La categoría seleccionada no existe o no te pertenece.');
    }

    return category;
  }

  // ===== CRUD =====

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      // 1) Validar categoría obligatoria
      const category = await this.assertCategoryBelongsToUser(
        createProductDto.categoryId,
        user.id,
      );

      // 2) Crear producto
      const product = this.productRepository.create({
        ...createProductDto,

        // Importante: que quede seteada la relación y el FK
        category,
        categoryId: category.id,

        user,
        userId: user.id,
      });

      await this.productRepository.save(product);

      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(paginationDto: PaginationDto, user: User) {
    const { limit = 10, offset = 0 } = paginationDto;

    return await this.productRepository.find({
      where: { userId: user.id },
      take: limit,
      skip: offset,
      relations: ['user', 'category'], // RECOMENDADO: así el front puede mostrar nombre de categoría
      order: { title: 'ASC' },
    });
  }

  async findOne(term: string, user: User): Promise<Product | Product[]> {
    if (isUUID(term)) {
      const product = await this.productRepository.findOne({
        where: { id: term, userId: user.id },
        relations: ['category'], // RECOMENDADO
      });

      if (!product) {
        throw new NotFoundException(`Product with id "${term}" not found`);
      }
      return product;
    }

    const products = await this.productRepository
      .createQueryBuilder('prod')
      .where('prod.userId = :userId', { userId: user.id })
      .andWhere('UPPER(prod.title) LIKE :title', {
        title: `%${term.toUpperCase()}%`,
      })
      .leftJoinAndSelect('prod.category', 'category') // RECOMENDADO
      .getMany();

    if (products.length === 0) {
      throw new NotFoundException(`No products found with term "${term}"`);
    }

    return products;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const product = await this.findProductByIdAndUser(id, user);

    // Si viene categoryId, validarlo
    if (updateProductDto.categoryId !== undefined) {
      const category = await this.assertCategoryBelongsToUser(updateProductDto.categoryId, user.id);
      product.category = category;
      product.categoryId = category.id;
    }

    // Merge del resto
    const updatedProduct = this.productRepository.merge(product, updateProductDto);

    try {
      return await this.productRepository.save(updatedProduct);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  /**
   * decreaseStock: ya lo tenés bien; no cambia por categorías.
   */
  async decreaseStock(id: string, dto: DecreaseStockMovementDto, user: User) {
    const { quantity, customerId, customerName, unitPrice, priceKey } = dto;

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0.');
    }

    return this.productRepository.manager.transaction(async (manager) => {
      const prodRepo = manager.getRepository(Product);
      const movRepo = manager.getRepository(Movement);

      const product = await prodRepo.findOne({
        where: { id, userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!product) {
        throw new NotFoundException(
          `Product with id "${id}" not found or you don't have permission to access it`,
        );
      }

      if (product.stock < quantity) {
        throw new BadRequestException(
          `No hay suficiente stock para "${product.title}". Stock: ${product.stock}, pedido: ${quantity}.`,
        );
      }

      product.stock = product.stock - quantity;
      await prodRepo.save(product);

      const movement = movRepo.create({
        userId: user.id,
        customerId,
        customerName,
        productId: product.id,
        productTitle: product.title,
        quantity,
        unitPrice,
        priceKey,
        purchasePriceAtSale: Number((product.purchasePrice as any) ?? 0),
        status: null,
        employee: null,
      });

      await movRepo.save(movement);

      return product;
    });
  }

  async remove(id: string, user: User) {
    const product = await this.findProductByIdAndUser(id, user);
    await this.productRepository.remove(product);
    return { message: `Product with id ${id} deleted successfully` };
  }

  private async findProductByIdAndUser(id: string, user: User): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id, userId: user.id },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with id "${id}" not found or you don't have permission to access it`,
      );
    }

    return product;
  }

  private handleDBExceptions(error: any) {
   
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Error - check logs');
  }
}
