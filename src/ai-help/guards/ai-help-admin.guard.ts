import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  
  @Injectable()
  export class AiHelpAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest();
      const user = req.user as { roles?: string[]; email?: string } | undefined;
  
      if (!user) {
        throw new UnauthorizedException('Usuario no autenticado');
      }
  
      const roles = user.roles ?? [];
      const isAllowed = roles.includes('admin') || roles.includes('super-user');
  
      if (!isAllowed) {
        throw new ForbiddenException(
          'No tienes permisos para ejecutar tareas administrativas de AI Help',
        );
      }
  
      return true;
    }
  }