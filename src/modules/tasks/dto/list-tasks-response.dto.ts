import { TaskResponseDto } from './task-response.dto';

export class ListTasksResponseDto {
  items!: TaskResponseDto[];
  totalItems!: number;
  totalPages!: number;
  currentPage!: number;
  itemsPerPage!: number;
}
