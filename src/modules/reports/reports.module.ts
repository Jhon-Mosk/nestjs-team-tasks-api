import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ReportsService } from './report.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue({
      name: 'reports-tasks',
    }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
