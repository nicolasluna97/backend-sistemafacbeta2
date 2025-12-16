import { IsInt, IsUUID, IsString, Min, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DecreaseStockMovementDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @IsUUID()
  customerId: string;

  @IsString()
  customerName: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2, 3, 4])
  priceKey: 1 | 2 | 3 | 4;
}

