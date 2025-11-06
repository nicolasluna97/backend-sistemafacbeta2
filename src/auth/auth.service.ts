import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginUserDto, CreateUserDto } from './dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ){}

  async create(createUserDto: CreateUserDto) {
    try {
      const { password, ...userData } = createUserDto;

      const user = this.userRepository.create({
        ...userData,
        password: bcrypt.hashSync(password, 10)
      });

      await this.userRepository.save(user);
      delete user.password;

      return {
        ...user,
        token: this.getJwtToken({ id: user.id }),
        refreshToken: await this.getRefreshToken({ id: user.id }) // Nuevo
      };
    } catch (error) {
      this.handleDBErrors(error);
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: { email: true, password: true, id: true, isActive: true }
    });

    if (!user)
      throw new UnauthorizedException('Credentials are not valid (email)');

    if (!bcrypt.compareSync(password, user.password))
      throw new UnauthorizedException('Credentials are not valid (password)');

    return {
      ...user,
      token: this.getJwtToken({ id: user.id }),
      refreshToken: await this.getRefreshToken({ id: user.id }) // Nuevo
    };
  }

  // NUEVO MÉTODO: Refresh Token
  async refreshToken(oldRefreshToken: string) {
    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify(oldRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key'
      });

      // Buscar usuario
      const user = await this.userRepository.findOneBy({ id: payload.id });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generar nuevos tokens
      return {
        token: this.getJwtToken({ id: user.id }),
        refreshToken: await this.getRefreshToken({ id: user.id })
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getJwtToken(payload: JwtPayload) {
    // Token de acceso (2 horas)
    return this.jwtService.sign(payload, {
      expiresIn: '2h',
      secret: process.env.JWT_SECRET
    });
  }

  // NUEVO: Generar Refresh Token
  private async getRefreshToken(payload: JwtPayload) {
    // Refresh token (7 días)
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key'
    });

    return refreshToken;
  }

  private handleDBErrors(error: any): never {
    if (error.code === '23505')
      throw new BadRequestException(error.detail);

    console.log(error);
    throw new InternalServerErrorException('Please check server logs');
  }
}