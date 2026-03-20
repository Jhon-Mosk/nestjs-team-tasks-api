import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Configuration } from 'src/config/confuguration';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisProvider: Provider<Redis> = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const { host, port, user, userPassword } =
      configService.getOrThrow<Configuration['redis']>('redis');

    return new Redis({
      host,
      port,
      username: user,
      password: userPassword,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
    });
  },
};
