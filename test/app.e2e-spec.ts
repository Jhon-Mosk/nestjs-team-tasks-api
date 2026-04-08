import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import Redis from 'ioredis';
import request from 'supertest';
import { App } from 'supertest/types';
import type { HealthResponse } from './../src/health/health.types';
import { REDIS_CLIENT } from './../src/modules/redis/redis.provider';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ logger: false });
    await app.init();
  });

  afterEach(async () => {
    const redis = app.get<Redis>(REDIS_CLIENT);
    await redis.quit();
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as HealthResponse;
        expect(body).toMatchObject({
          status: 'ok',
        });
        expect(typeof body.timestamp).toBe('string');
      });
  });
});
