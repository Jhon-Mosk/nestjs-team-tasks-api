import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from 'src/queue/queue.constants';
import { UsersModule } from '../users/users.module';
import { TasksReportProcessor } from './processors/tasks-report-processor';
import { ReportsService } from './report.service';
import { ReportsController } from './reports.controller';
import { EventsModule } from '../events/events.module';
import { ReportsEventsService } from './reports-events.service';

@Module({
  imports: [
    UsersModule,
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
