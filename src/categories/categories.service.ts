// src/categories/categories.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger('CategoriesService');

  // Categoría default (única por usuario)
  private readonly DEFAULT_CATEGORY_NAME = 'Varios';

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  /**
   * Garantiza que exista la categoría default "Varios" para el userId.
   * Devuelve la existente o la creada.
   */
  private async ensureDefaultCategory(userId: string): Promise<Category> {
    const name = this.DEFAULT_CATEGORY_NAME;

    const existing = await this.categoryRepo.findOne({ where: { userId, name } });
    if (existing) return existing;

    try {
      const created = this.categoryRepo.create({ userId, name });
      return await this.categoryRepo.save(created);
    } catch (error: any) {
      // condición de carrera: dos requests al mismo tiempo
      if (error?.code === '23505') {
        const after = await this.categoryRepo.findOne({ where: { userId, name } });
        if (after) return after;
      }
      this.handleDBExceptions(error);
    }
  }

  async create(dto: CreateCategoryDto, user: User) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('El nombre es obligatorio.');

    // opcional: bloquear que creen "Varios" manualmente
    if (name.toLowerCase() === this.DEFAULT_CATEGORY_NAME.toLowerCase()) {
      throw new BadRequestException('La categoría "Varios" ya existe por defecto.');
    }

    try {
      const category = this.categoryRepo.create({
        name,
        userId: user.id,
      });
      return await this.categoryRepo.save(category);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(user: User) {
    await this.ensureDefaultCategory(user.id);

    return this.categoryRepo.find({
      where: { userId: user.id },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, user: User) {
    const category = await this.findByIdAndUser(id, user);

    // No permitir renombrar "Varios" (opcional, recomendado)
    if ((category.name ?? '').trim() === this.DEFAULT_CATEGORY_NAME) {
      throw new BadRequestException('No se puede editar la categoría "Varios".');
    }

    if (dto.name !== undefined) {
      const name = (dto.name ?? '').trim();
      if (!name) throw new BadRequestException('El nombre no puede estar vacío.');

      if (name.toLowerCase() === this.DEFAULT_CATEGORY_NAME.toLowerCase()) {
        throw new BadRequestException('No se puede renombrar a "Varios".');
      }

      category.name = name;
    }

    try {
      return await this.categoryRepo.save(category);
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async remove(id: string, user: User) {
    const category = await this.findByIdAndUser(id, user);

    // Bloquear borrar "Varios"
    if ((category.name ?? '').trim() === this.DEFAULT_CATEGORY_NAME) {
      throw new BadRequestException('No se puede eliminar la categoría "Varios".');
    }

    await this.categoryRepo.remove(category);
    return { message: `Category with id ${id} deleted successfully` };
  }

  private async findByIdAndUser(id: string, user: User) {
    const category = await this.categoryRepo.findOne({
      where: { id, userId: user.id },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with id "${id}" not found or you don't have permission to access it`,
      );
    }

    return category;
  }

  private handleDBExceptions(error: any): never {
    // 23505 = unique_violation
    if (error?.code === '23505') {
      throw new BadRequestException('Ya existe una categoría con ese nombre.');
    }

    this.logger.error(error);
    throw new InternalServerErrorException('Error - check logs');
  }
}
