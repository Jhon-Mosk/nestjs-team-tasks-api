import { TaskResponseDto } from './task-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ListTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  items!: TaskResponseDto[];

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  totalPages!: number;

  @ApiProperty()
  currentPage!: number;

  @ApiProperty()
  itemsPerPage!: number;
}
