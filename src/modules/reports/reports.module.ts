import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ReportsService } from './report.service';
import { ReportsController } from './reports.controller';
import { TasksReportProcessor } from './processors/tasks-report-processor';

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue({
      name: 'reports-tasks',
    }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, TasksReportProcessor],
  exports: [ReportsService],
})
export class ReportsModule {}
