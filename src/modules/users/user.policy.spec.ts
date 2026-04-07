import { isAllowedToCreateUser, isAllowedToDeleteUser } from './user.policy';
import { UserRole } from './users.entity';

describe('UserPolicy', () => {
  describe('isAllowedToCreateUser', () => {
    it.each<
      [label: string, actor: UserRole, target: UserRole, expected: boolean]
    >([
      ['OWNER may create MANAGER', UserRole.OWNER, UserRole.MANAGER, true],
      ['OWNER may create EMPLOYEE', UserRole.OWNER, UserRole.EMPLOYEE, true],
      ['OWNER may not create OWNER', UserRole.OWNER, UserRole.OWNER, false],
      [
        'MANAGER may create EMPLOYEE',
        UserRole.MANAGER,
        UserRole.EMPLOYEE,
        true,
      ],
      [
        'MANAGER may not create MANAGER',
        UserRole.MANAGER,
        UserRole.MANAGER,
        false,
      ],
      ['MANAGER may not create OWNER', UserRole.MANAGER, UserRole.OWNER, false],
      [
        'EMPLOYEE may not create EMPLOYEE',
        UserRole.EMPLOYEE,
        UserRole.EMPLOYEE,
        false,
      ],
      [
        'EMPLOYEE may not create MANAGER',
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        false,
      ],
      [
        'EMPLOYEE may not create OWNER',
        UserRole.EMPLOYEE,
        UserRole.OWNER,
        false,
      ],
    ])('%s', (_label, actor, target, expected) => {
      expect(isAllowedToCreateUser(actor, target)).toBe(expected);
    });
  });

  describe('isAllowedToDeleteUser', () => {
    it.each<
      [label: string, actor: UserRole, target: UserRole, expected: boolean]
    >([
      ['OWNER may delete MANAGER', UserRole.OWNER, UserRole.MANAGER, true],
      ['OWNER may delete EMPLOYEE', UserRole.OWNER, UserRole.EMPLOYEE, true],
      ['OWNER may not delete OWNER', UserRole.OWNER, UserRole.OWNER, false],
      [
        'MANAGER may delete EMPLOYEE',
        UserRole.MANAGER,
        UserRole.EMPLOYEE,
        true,
      ],
      [
        'MANAGER may not delete MANAGER',
        UserRole.MANAGER,
        UserRole.MANAGER,
        false,
      ],
      ['MANAGER may not delete OWNER', UserRole.MANAGER, UserRole.OWNER, false],
      [
        'EMPLOYEE may not delete EMPLOYEE',
        UserRole.EMPLOYEE,
        UserRole.EMPLOYEE,
        false,
      ],
      [
        'EMPLOYEE may not delete MANAGER',
        UserRole.EMPLOYEE,
        UserRole.MANAGER,
        false,
      ],
      [
        'EMPLOYEE may not delete OWNER',
        UserRole.EMPLOYEE,
        UserRole.OWNER,
        false,
      ],
    ])('%s', (_label, actor, target, expected) => {
      expect(isAllowedToDeleteUser(actor, target)).toBe(expected);
    });
  });
});
