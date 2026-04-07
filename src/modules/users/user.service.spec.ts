jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UserService } from './user.service';
import { User, UserRole } from './users.entity';

describe('UserService', () => {
  let userService: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
      ],
    }).compile();

    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const getActorMock = (role: UserRole) => {
      return {
        sub: '123',
        organizationId: '123',
        role,
      } as AccessTokenPayload;
    };

    const getDtoMock = (role: UserRole) => {
      return {
        email: 'test@test.com',
        password: 'password123',
        role,
      } as CreateUserDto;
    };

    const createUserSuccess = async (
      dto: CreateUserDto,
      actor: AccessTokenPayload,
    ) => {
      userRepository.exists.mockResolvedValue(false);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const user = {
        id: '123',
        email: dto.email,
        role: dto.role,
        password: 'hashed-password',
        organizationId: actor.organizationId,
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
      } as User;

      userRepository.create.mockReturnValue(user);

      userRepository.save.mockResolvedValue(user);

      const result = await userService.create(dto, actor);

      expect(result).toEqual({
        id: '123',
        email: dto.email,
        role: dto.role,
        organizationId: actor.organizationId,
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);
      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(userRepository.save).toHaveBeenCalledWith(user);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(userRepository.exists).toHaveBeenCalledWith({
        where: { email: dto.email, deletedAt: IsNull() },
      });
    };

    it('owner create manager', async () => {
      const actor = getActorMock(UserRole.OWNER);
      const dto = getDtoMock(UserRole.MANAGER);

      await createUserSuccess(dto, actor);
    });

    it('owner create employee', async () => {
      const actor = getActorMock(UserRole.OWNER);
      const dto = getDtoMock(UserRole.EMPLOYEE);

      await createUserSuccess(dto, actor);
    });

    it('manager create employee', async () => {
      const actor = getActorMock(UserRole.MANAGER);
      const dto = getDtoMock(UserRole.EMPLOYEE);

      await createUserSuccess(dto, actor);
    });

    it('manager create manager', async () => {
      const actor = getActorMock(UserRole.MANAGER);
      const dto = getDtoMock(UserRole.MANAGER);

      await expect(userService.create(dto, actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('owner create owner', async () => {
      const actor = getActorMock(UserRole.OWNER);
      const dto = getDtoMock(UserRole.OWNER);

      await expect(userService.create(dto, actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('user already exists', async () => {
      const actor = getActorMock(UserRole.OWNER);
      const dto = getDtoMock(UserRole.MANAGER);

      userRepository.exists.mockResolvedValue(true);

      await expect(userService.create(dto, actor)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('list', () => {
    const actor = {
      sub: '123',
      organizationId: '123',
      role: UserRole.OWNER,
    } as AccessTokenPayload;

    const query = {
      currentPage: 1,
      itemsPerPage: 10,
    } as ListUsersQueryDto;

    it('owner list users', async () => {
      userRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await userService.list(query, actor);

      expect(result).toEqual({
        items: [],
        totalItems: 0,
        totalPages: 0,
        currentPage: 1,
        itemsPerPage: 10,
      });

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(userRepository.findAndCount).toHaveBeenCalledWith({
        where: { organizationId: '123', deletedAt: IsNull() },
        skip: 0,
        take: 10,
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('softDelete', () => {
    /** JWT `sub` — текущий пользователь; не должен совпадать с id цели, если удаляем «другого». */
    const actorSub = 'actor-user-id';
    /** Пользователь, которого удаляем (другой id). */
    const targetUserId = 'target-user-id';

    const getActorMock = (role: UserRole) => {
      return {
        sub: actorSub,
        organizationId: 'org-1',
        role,
      } as AccessTokenPayload;
    };

    const getUserMock = (
      id: string,
      role: UserRole,
      organizationId: string,
    ) => {
      return {
        id,
        email: 'test@test.com',
        role,
        organizationId,
        createdAt: expect.any(Date) as Date,
        updatedAt: expect.any(Date) as Date,
      } as User;
    };

    it('user not found', async () => {
      const actor = getActorMock(UserRole.OWNER);

      userRepository.findOne.mockResolvedValue(null);

      await expect(
        userService.softDelete(targetUserId, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('manager delete employee', async () => {
      const actor = getActorMock(UserRole.MANAGER);

      userRepository.findOne.mockResolvedValue(
        getUserMock(targetUserId, UserRole.EMPLOYEE, actor.organizationId),
      );

      await userService.softDelete(targetUserId, actor);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(userRepository.softDelete).toHaveBeenCalledWith({
        id: targetUserId,
        organizationId: actor.organizationId,
      });
    });

    it('manager delete manager', async () => {
      const actor = getActorMock(UserRole.MANAGER);

      userRepository.findOne.mockResolvedValue(
        getUserMock(targetUserId, UserRole.MANAGER, actor.organizationId),
      );

      await expect(
        userService.softDelete(targetUserId, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('owner delete manager', async () => {
      const actor = getActorMock(UserRole.OWNER);

      userRepository.findOne.mockResolvedValue(
        getUserMock(targetUserId, UserRole.MANAGER, actor.organizationId),
      );

      await userService.softDelete(targetUserId, actor);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- repository mock
      expect(userRepository.softDelete).toHaveBeenCalledWith({
        id: targetUserId,
        organizationId: actor.organizationId,
      });
    });

    it('manager delete himself', async () => {
      const actor = getActorMock(UserRole.MANAGER);

      userRepository.findOne.mockResolvedValue(
        getUserMock(actorSub, UserRole.MANAGER, actor.organizationId),
      );

      await expect(
        userService.softDelete(actorSub, actor),
      ).rejects.toMatchObject({
        message: 'You are not allowed to delete yourself',
      });
    });
  });
});
