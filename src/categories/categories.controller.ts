// categories.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
@UseGuards(AuthGuard())
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto, req.user);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.categoriesService.findAll(req.user);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto, req.user);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.categoriesService.remove(id, req.user);
  }
}
