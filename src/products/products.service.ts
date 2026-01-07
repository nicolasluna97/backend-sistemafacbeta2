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

// DTO correcto (el que trae customerId/customerName/unitPrice/priceKey)
import { DecreaseStockMovementDto } from './dto/decrease-stock-movement.dto';

// Entity de movimientos
import { Movement } from 'src/movements/entities/movement.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const product = this.productRepository.create({
        ...createProductDto,
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
      relations: ['user'],
    });
  }

  async findOne(term: string, user: User): Promise<Product | Product[]> {
    if (isUUID(term)) {
      const product = await this.productRepository.findOne({
        where: { id: term, userId: user.id },
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
      .getMany();

    if (products.length === 0) {
      throw new NotFoundException(`No products found with term "${term}"`);
    }

    return products;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const product = await this.findProductByIdAndUser(id, user);
    const updatedProduct = this.productRepository.merge(product, updateProductDto);
    return await this.productRepository.save(updatedProduct);
  }

  /**
   * Descuenta stock + registra Movement de forma atómica (misma transacción).
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

      // 1) Descontar stock
      product.stock = product.stock - quantity;
      await prodRepo.save(product);

      // 2) Registrar movimiento
      const movement = movRepo.create({
        userId: user.id,
        customerId,
        customerName,
        productId: product.id,
        productTitle: product.title,
        quantity,
        unitPrice,
        priceKey,
        purchasePriceAtSale: Number(product.purchasePrice ?? 0),
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
