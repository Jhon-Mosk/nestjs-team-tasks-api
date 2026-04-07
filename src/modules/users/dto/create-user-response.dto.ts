import { UserRole } from '../users.entity';

export class CreateUserResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  organizationId!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
