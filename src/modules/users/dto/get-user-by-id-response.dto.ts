import { UserRole } from '../users.entity';

export class GetUserByIdResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  createdAt!: Date;
  updatedAt!: Date;
}
