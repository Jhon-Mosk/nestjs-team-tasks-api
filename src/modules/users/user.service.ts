import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';
import { IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListUsersResponseDto } from './dto/list-users-response.dto';
import { isAllowedToCreateUser, isAllowedToDeleteUser } from './user.policy';
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

  async list(
    query: ListUsersQueryDto,
    actor: AccessTokenPayload,
  ): Promise<ListUsersResponseDto> {
    const { currentPage, itemsPerPage } = query;
    const { organizationId } = actor;

    const [users, total] = await this.userRepository.findAndCount({
      where: { organizationId, deletedAt: IsNull() },
      skip: (currentPage - 1) * itemsPerPage,
      take: itemsPerPage,
      order: { createdAt: 'DESC' },
    });

    return {
      items: users.map((user) => ({
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      totalItems: total,
      totalPages: Math.ceil(total / itemsPerPage),
      currentPage,
      itemsPerPage,
    };
  }

  async softDelete(id: string, actor: AccessTokenPayload): Promise<void> {
    const { organizationId, role } = actor;

    const user = await this.userRepository.findOne({
      where: { id, organizationId, deletedAt: IsNull() },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === actor.sub) {
      throw new ForbiddenException('You are not allowed to delete yourself');
    }

    if (!isAllowedToDeleteUser(role, user.role)) {
      throw new ForbiddenException('You are not allowed to delete a user');
    }

    await this.userRepository.softDelete({ id, organizationId });
  }
}
