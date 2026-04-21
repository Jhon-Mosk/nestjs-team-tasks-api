import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth } from 'src/common/decorators/auth.decorator';
import { AccessTokenPayload } from '../auth/types/jwt-payload';
import { CreateTaskReportDto } from './dto/create-task-report.dto';
import { TaskReportResponseDto } from './dto/task-report-response.dto';
import { ReportsService } from './report.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Auth()
  @Post('tasks')
  createTaskReport(
    @Body() dto: CreateTaskReportDto,
    @Req() req: Request & { user: AccessTokenPayload },
  ): Promise<TaskReportResponseDto> {
    return this.reportsService.createTaskReport(dto, req.user);
  }
}
