import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Not, Repository } from 'typeorm';
import { Task, TaskStatus } from '../tasks.entity';

@Injectable()
export class TaskOverdueCronService {
  private readonly logger = new Logger(TaskOverdueCronService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTaskOverdue() {
    const updated = await this.taskRepository.update(
      {
        dueDate: LessThan(new Date()),
        status: Not(In([TaskStatus.DONE, TaskStatus.OVERDUE])),
        deletedAt: IsNull(),
      },
      {
        status: TaskStatus.OVERDUE,
      },
    );

    this.logger.log(`Updated ${updated.affected ?? 0} tasks`);
  }
}
