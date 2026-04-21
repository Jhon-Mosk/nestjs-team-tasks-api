import { Logger } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { Task, TaskStatus } from '../tasks.entity';
import { TaskOverdueCronService } from './task-overdue.cron.service';

describe('TaskOverdueCronService', () => {
  it('updates overdue tasks and logs affected count', async () => {
    const update = jest.fn().mockResolvedValue({ affected: 2 });
    const repo = { update } as unknown as Repository<Task>;

    const log = jest.fn();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(log);

    const service = new TaskOverdueCronService(repo as never);
    await service.handleTaskOverdue();

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        // TypeORM FindOperators (LessThan/Not/In/IsNull) are objects
        dueDate: expect.anything() as unknown as object,
        status: expect.anything() as unknown as object,
        deletedAt: expect.anything() as unknown as object,
      }),
      { status: TaskStatus.OVERDUE },
    );
    expect(log).toHaveBeenCalledWith('Updated 2 tasks');
  });
});
