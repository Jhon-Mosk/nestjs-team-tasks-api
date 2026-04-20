import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { EventsModule } from '../events/events.module';
import { TasksModule } from '../tasks/tasks.module';
import { UsersModule } from '../users/users.module';
import { TasksReportProcessor } from './processors/tasks-report-processor';
import { ReportsService } from './report.service';
import { ReportsEventsService } from './reports-events.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    UsersModule,
    TasksModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.REPORTS_TASKS,
    }),
    EventsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, TasksReportProcessor, ReportsEventsService],
  exports: [ReportsService],
})
export class ReportsModule {}
