import { UserRole } from '../users.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'employee@acme.test' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  role!: UserRole;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
