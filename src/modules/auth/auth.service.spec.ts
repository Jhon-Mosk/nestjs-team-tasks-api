jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    compare: jest.fn(),
    hash: jest.fn(),
  },
}));

import {
  ConflictException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { DataSource, Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { User, UserRole } from '../users/users.entity';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let organizationRepository: jest.Mocked<Repository<Organization>>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let dataSource: jest.Mocked<DataSource>;
  let redisClient: {
    set: jest.Mock;
    exists: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    organizationRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Organization>>;

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      getOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    dataSource = {
      transaction: jest.fn(),
    } as unknown as jest.Mocked<DataSource>;

    redisClient = {
      set: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(Organization),
          useValue: organizationRepository,
        },
        { provide: REDIS_CLIENT, useValue: redisClient },
      ],
    }).compile();

    authService = module.get(AuthService);

    (configService.getOrThrow as jest.Mock).mockImplementation(
      (key: string) => {
        if (key === 'jwt') {
          return {
            accessSecret: 'access_secret',
            refreshSecret: 'refresh_secret',
            accessTtlSec: 900,
            refreshTtlSec: 604800,
          };
        }
        throw new Error(`Unexpected config key: ${key}`);
      },
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const dto = {
      email: 'user@test.com',
      password: 'correct-password',
    } as LoginDto;

    const mockUser = {
      id: 'user-1',
      email: 'user@test.com',
      password: 'hashed-password',
      organizationId: 'org-1',
      role: UserRole.OWNER,
    } as User;

    it('returns tokens when credentials are valid', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      jwtService.sign
        .mockReturnValueOnce('access-jwt')
        .mockReturnValueOnce('refresh-jwt');

      redisClient.set.mockResolvedValue('OK');

      const result = await authService.login(dto);

      expect(result).toEqual({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        refreshTtlSec: 604800,
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        mockUser.password,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- test double from useValue mock
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:user-1:/),
        '1',
        'EX',
        604800,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      // eslint-disable-next-line @typescript-eslint/unbound-method -- test double from useValue mock
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisClient.set).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(authService.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );

      expect(bcrypt.compare).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.sign).not.toHaveBeenCalled();
      expect(redisClient.set).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const dto = {
      email: 'test@test.com',
      password: 'password123',
      organizationName: 'Acme',
    } as RegisterDto;

    it('returns tokens when registration succeeds', async () => {
      userRepository.findOne.mockResolvedValue(null);
      organizationRepository.findOne.mockResolvedValue(null);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const mockUser = {
        id: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as User;

      dataSource.transaction.mockResolvedValue({ user: mockUser });

      jwtService.sign
        .mockReturnValueOnce('access-jwt')
        .mockReturnValueOnce('refresh-jwt');

      redisClient.set.mockResolvedValue('OK');

      const result = await authService.register(dto);

      expect(result).toEqual({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
        refreshTtlSec: 604800,
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);

      // eslint-disable-next-line @typescript-eslint/unbound-method -- test double from useValue mock
      expect(jwtService.sign).toHaveBeenCalledTimes(2);

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringMatching(/^refresh:user-1:/),
        '1',
        'EX',
        604800,
      );
    });

    it('throws ConflictException when email already exists', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'u1' } as User);

      await expect(authService.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ConflictException when organization name already exists', async () => {
      userRepository.findOne.mockResolvedValue(null);
      organizationRepository.findOne.mockResolvedValue({
        id: 'o1',
      } as Organization);

      await expect(authService.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ServiceUnavailableException when redis set fails', async () => {
      userRepository.findOne.mockResolvedValue(null);
      organizationRepository.findOne.mockResolvedValue(null);

      const mockUser = {
        id: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as User;

      dataSource.transaction.mockResolvedValue({ user: mockUser });

      jwtService.sign.mockReturnValue('token');
      redisClient.set.mockRejectedValue(new Error('redis down'));

      await expect(authService.register(dto)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refresh('bad-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when redis key does not exist', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        tid: 'tid-1',
      } as never);

      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as User);

      redisClient.exists.mockResolvedValue(0);

      await expect(authService.refresh('refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws ServiceUnavailableException when redis exists fails', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        tid: 'tid-1',
      } as never);

      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as User);

      redisClient.exists.mockRejectedValue(new Error('redis down'));

      await expect(authService.refresh('any-token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('logout', () => {
    it('returns { shouldClearCookie: true } when token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.logout('bad-token')).resolves.toEqual({
        shouldClearCookie: true,
      });
    });

    it('throws ServiceUnavailableException when redis del fails', async () => {
      jwtService.verify.mockReturnValue({
        sub: 'user-1',
        tid: 'tid-1',
      } as never);

      redisClient.del.mockRejectedValue(new Error('redis down'));

      await expect(authService.logout('refresh-token')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('me', () => {
    it('returns user dto for existing user', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      } as User);

      await expect(authService.me('user-1')).resolves.toEqual({
        id: 'user-1',
        email: 'test@test.com',
        organizationId: 'org-1',
        role: UserRole.OWNER,
      });
    });

    it('throws UnauthorizedException when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(authService.me('missing-user')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
