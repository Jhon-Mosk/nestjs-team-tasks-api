import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Auth } from 'src/common/decorators/auth.decorator';
import { ApiErrorResponses } from 'src/common/swagger/api-error-responses';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListUsersResponseDto } from './dto/list-users-response.dto';
import { UserService } from './user.service';
import { UserRole } from './users.entity';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create user (OWNER/MANAGER)' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    forbidden: true,
    conflict: true,
    unprocessable: true,
  })
  @Post()
  createUser(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<UserResponseDto> {
    const actor = req.user;
    return this.userService.create(dto, actor);
  }

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'List users (pagination)' })
  @ApiOkResponse({ type: ListUsersResponseDto })
  @ApiErrorResponses({
    unauthorized: true,
    forbidden: true,
    unprocessable: true,
  })
  @Get()
  getUsers(
    @Query() query: ListUsersQueryDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<ListUsersResponseDto> {
    const actor = req.user;
    return this.userService.list(query, actor);
  }

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft-delete user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(
    @Param('id') id: string,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<void> {
    const actor = req.user;
    return this.userService.softDelete(id, actor);
  }
}
