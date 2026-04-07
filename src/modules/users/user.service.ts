import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { isAllowedToCreateUser } from './user.policy';
import { User } from './users.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: CreateUserDto,
    actor: AccessTokenPayload,
  ): Promise<CreateUserResponseDto> {
    const { organizationId, role } = actor;

    if (!isAllowedToCreateUser(role, dto.role)) {
      throw new ForbiddenException('You are not allowed to create a user');
    }

    const userExists = await this.userRepository.exists({
      where: { email: dto.email, deletedAt: IsNull() },
    });

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepository.save(
      this.userRepository.create({
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        organizationId,
      }),
    );
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
