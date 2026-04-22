const createDocument = jest.fn<unknown, unknown[]>(() => ({
  openapi: '3.0.0',
}));
const setup = jest.fn<void, unknown[]>();

class DocumentBuilderMock {
  setTitle() {
    return this;
  }
  setDescription() {
    return this;
  }
  setVersion() {
    return this;
  }
  addBearerAuth() {
    return this;
  }
  build() {
    return { built: true };
  }
}

jest.mock('@nestjs/swagger', () => ({
  DocumentBuilder: DocumentBuilderMock,
  SwaggerModule: {
    createDocument: (...args: unknown[]) => createDocument(...args),
    setup: (...args: unknown[]) => setup(...args),
  },
}));

import type { INestApplication, LoggerService } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { setupSwagger } from './setup-swagger';

function createAppMock(config: Record<string, unknown>) {
  const use = jest.fn();
  const get = jest.fn((token: unknown) => {
    // ConfigService is requested by type token; return a minimal mock.
    if (typeof token === 'function') {
      const configService: Partial<ConfigService> = {
        get: (key: string): unknown => config[key],
      };
      return configService;
    }
    return undefined;
  });

  return {
    app: { use, get } as unknown as INestApplication,
    use,
  };
}

describe('setupSwagger', () => {
  beforeEach(() => {
    createDocument.mockClear();
    setup.mockClear();
  });

  it('does nothing when swagger.enabled is false', () => {
    const { app, use } = createAppMock({
      'swagger.enabled': false,
      'swagger.user': 'u',
      'swagger.password': 'p',
    });
    const logger: LoggerService = {
      warn: jest.fn(),
    } as unknown as LoggerService;

    setupSwagger(app, logger);

    expect(use).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });

  it('warns and does nothing when enabled but creds missing', () => {
    const { app, use } = createAppMock({
      'swagger.enabled': true,
      'swagger.user': undefined,
      'swagger.password': undefined,
    });
    const logger: LoggerService = {
      warn: jest.fn(),
    } as unknown as LoggerService;

    setupSwagger(app, logger);

    expect((logger.warn as jest.Mock).mock.calls.length).toBe(1);
    expect(use).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
  });

  it('registers swagger routes when enabled with creds', () => {
    const { app, use } = createAppMock({
      'swagger.enabled': true,
      'swagger.user': 'admin',
      'swagger.password': 'admin',
    });
    const logger: LoggerService = {
      warn: jest.fn(),
    } as unknown as LoggerService;

    setupSwagger(app, logger);

    expect(use).toHaveBeenCalledTimes(1);
    expect(createDocument).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledTimes(1);
  });
});
