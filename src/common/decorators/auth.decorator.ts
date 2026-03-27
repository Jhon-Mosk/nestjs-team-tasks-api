import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from 'src/modules/users/users.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export const Auth = (...roles: UserRole[]) => {
  if (roles.length === 0) return applyDecorators(UseGuards(JwtAuthGuard));

  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
};
