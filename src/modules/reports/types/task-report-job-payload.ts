import { UserRole } from 'src/modules/users/users.entity';

export type TasksReportJobPayload = {
  organizationId: string;
  requestedByUserId: string;
  requestedByRole: UserRole;
  targetUserId?: string;
};
