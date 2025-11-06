import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from '../auth/decorators';
import { User } from '../auth/entities/user.entity';

@Controller('products')
@UseGuards(AuthGuard()) // Proteger todas las rutas de productos
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @GetUser() user: User
  ) {
    return this.productsService.create(createProductDto, user);
  }

  @Get()
  findAll( 
    @Query() paginationDto: PaginationDto,
    @GetUser() user: User
  ) {
    return this.productsService.findAll(paginationDto, user);
  }

  @Get(':term')
  findOne(
    @Param('term') term: string,
    @GetUser() user: User
  ) {
    return this.productsService.findOne(term, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateProductDto: UpdateProductDto,
    @GetUser() user: User
  ) {
    return this.productsService.update(id, updateProductDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe ) id: string,
    @GetUser() user: User
  ) {
    return this.productsService.remove(id, user);
  }
}
