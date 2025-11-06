import { PartialType } from '@nestjs/mapped-types';
import { CreateProductDto } from './create-product.dto';
import { IsInt, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  stock?: number;
}
