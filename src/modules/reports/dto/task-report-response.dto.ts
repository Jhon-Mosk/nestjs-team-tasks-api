import { ReportJobStatus } from '../types/report-job-status';
import { ApiProperty } from '@nestjs/swagger';

export class TaskReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  jobId!: string;

  @ApiProperty({ enum: ReportJobStatus, example: ReportJobStatus.PROCESSING })
  status!: ReportJobStatus;
}
