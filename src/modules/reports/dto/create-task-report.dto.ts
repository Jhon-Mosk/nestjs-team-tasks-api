import { IsOptional, IsUUID } from 'class-validator';

export class CreateTaskReportDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
