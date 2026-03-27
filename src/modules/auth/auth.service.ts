import {
  ConflictException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import Redis from 'ioredis';
import crypto from 'node:crypto';
import { Configuration } from 'src/config/confuguration';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
import { REDIS_CLIENT } from '../redis/redis.provider';
import { User, UserRole } from '../users/users.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AccessTokenPayload, RefreshTokenPayload } from './types/jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redisClient: Redis,
  ) {}

  private refreshSessionKey(userId: string, tokenId: string) {
    return `refresh:${userId}:${tokenId}`;
  }

  private verifyRefreshOrNull(
    token: string,
    options?: JwtVerifyOptions,
  ): RefreshTokenPayload | null {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, options);
    } catch {
      return null;
    }
  }

  async register(dto: RegisterDto) {
    const dbUser = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (dbUser) {
      throw new ConflictException('Email already exists');
    }

    const dbOrganization = await this.organizationRepository.findOne({
      where: { name: dto.organizationName, deletedAt: IsNull() },
    });
    if (dbOrganization) {
      throw new ConflictException('Organization already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const { user } = await this.dataSource.transaction(
      async (transactionEntityManager) => {
        const organization = await transactionEntityManager.save(
          Organization,
          transactionEntityManager.create(Organization, {
            name: dto.organizationName,
          }),
        );

        const user = await transactionEntityManager.save(
          User,
          transactionEntityManager.create(User, {
            email: dto.email,
            password: hashedPassword,
            role: UserRole.OWNER,
            organizationId: organization.id,
          }),
        );

        await transactionEntityManager.update(Organization, organization.id, {
          ownerId: user.id,
        });

        return { user, organization };
      },
    );

    const jwtConfig =
      this.configService.getOrThrow<Configuration['jwt']>('jwt');

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const tokenId = crypto.randomUUID();

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tid: tokenId,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessTtlSec,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshTtlSec,
    });

    const refreshTtlSec = jwtConfig.refreshTtlSec;
    const refreshSessionKey = this.refreshSessionKey(user.id, tokenId);

    await this.redisClient
      .set(refreshSessionKey, '1', 'EX', refreshTtlSec)
      .catch(() => {
        throw new ServiceUnavailableException('Redis unavailable');
      });

    return { accessToken, refreshToken, refreshTtlSec };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, deletedAt: IsNull() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const jwtConfig =
      this.configService.getOrThrow<Configuration['jwt']>('jwt');

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const tokenId = crypto.randomUUID();

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tid: tokenId,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessTtlSec,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshTtlSec,
    });

    const refreshTtlSec = jwtConfig.refreshTtlSec;
    const refreshSessionKey = this.refreshSessionKey(user.id, tokenId);

    await this.redisClient
      .set(refreshSessionKey, '1', 'EX', refreshTtlSec)
      .catch(() => {
        throw new ServiceUnavailableException('Redis unavailable');
      });

    return { accessToken, refreshToken, refreshTtlSec };
  }

  async refresh(refreshToken: string) {
    const jwtConfig =
      this.configService.getOrThrow<Configuration['jwt']>('jwt');

    const payload = this.verifyRefreshOrNull(refreshToken, {
      secret: jwtConfig.refreshSecret,
    });
    if (!payload) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.userRepository.findOne({
      where: { id: payload.sub, deletedAt: IsNull() },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshSessionKey = this.refreshSessionKey(payload.sub, payload.tid);

    const refreshSessionKeysNumber = await this.redisClient
      .exists(refreshSessionKey)
      .catch(() => {
        throw new ServiceUnavailableException('Redis unavailable');
      });

    if (refreshSessionKeysNumber === 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: jwtConfig.accessSecret,
      expiresIn: jwtConfig.accessTtlSec,
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<{ shouldClearCookie: boolean }> {
    const jwtConfig =
      this.configService.getOrThrow<Configuration['jwt']>('jwt');

    const payload = this.verifyRefreshOrNull(refreshToken, {
      secret: jwtConfig.refreshSecret,
    });
    if (!payload) return { shouldClearCookie: true };

    const refreshSessionKey = this.refreshSessionKey(payload.sub, payload.tid);

    await this.redisClient.del(refreshSessionKey).catch(() => {
      throw new ServiceUnavailableException('Redis unavailable');
    });

    return { shouldClearCookie: true };
  }
}
