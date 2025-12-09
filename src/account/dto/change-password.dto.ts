import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto válido' })
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  @MaxLength(50, {
    message: 'La nueva contraseña no puede tener más de 50 caracteres',
  })
  @Matches(
    /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
    {
      message:
        'La nueva contraseña debe incluir al menos una letra mayúscula, una minúscula y un número o símbolo',
    },
  )
  newPassword: string;
}
