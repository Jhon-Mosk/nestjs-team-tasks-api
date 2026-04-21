import { GUARDS_METADATA } from '@nestjs/common/constants';
import { UserRole } from 'src/modules/users/users.entity';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Auth } from './auth.decorator';
import { ROLES_KEY } from './roles.decorator';

describe('Auth decorator', () => {
  it('applies JwtAuthGuard only when no roles passed', () => {
    class TestController {
      handler(this: void) {}
    }

    Auth()(
      TestController.prototype.handler,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler'),
    );

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      TestController.prototype.handler,
    ) as Array<unknown> | undefined;

    expect(guards).toBeDefined();
    expect(guards).toEqual([JwtAuthGuard]);
  });

  it('applies JwtAuthGuard + RolesGuard and sets roles metadata when roles passed', () => {
    class TestController {
      handler(this: void) {}
    }

    Auth(UserRole.OWNER, UserRole.MANAGER)(
      TestController.prototype.handler,
      'handler',
      Object.getOwnPropertyDescriptor(TestController.prototype, 'handler'),
    );

    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      TestController.prototype.handler,
    ) as Array<unknown> | undefined;

    expect(guards).toBeDefined();
    expect(guards).toEqual([JwtAuthGuard, RolesGuard]);

    const roles = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.handler,
    ) as unknown;

    expect(roles).toEqual([UserRole.OWNER, UserRole.MANAGER]);
  });
});
