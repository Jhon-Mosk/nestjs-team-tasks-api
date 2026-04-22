jest.mock('@nestjs/common', () => ({
  applyDecorators: (...decorators: unknown[]) => decorators,
}));

const unauthorized = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'unauthorized',
  opt,
}));
const forbidden = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'forbidden',
  opt,
}));
const notFound = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'notFound',
  opt,
}));
const conflict = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'conflict',
  opt,
}));
const unprocessable = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'unprocessable',
  opt,
}));
const serviceUnavailable = jest.fn<unknown, [unknown]>((opt) => ({
  kind: 'serviceUnavailable',
  opt,
}));

jest.mock('@nestjs/swagger', () => ({
  ApiProperty: () => () => undefined,
  ApiUnauthorizedResponse: (opt: unknown) => unauthorized(opt),
  ApiForbiddenResponse: (opt: unknown) => forbidden(opt),
  ApiNotFoundResponse: (opt: unknown) => notFound(opt),
  ApiConflictResponse: (opt: unknown) => conflict(opt),
  ApiUnprocessableEntityResponse: (opt: unknown) => unprocessable(opt),
  ApiServiceUnavailableResponse: (opt: unknown) => serviceUnavailable(opt),
}));

import { ApiErrorResponses } from './api-error-responses';

describe('ApiErrorResponses', () => {
  beforeEach(() => {
    unauthorized.mockClear();
    forbidden.mockClear();
    notFound.mockClear();
    conflict.mockClear();
    unprocessable.mockClear();
    serviceUnavailable.mockClear();
  });

  it('returns empty decorators list when no options enabled', () => {
    const decorators = ApiErrorResponses({});
    expect(decorators).toEqual([]);
  });

  it('adds only selected swagger responses', () => {
    const decorators = ApiErrorResponses({
      unauthorized: true,
      notFound: true,
      unprocessable: true,
    });

    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(unprocessable).toHaveBeenCalledTimes(1);
    expect(forbidden).not.toHaveBeenCalled();
    expect(conflict).not.toHaveBeenCalled();
    expect(serviceUnavailable).not.toHaveBeenCalled();

    expect(decorators).toHaveLength(3);
  });
});
