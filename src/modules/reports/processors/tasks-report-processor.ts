import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TaskPriority, TaskStatus } from 'src/modules/tasks/tasks.entity';
import { TasksService } from 'src/modules/tasks/tasks.service';
import { UserService } from 'src/modules/users/user.service';
import { UserRole } from 'src/modules/users/users.entity';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { In } from 'typeorm';
import { TasksReportDto } from '../dto/tasks-report.dto';
import { TasksReportJobPayload } from '../types/task-report-job-payload';

@Processor(QUEUE_NAMES.REPORTS_TASKS)
export class TasksReportProcessor extends WorkerHost {
  constructor(
    private readonly userService: UserService,
    private readonly taskService: TasksService,
  ) {
    super();
  }

  private async getAssigneeIds(job: TasksReportJobPayload): Promise<string[]> {
    const { organizationId, requestedByUserId, requestedByRole, targetUserId } =
      job;

    const assigneeIds: string[] = [];

    if (targetUserId) {
      assigneeIds.push(targetUserId);
      return assigneeIds;
    }

    assigneeIds.push(requestedByUserId);

    if (requestedByRole === UserRole.EMPLOYEE) {
      return assigneeIds;
    }

    const actor = {
      sub: requestedByUserId,
      organizationId,
      role: requestedByRole,
    };
    const employees = await this.userService.findAll(
      { role: UserRole.EMPLOYEE },
      actor,
    );

    if (requestedByRole === UserRole.MANAGER) {
      assigneeIds.push(...employees.map((employee) => employee.id));
      return [...new Set(assigneeIds)];
    }

    if (requestedByRole === UserRole.OWNER) {
      const managers = await this.userService.findAll(
        { role: UserRole.MANAGER },
        actor,
      );
      assigneeIds.push(
        ...managers.map((manager) => manager.id),
        ...employees.map((employee) => employee.id),
      );
      return [...new Set(assigneeIds)];
    }

    return [...new Set(assigneeIds)];
  }

  private calculateMedian(times: number[]): number {
    const sorted = [...times].sort((a, b) => a - b);
    const n = sorted.length;

    if (n === 0) return 0;
    if (n % 2 === 1) return sorted[Math.floor(n / 2)]!;

    const left = sorted[n / 2 - 1]!;
    const right = sorted[n / 2]!;
    return (left + right) / 2;
  }

  override async process(
    job: Job<TasksReportJobPayload, TasksReportDto, 'tasks-report'>,
  ): Promise<TasksReportDto> {
    const { organizationId, requestedByUserId, requestedByRole } = job.data;

    const actor = {
      sub: requestedByUserId,
      organizationId,
      role: requestedByRole,
    };

    const assigneeIds = await this.getAssigneeIds(job.data);

    const tasks = await this.taskService.findAll(
      {
        assigneeId: In(assigneeIds),
      },
      actor,
    );

    const distributionByPriorityKeys: TaskPriority[] =
      Object.values(TaskPriority);
    const distributionByStatusKeys: TaskStatus[] = Object.values(TaskStatus);

    const report: TasksReportDto = {
      total: tasks.length,
      doneCount: 0,
      donePercent: 0,
      distributionByPriority: distributionByPriorityKeys.reduce(
        (acc, key) => {
          acc[key] = 0;
          return acc;
        },
        {} as Record<TaskPriority, number>,
      ),
      distributionByStatus: distributionByStatusKeys.reduce(
        (acc, key) => {
          acc[key] = 0;
          return acc;
        },
        {} as Record<TaskStatus, number>,
      ),
      overdueCount: 0,
      avgCompletionTime: 0,
      medianCompletionTime: 0,
    };

    const completionTimes: number[] = [];

    const now = Date.now();
    tasks.forEach((task) => {
      if (task.status === TaskStatus.DONE) {
        report.doneCount++;

        completionTimes.push(
          (task.updatedAt.getTime() - task.createdAt.getTime()) / 1000,
        );
      }

      report.distributionByPriority[task.priority]++;
      report.distributionByStatus[task.status]++;

      if (task.dueDate.getTime() < now && task.status !== TaskStatus.DONE) {
        report.overdueCount++;
      }
    });

    report.donePercent = report.total
      ? (report.doneCount / report.total) * 100
      : 0;

    report.avgCompletionTime = completionTimes.length
      ? completionTimes.reduce((acc, time) => acc + time, 0) /
        completionTimes.length
      : 0;

    report.medianCompletionTime = this.calculateMedian(completionTimes);

    // Искуственная задержка для демонстрации работы очереди
    const delay = Math.floor(Math.random() * 500) + 200;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return report;
  }
}
