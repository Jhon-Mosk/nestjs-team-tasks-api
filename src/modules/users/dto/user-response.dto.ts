import { UserRole } from '../users.entity';

export class UserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
