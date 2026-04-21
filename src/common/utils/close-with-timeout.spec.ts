import type { INestApplication } from '@nestjs/common';
import { closeWithTimeout } from './close-with-timeout';

describe('closeWithTimeout', () => {
  it('resolves when app closes before timeout', async () => {
    const app = {
      close: jest.fn().mockResolvedValue(undefined),
    } as unknown as INestApplication;

    const closeFn = (app as unknown as { close: jest.Mock }).close;

    await expect(closeWithTimeout(app, 50)).resolves.toBeUndefined();
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  it('rejects with timeout error when app does not close in time', async () => {
    const app = {
      close: jest
        .fn()
        .mockImplementation(() => new Promise<void>(() => undefined)),
    } as unknown as INestApplication;

    await expect(closeWithTimeout(app, 10)).rejects.toThrow('Shutdown timeout');
  });

  it('rejects when app.close() rejects', async () => {
    const app = {
      close: jest.fn().mockRejectedValue(new Error('close failed')),
    } as unknown as INestApplication;

    await expect(closeWithTimeout(app, 50)).rejects.toThrow('close failed');
  });
});
