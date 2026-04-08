import { ListProjectResponseDto } from './list-project-response.dto';

export class ListProjectsResponseDto {
  items!: ListProjectResponseDto[];
  totalItems!: number;
  totalPages!: number;
  currentPage!: number;
  itemsPerPage!: number;
}
