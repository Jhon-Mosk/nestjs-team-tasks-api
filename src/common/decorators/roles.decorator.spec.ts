import { UserRole } from 'src/modules/users/users.entity';
import { ROLES_KEY, Roles } from './roles.decorator';

describe('Roles decorator', () => {
  it('sets roles metadata', () => {
    class TestController {
      handler() {}
    }

    const descriptor = Object.getOwnPropertyDescriptor(
      TestController.prototype,
      'handler',
    ) as TypedPropertyDescriptor<() => void>;

    Roles(UserRole.OWNER, UserRole.MANAGER)(
      TestController.prototype,
      'handler',
      descriptor,
    );

    const roles = Reflect.getMetadata(ROLES_KEY, descriptor.value as object) as
      | UserRole[]
      | undefined;
    expect(roles).toEqual([UserRole.OWNER, UserRole.MANAGER]);
  });
});
