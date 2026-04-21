import { ConfigService } from '@nestjs/config';
import type { FactoryProvider } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT, redisProvider } from './redis.provider';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('redisProvider', () => {
  it('creates ioredis client with config values', () => {
    const configService = {
      getOrThrow: jest.fn(() => ({
        host: 'localhost',
        port: 6379,
        user: 'u',
        userPassword: 'p',
      })),
    } as unknown as ConfigService;

    const factory = redisProvider as FactoryProvider<Redis>;
    const client = factory.useFactory(configService);

    expect(factory.provide).toBe(REDIS_CLIENT);
    const calls = (configService.getOrThrow as jest.Mock).mock
      .calls as unknown[][];
    expect(calls[0]?.[0]).toBe('redis');
    expect(client).toBeDefined();
    expect(Redis).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
      username: 'u',
      password: 'p',
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
  });
});
