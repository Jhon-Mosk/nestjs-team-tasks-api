import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiPropertyOptional({ example: 'Mobile App' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
