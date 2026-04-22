import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../users.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'employee@acme.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecretpassword' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  @IsEnum(UserRole)
  role!: UserRole;
}
