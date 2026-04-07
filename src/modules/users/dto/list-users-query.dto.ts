import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';

export class ListUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  currentPage: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  itemsPerPage: number = 20;
}
