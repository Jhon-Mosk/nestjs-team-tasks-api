import { ReportJobStatus } from '../types/report-job-status';

export class TaskReportResponseDto {
  jobId!: string;
  status!: ReportJobStatus;
}
