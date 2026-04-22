import { applyDecorators } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiResponseOptions,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { HttpErrorResponseDto } from './http-error-response.dto';

type Options = {
  unauthorized?: boolean;
  forbidden?: boolean;
  notFound?: boolean;
  conflict?: boolean;
  unprocessable?: boolean;
  serviceUnavailable?: boolean;
};

function opt(description?: string): ApiResponseOptions {
  return {
    ...(typeof description === 'string' ? { description } : {}),
    type: HttpErrorResponseDto,
  };
}

export function ApiErrorResponses(options: Options) {
  const decorators = [];

  if (options.unauthorized) {
    decorators.push(
      ApiUnauthorizedResponse(
        opt('Unauthorized (missing/invalid access token)'),
      ),
    );
  }
  if (options.forbidden) {
    decorators.push(
      ApiForbiddenResponse(opt('Forbidden (insufficient permissions)')),
    );
  }
  if (options.notFound) {
    decorators.push(ApiNotFoundResponse(opt('Not found')));
  }
  if (options.conflict) {
    decorators.push(ApiConflictResponse(opt('Conflict')));
  }
  if (options.unprocessable) {
    decorators.push(
      ApiUnprocessableEntityResponse(opt('Validation error (DTO constraints)')),
    );
  }
  if (options.serviceUnavailable) {
    decorators.push(
      ApiServiceUnavailableResponse(
        opt('Service unavailable (dependency down)'),
      ),
    );
  }

  return applyDecorators(...decorators);
}
