import { IsInt, IsNumber, IsOptional, IsPositive, IsString, MinLength } from "class-validator";

export class CreateProductDto {

    @IsString()
    @MinLength(1)
    title: string;

    @IsInt()
    @IsPositive()
    @IsOptional()
    stock: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price2: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price3: number;

    @IsNumber()
    @IsPositive()
    @IsOptional()
    price4: number;


}
