import {
  Controller,
  Get,
  Patch,
  Req,
  Body,
  Post,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../auth/auth.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Controller('account')
@UseGuards(AuthGuard())  // protege con tu jwt.strategy
export class AccountController {
  constructor(private readonly authService: AuthService) {}

  // GET /api/account/me
  @Get('me')
async getMe(@Req() req: any) {
  const user = await this.authService.findUserById(req.user.id);

  if (!user) {
    throw new BadRequestException('Usuario no encontrado');
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,          
    verified: user.isEmailVerified ?? false,
  };
  }

// PATCH /api/account/profile
@Patch('profile')
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    const updated = await this.authService.updateUser(req.user.id, {
      fullName: dto.username,            
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,        
      verified: updated.isEmailVerified ?? false,
    };
  }

  // POST /api/account/password/change
  @Post('password/change')
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    const user = await this.authService.findUserById(req.user.id);
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    const newHash = await bcrypt.hash(dto.newPassword, 10);

    await this.authService.updateUser(req.user.id, { password: newHash });

    return { success: true };
  }
}
