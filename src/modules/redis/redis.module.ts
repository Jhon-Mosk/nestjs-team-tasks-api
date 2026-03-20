import { Module } from '@nestjs/common';
import { REDIS_CLIENT, redisProvider } from './redis.provider';

@Module({
  imports: [],
  controllers: [],
  providers: [redisProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
