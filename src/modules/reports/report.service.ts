import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_JOBS, QUEUE_NAMES } from 'src/queue/queue.constants';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { UserService } from '../users/user.service';
import { CreateTaskReportDto } from './dto/create-task-report.dto';
import { TaskReportResponseDto } from './dto/task-report-response.dto';
import { canRequestTaskReportForTarget } from './reports.policy';
import { ReportJobStatus } from './types/report-job-status';
import { TasksReportJobPayload } from './types/task-report-job-payload';

@Injectable()
export class ReportsService {
  constructor(
    private readonly userService: UserService,
    @InjectQueue(QUEUE_NAMES.REPORTS_TASKS)
    private readonly reportsTasksQueue: Queue,
  ) {}

  async createTaskReport(
    dto: CreateTaskReportDto,
    actor: AccessTokenPayload,
  ): Promise<TaskReportResponseDto> {
    const { organizationId, role, sub } = actor;
    const targetUserId = dto.userId;

    if (targetUserId) {
      const targetUser = await this.userService.getById(
        { id: targetUserId },
        actor,
      );
      if (
        !canRequestTaskReportForTarget(role, sub, targetUserId, targetUser.role)
      ) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    const payload = {
      requestedByUserId: sub,
      requestedByRole: role,
      organizationId,
      ...(targetUserId && { targetUserId }),
    } satisfies TasksReportJobPayload;

    const job = await this.reportsTasksQueue.add(
      QUEUE_JOBS.TASKS_REPORT,
      payload,
    );

    return {
      jobId: String(job.id),
      status: ReportJobStatus.PROCESSING,
    };
  }
}
