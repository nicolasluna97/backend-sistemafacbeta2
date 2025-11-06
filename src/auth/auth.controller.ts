import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginUserDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { Auth, GetUser, RawHeaders, RoleProtected } from './decorators';
import { User } from './entities/user.entity';
import { UserRoleGuard } from './guards/user-role.guard';
import { ValidRoles } from './interfaces';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 intentos por 60 segundos
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  // NUEVO ENDPOINT para refresh token
  @Post('refresh')
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  // SOLO UN testingPrivateRoute - Eliminé el duplicado
  @Get('private')
  @UseGuards(AuthGuard())
  testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUser() user: User,
    @GetUser('email') userEmail: string,
    @RawHeaders() rawHeaders: string[],
  ){
    return {
      ok: true,
      message: 'Bienvenido: ', 
      user,
      userEmail,
      rawHeaders: rawHeaders.slice(0, 3) // Solo mostrar primeros 3 headers
    }  
  }

  @Get('private2')
  @RoleProtected(ValidRoles.superUser, ValidRoles.admin)
  @UseGuards(AuthGuard(), UserRoleGuard)
  privateRoute2(
    @GetUser() user: User
  ) {
    return {
      ok: true,
      user
    }
  }

  @Get('private3')
  @Auth(ValidRoles.userNoValid)
  privateRoute3(
    @GetUser() user: User
  ) {
    return {
      ok: true,
      user
    }
  }
}