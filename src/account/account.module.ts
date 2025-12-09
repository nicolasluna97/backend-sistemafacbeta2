import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // Aquí está UsersService, hash, etc.
  controllers: [AccountController],
})
export class AccountModule {}
