import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
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
    private readonly productRepository: Repository<Product>
  ){}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const product = this.productRepository.create({
        ...createProductDto,
        user: user, // Asignar el usuario autenticado
        userId: user.id // También asignar el userId explícitamente
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
      where: { userId: user.id }, // Solo productos del usuario
      take: limit,
      skip: offset,
      relations: ['user'] // Opcional: incluir datos del usuario
    });
  }

  async findOne(term: string, user: User): Promise<Product | Product[]> {
    if (isUUID(term)) {
      // Buscar por UUID pero verificando que sea del usuario
      const product = await this.productRepository.findOne({
        where: { 
          id: term,
          userId: user.id 
        }
      });
      if (!product) throw new NotFoundException(`Product with id "${term}" not found`);
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
        userId: user.id 
      }
    });
    
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found or you don't have permission to access it`);
    }
    return product;
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException('Error - check logs');
  }
}