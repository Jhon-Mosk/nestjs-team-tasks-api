import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskReportDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Target user id (optional, RBAC-limited)',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
