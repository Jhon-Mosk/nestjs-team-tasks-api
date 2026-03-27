import { UserRole } from 'src/modules/users/users.entity';

export class MeResponseDto {
  id!: string;
  email!: string;
  role!: UserRole;
  organizationId!: string;
}
