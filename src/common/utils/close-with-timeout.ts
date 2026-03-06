import { INestApplication } from '@nestjs/common';

export function closeWithTimeout(
  app: INestApplication,
  timeoutMs: number,
): Promise<void> {
  return Promise.race([
    app.close(),
    new Promise<never>((_, reject) =>
      setTimeout(reject, timeoutMs, new Error('Shutdown timeout')),
    ),
  ]);
}
