import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@acme.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecretpassword' })
  @IsString()
  @MinLength(8)
  password!: string;
}
