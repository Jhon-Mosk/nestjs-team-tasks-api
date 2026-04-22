import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  @Length(2, 120)
  organizationName!: string;

  @ApiProperty({ example: 'owner@acme.test' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'supersecretpassword' })
  @IsString()
  @MinLength(8)
  password!: string;
}
