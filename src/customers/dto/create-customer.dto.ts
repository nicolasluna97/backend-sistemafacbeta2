// src/customers/dto/create-customer.dto.ts
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(30, { message: 'El nombre no puede tener más de 30 caracteres' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80, {
    message: 'El nombre de empresa no puede tener más de 80 caracteres',
  })
  companyName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email no tiene un formato válido' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  address?: string;
}
