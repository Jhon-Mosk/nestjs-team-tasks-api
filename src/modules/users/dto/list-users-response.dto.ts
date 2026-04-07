import { ListUserResponseDto } from './list-user-response.dto';

export class ListUsersResponseDto {
  items!: ListUserResponseDto[];
  totalItems!: number;
  totalPages!: number;
  currentPage!: number;
  itemsPerPage!: number;
}
