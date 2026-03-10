import { Injectable } from '@nestjs/common';
import { HealthResponse } from './health.types';

@Injectable()
export class HealthService {
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
