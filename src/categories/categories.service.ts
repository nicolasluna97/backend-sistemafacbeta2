// categories.service.ts
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

  // Nombre default (único por usuario)
  private readonly DEFAULT_CATEGORY_NAME = 'Varios';

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  /**
   * Crea la categoría default "Varios" para el usuario si no existe.
   * Devuelve la categoría existente o la creada.
   */
  async ensureDefaultCategory(userId: string): Promise<Category> {
    const name = this.DEFAULT_CATEGORY_NAME;

    const existing = await this.categoryRepo.findOne({
      where: { userId, name },
    });

    if (existing) return existing;

    try {
      const created = this.categoryRepo.create({ userId, name });
      return await this.categoryRepo.save(created);
    } catch (error: any) {
      // Si dos requests al mismo tiempo intentan crearla, puede saltar unique_violation.
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

    // Si querés evitar que creen otra "Varios" con espacios raros:
    // if (name.toLowerCase() === this.DEFAULT_CATEGORY_NAME.toLowerCase()) ...

    try {
      const category = this.categoryRepo.create({
        name,
        userId: user.id,
      });
      await this.categoryRepo.save(category);
      return category;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async findAll(user: User) {
    // IMPORTANTE: garantizamos que exista "Varios"
    await this.ensureDefaultCategory(user.id);

    return this.categoryRepo.find({
      where: { userId: user.id },
      order: { name: 'ASC' },
    });
  }

  async update(id: string, dto: UpdateCategoryDto, user: User) {
    const category = await this.findByIdAndUser(id, user);

    const name = (dto.name ?? '').trim();
    if (dto.name !== undefined) {
      if (!name) throw new BadRequestException('El nombre no puede estar vacío.');
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

    // Recomendación: bloquear borrar "Varios"
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

  private handleDBExceptions(error: any) {
    if (error?.code === '23505') {
      throw new BadRequestException('Ya existe una categoría con ese nombre.');
    }

    this.logger.error(error);
    throw new InternalServerErrorException('Error - check logs');
  }
}
