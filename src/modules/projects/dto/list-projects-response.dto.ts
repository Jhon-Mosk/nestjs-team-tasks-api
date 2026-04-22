import { ListProjectResponseDto } from './list-project-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class ListProjectsResponseDto {
  @ApiProperty({ type: [ListProjectResponseDto] })
  items!: ListProjectResponseDto[];

  @ApiProperty({ example: 42 })
  totalItems!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;

  @ApiProperty({ example: 1 })
  currentPage!: number;

  @ApiProperty({ example: 20 })
  itemsPerPage!: number;
}
