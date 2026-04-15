import { UserResponseDto } from './user-response.dto';

export class ListUsersResponseDto {
  items!: UserResponseDto[];
  totalItems!: number;
  totalPages!: number;
  currentPage!: number;
  itemsPerPage!: number;
}
