import { Body, Controller, Post, Req } from '@nestjs/common';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateUserResponseDto } from './dto/create-user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';
import { UserRole } from './users.entity';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Auth(UserRole.OWNER, UserRole.MANAGER)
  @Post()
  createUser(
    @Body() dto: CreateUserDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<CreateUserResponseDto> {
    const actor = req.user;
    return this.userService.create(dto, actor);
  }

  // @Auth(UserRole.OWNER, UserRole.MANAGER)
  // @Get()
  // async getUsers(
  //   @Query() query: ListUsersQueryDto,
  // ): Promise<ListUsersResponseDto> {}

  // @Auth(UserRole.OWNER, UserRole.MANAGER)
  // @Delete(':id')
  // async deleteUser(@Param('id') id: string) {}
}
