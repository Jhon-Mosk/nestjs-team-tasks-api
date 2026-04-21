import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { NativeLogger } from 'nestjs-pino';

type NormalizedErrorBody = {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
};

function normalizeHttpExceptionResponse(
  statusCode: number,
  exceptionResponse: unknown,
): Pick<NormalizedErrorBody, 'message' | 'error'> {
  const statusText = HttpStatus[statusCode] ?? 'Error';
  const statusTextHuman = statusText
    .split('_')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
  const internalMessage = 'Internal server error';

  if (typeof exceptionResponse === 'string') {
    return {
      message: exceptionResponse,
      error: statusTextHuman,
    };
  }

  if (exceptionResponse && typeof exceptionResponse === 'object') {
    const obj = exceptionResponse as Record<string, unknown>;

    const messageValue = obj['message'];
    const errorValue = obj['error'];

    const message =
      typeof messageValue === 'string' || Array.isArray(messageValue)
        ? (messageValue as string | string[])
        : statusTextHuman;

    const error = typeof errorValue === 'string' ? errorValue : statusTextHuman;

    return { message, error };
  }

  return {
    message:
      statusCode === (HttpStatus.INTERNAL_SERVER_ERROR as number)
        ? internalMessage
        : statusTextHuman,
    error: statusTextHuman,
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: NativeLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const { message, error } = normalizeHttpExceptionResponse(
      status,
      exceptionResponse,
    );

    this.logger.error(
      { exception, path: request.url, method: request.method },
      'Unhandled exception',
    );

    const body: NormalizedErrorBody = {
      statusCode: status,
      path: request.url,
      message,
      error,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
