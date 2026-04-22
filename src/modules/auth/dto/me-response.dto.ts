import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/modules/users/users.entity';

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'owner@acme.test' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OWNER })
  role!: UserRole;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;
}
