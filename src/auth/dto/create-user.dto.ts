import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {

    @IsEmail({}, { message: 'Debes ingresar un email válido' })
    @MaxLength(100, { message: 'El email no puede tener más de 100 caracteres' })
    email: string;

    @IsString({ message: 'La contraseña debe ser un texto válido' })
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @MaxLength(50, { message: 'La contraseña no puede tener más de 50 caracteres' })
    @Matches(
        /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
    {message:'La contraseña debe incluir al menos una letra mayúscula, una minúscula y un número o símbolo',},)
    password: string;

    @IsString()
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(20, { message: 'El nombre no puede tener más de 20 caracteres' })
    fullName: string;
}