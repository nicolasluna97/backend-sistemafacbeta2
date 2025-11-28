import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { User } from './entities/user.entity';
import {
  LoginUserDto,
  CreateUserDto,
  VerifyEmailDto,
  ResendVerificationCodeDto,
} from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

 
  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10),
        isEmailVerified: false,
      });

      await this.userRepository.save(user);
      await this.generateAndSaveVerificationCode(user);

      // Por seguridad, no devolvemos password
      delete user.password;

      return {
        ok: true,
        message: 'Usuario creado. Se envió un código de verificación al email.',
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }


  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        isActive: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales no válidas (email)');
    }

    if (!bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException('Credenciales no válidas (password)');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Debes verificar tu email antes de ingresar');
    }

    const payload: JwtPayload = { id: user.id };

    // Por seguridad, no devolvemos password al front
    delete user.password;

    return {
      ...user,
      token: this.getJwtToken(payload),
      refreshToken: await this.getRefreshToken(payload),
    };
  }


  async verifyEmail(dto: VerifyEmailDto) {
    const { email, code } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    if (!user.emailVerificationCode || !user.emailVerificationExpiresAt) {
      throw new BadRequestException('No hay un código generado para este usuario');
    }

    if (user.emailVerificationExpiresAt < new Date()) {
      throw new BadRequestException('El código ha expirado');
    }

    const isValid = bcrypt.compareSync(code, user.emailVerificationCode);
    if (!isValid) {
      throw new BadRequestException('Código inválido');
    }

    user.isEmailVerified = true;
    user.emailVerificationCode = null;
    user.emailVerificationExpiresAt = null;

    await this.userRepository.save(user);

    const payload: JwtPayload = { id: user.id };

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      roles: user.roles,
      token: this.getJwtToken(payload),
      refreshToken: await this.getRefreshToken(payload),
    };
  }


  //  REENVIAR CÓDIGO de verificación
  
  async resendVerificationCode(dto: ResendVerificationCodeDto) {
    const { email } = dto;

    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('El email ya está verificado');
    }

    await this.generateAndSaveVerificationCode(user);

    return {
      ok: true,
      message: 'Se envió un nuevo código de verificación al email.',
    };
  }


  //  REFRESH TOKEN

  async refreshToken(oldRefreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.id },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      if (!user.isEmailVerified) {
        throw new UnauthorizedException('Debes verificar tu email antes de ingresar');
      }

      const newPayload: JwtPayload = { id: user.id };

      return {
        token: this.getJwtToken(newPayload),
        refreshToken: await this.getRefreshToken(newPayload),
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }


  //  HELPERS PRIVADOS


  // Generar y guardar código + enviar email
  private async generateAndSaveVerificationCode(user: User) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos

    const hashed = bcrypt.hashSync(code, 10);

    user.emailVerificationCode = hashed;

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 15); // 15 minutos
    user.emailVerificationExpiresAt = expires;

    await this.userRepository.save(user);

    await this.emailService.sendVerificationCode(user.email, code);
  }

  private getJwtToken(payload: JwtPayload) {
    // Token de acceso (2 horas)
    return this.jwtService.sign(payload, {
      expiresIn: '2h',
      secret: process.env.JWT_SECRET,
    });
  }

  // Refresh token (60 días ≈ 2 meses)
  private async getRefreshToken(payload: JwtPayload) {
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '60d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
    });

    return refreshToken;
  }

  private handleDBErrors(error: any): never {
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }

    console.error(error);
    throw new InternalServerErrorException('Please check server logs');
  }
}
