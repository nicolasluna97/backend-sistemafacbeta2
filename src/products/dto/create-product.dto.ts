import {
  IsInt,
  IsNumber,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price2: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price3: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price4: number;

  @IsUUID()
  categoryId: string;
}
