import { HealthService } from './health.service';

describe('HealthService', () => {
  it('returns ok status and ISO timestamp', () => {
    const service = new HealthService();
    const result = service.check();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });
});
