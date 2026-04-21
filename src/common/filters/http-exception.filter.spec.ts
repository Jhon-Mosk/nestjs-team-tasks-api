import type { ArgumentsHost } from '@nestjs/common';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { NativeLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './http-exception.filter';

function createHost(
  req: Partial<Request>,
  res: Partial<Response>,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => res,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  it('returns HttpException status and response', () => {
    const loggerError = jest.fn();
    const logger = { error: loggerError } as unknown as NativeLogger;
    const filter = new HttpExceptionFilter(logger);

    const json = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json } as unknown);
    const req = { url: '/x', method: 'GET' } as Partial<Request>;
    const res = { status: statusFn } as Partial<Response>;

    const exception = new HttpException(
      { message: 'bad', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, createHost(req, res));

    expect(loggerError).toHaveBeenCalled();
    expect(statusFn).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        path: '/x',
        message: 'bad',
        error: 'Bad Request',
        timestamp: expect.any(String) as unknown as string,
      }),
    );
  });

  it('returns 500 for unknown exception', () => {
    const loggerError = jest.fn();
    const logger = { error: loggerError } as unknown as NativeLogger;
    const filter = new HttpExceptionFilter(logger);

    const json = jest.fn();
    const statusFn = jest.fn().mockReturnValue({ json } as unknown);
    const req = { url: '/y', method: 'POST' } as Partial<Request>;
    const res = { status: statusFn } as Partial<Response>;

    filter.catch(new Error('boom'), createHost(req, res));

    expect(loggerError).toHaveBeenCalled();
    expect(statusFn).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        path: '/y',
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp: expect.any(String) as unknown as string,
      }),
    );
  });
});
