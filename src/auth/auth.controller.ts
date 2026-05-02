import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginUserDto,
  VerifyEmailDto,
  ResendVerificationCodeDto,
} from './dto';

import { Auth, GetUser, RawHeaders, RoleProtected } from './decorators';
import { User } from './entities/user.entity';
import { UserRoleGuard } from './guards/user-role.guard';
import { ValidRoles } from './interfaces';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 dias
      path: '/api/auth',
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/api/auth' });
  }

  private extractCookieToken(req: Request): string | null {
    const raw = req.headers.cookie;
    if (!raw) return null;

    const pieces = raw.split(';').map((p) => p.trim());
    for (const piece of pieces) {
      if (piece.startsWith('refresh_token=')) {
        return decodeURIComponent(piece.substring('refresh_token='.length));
      }
    }
    return null;
  }

  @Post('register')
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async loginUser(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(loginUserDto);
    this.setRefreshCookie(res, data.refreshToken);

    const { refreshToken, ...safePayload } = data;
    return safePayload;
  }

  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.verifyEmail(dto);
    this.setRefreshCookie(res, data.refreshToken);

    const { refreshToken, ...safePayload } = data;
    return safePayload;
  }

  @Post('resend-code')
  resendCode(@Body() dto: ResendVerificationCodeDto) {
    return this.authService.resendVerificationCode(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refreshToken(
    @Req() req: Request,
    @Body('refreshToken') refreshTokenFromBody?: string, // compatibilidad temporal
    @Res({ passthrough: true }) res?: Response,
  ) {
    const cookieToken = this.extractCookieToken(req);
    const oldRefreshToken = cookieToken ?? refreshTokenFromBody;

    if (!oldRefreshToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const data = await this.authService.refreshToken(oldRefreshToken);

    if (res) this.setRefreshCookie(res, data.refreshToken);
    const { refreshToken, ...safePayload } = data;
    return safePayload;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return { ok: true };
  }

  @Get('private')
  @UseGuards(AuthGuard())
  testingPrivateRoute(
    @Req() request: Express.Request,
    @GetUser() user: User,
    @GetUser('email') userEmail: string,
    @RawHeaders() rawHeaders: string[],
  ) {
    return {
      ok: true,
      message: 'Bienvenido',
      user,
      userEmail,
      rawHeaders: rawHeaders.slice(0, 3),
    };
  }

  @Get('private2')
  @RoleProtected(ValidRoles.superUser, ValidRoles.admin)
  @UseGuards(AuthGuard(), UserRoleGuard)
  privateRoute2(@GetUser() user: User) {
    return { ok: true, user };
  }

  @Get('private3')
  @Auth(ValidRoles.userNoValid)
  privateRoute3(@GetUser() user: User) {
    return { ok: true, user };
  }
}