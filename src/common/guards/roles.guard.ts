import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenPayload } from 'src/modules/auth/types/jwt-payload';
import { UserRole } from 'src/modules/users/users.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context
      .switchToHttp()
      .getRequest<{ user?: AccessTokenPayload }>();
    const user = req.user;

    if (!user) throw new UnauthorizedException('User not authenticated');

    if (!requiredRoles.includes(user.role))
      throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}
