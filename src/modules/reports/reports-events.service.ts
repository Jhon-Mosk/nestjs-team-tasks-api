import { Injectable } from '@nestjs/common';
import { EventsEmitterService } from '../events/events-emitter.service';
import { TasksReportDto } from './dto/tasks-report.dto';
import { REPORTS_WS_EVENTS } from './reports-ws.constants';

export type TaskReportDonePayload = {
  jobId: string;
  report: TasksReportDto;
};

export type TaskReportFailedPayload = {
  jobId: string;
  error: string;
};

@Injectable()
export class ReportsEventsService {
  constructor(private readonly events: EventsEmitterService) {}

  emitTaskReportDone(userId: string, payload: TaskReportDonePayload): void {
    this.events.emitToUser(
      userId,
      REPORTS_WS_EVENTS.TASKS_REPORT_DONE,
      payload,
    );
  }

  emitTaskReportFailed(userId: string, payload: TaskReportFailedPayload): void {
    this.events.emitToUser(
      userId,
      REPORTS_WS_EVENTS.TASKS_REPORT_FAILED,
      payload,
    );
  }
}
