import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { Configuration } from 'src/config/confuguration';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Organization } from '../organizations/organizations.entity';
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
  ) {}

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

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tid: crypto.randomUUID(),
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

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tid: crypto.randomUUID(),
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

    return { accessToken, refreshToken, refreshTtlSec };
  }
}
