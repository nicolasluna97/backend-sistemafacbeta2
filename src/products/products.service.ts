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
        user: user,
        userId: user.id,
      });
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  // Encontrar todos los productos del usuario autenticado
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
      // Buscar por UUID pero verificando que sea del usuario
      const product = await this.productRepository.findOne({
        where: {
          id: term,
          userId: user.id,
        },
      });
      if (!product)
        throw new NotFoundException(`Product with id "${term}" not found`);
      return product;
    } else {
      // Buscar por título pero solo productos del usuario
      const products = await this.productRepository
        .createQueryBuilder('prod')
        .where('prod.userId = :userId', { userId: user.id })
        .andWhere('UPPER(prod.title) LIKE :title', {
          title: `%${term.toUpperCase()}%`,
        })
        .getMany();

      if (products.length === 0)
        throw new NotFoundException(`No products found with term "${term}"`);

      return products;
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    // Verificar que el producto pertenezca al usuario
    const product = await this.findProductByIdAndUser(id, user);

    const updatedProduct = this.productRepository.merge(product, updateProductDto);
    return await this.productRepository.save(updatedProduct);
  }

  /**
   * Descuenta stock de un producto del usuario autenticado.
   * - Usa transacción + lock pesimista para evitar stock negativo con ventas simultáneas.
   */
  async decreaseStock(id: string, quantity: number, user: User) {
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0.');
    }

    return this.productRepository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(Product);

      // Pessimistic write lock: asegura que dos ventas no descuenten al mismo tiempo
      const product = await repo.findOne({
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
      await repo.save(product);

      return product;
    });
  }

  async remove(id: string, user: User) {
    // Verificar que el producto pertenezca al usuario
    const product = await this.findProductByIdAndUser(id, user);
    await this.productRepository.remove(product);
    return { message: `Product with id ${id} deleted successfully` };
  }

  // Método para encontrar producto por ID y usuario
  private async findProductByIdAndUser(id: string, user: User): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: {
        id: id,
        userId: user.id,
      },
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
