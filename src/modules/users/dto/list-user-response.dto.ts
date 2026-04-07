import { UserRole } from '../users.entity';

export class ListUserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
