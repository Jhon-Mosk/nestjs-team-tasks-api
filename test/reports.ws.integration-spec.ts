/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { EventsGateway } from '../src/modules/events/events.gateway';
import { REDIS_CLIENT } from '../src/modules/redis/redis.provider';
import { TasksReportProcessor } from '../src/modules/reports/processors/tasks-report-processor';
import { createIntegrationApp } from './helpers/bootstrap-integration-app';
import { decodeAccessTokenPayload } from './helpers/decode-jwt-payload';
import { runMigrationsOnce } from './helpers/run-migrations';
import { truncateBusinessTables } from './helpers/truncate-tables';

type TasksReportDoneEvent = {
  jobId: string;
  report: {
    total: number;
  };
};

describe('Reports WS (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    await runMigrationsOnce();
    app = await createIntegrationApp();
    dataSource = app.get(DataSource);
    // We need a real TCP port for Socket.io client.
    await app.listen(0);
  });

  beforeEach(async () => {
    await truncateBusinessTables(dataSource);
  });

  afterAll(async () => {
    if (app) {
      const redis = app.get<Redis>(REDIS_CLIENT);
      await redis.quit();
      await app.close();
    }
  });

  async function registerOwner() {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        organizationName: `WS Org ${Date.now()}`,
        email: `ws-owner-${Date.now()}@test.local`,
        password: 'password123',
      })
      .expect(201);

    return res.body.accessToken as string;
  }

  it('authenticates WS and joins user:{sub} room (manual emit)', async () => {
    const accessToken = await registerOwner();
    const payload = decodeAccessTokenPayload(accessToken);
    const baseUrl = await app.getUrl();

    const socket: Socket = io(baseUrl, {
      auth: { token: accessToken },
      extraHeaders: { Authorization: `Bearer ${accessToken}` },
      forceNew: true,
    });

    const gotEvent = new Promise<TasksReportDoneEvent>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('timeout')), 5_000);
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      socket.on('tasks-report:done', (p: TasksReportDoneEvent) => {
        clearTimeout(timeout);
        resolve(p);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for socket connect')),
        5_000,
      );
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const gateway = app.get(EventsGateway);
    gateway.emitToUser(payload.sub, 'tasks-report:done', {
      jobId: 'manual',
      report: { total: 0 },
    });

    const eventPayload = await gotEvent;
    expect(eventPayload.jobId).toBe('manual');

    socket.disconnect();
  }, 10_000);

  it('ReportsService creates job (HTTP contract)', async () => {
    const accessToken = await registerOwner();

    const createRes = await request(app.getHttpServer())
      .post('/reports/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201);

    const jobId = createRes.body.jobId as string;
    expect(typeof jobId).toBe('string');
    expect(jobId.length).toBeGreaterThan(0);
    expect(createRes.body.status).toBe('processing');
  }, 10_000);

  it('processor emits tasks-report:done over WS when executed', async () => {
    const accessToken = await registerOwner();
    const payload = decodeAccessTokenPayload(accessToken);
    const baseUrl = await app.getUrl();

    const socket: Socket = io(baseUrl, {
      auth: { token: accessToken },
      extraHeaders: { Authorization: `Bearer ${accessToken}` },
      forceNew: true,
    });

    const donePromise = new Promise<TasksReportDoneEvent>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for tasks-report:done')),
        10_000,
      );

      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      socket.on('tasks-report:done', (p: TasksReportDoneEvent) => {
        clearTimeout(timeout);
        resolve(p);
      });
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timed out waiting for socket connect')),
        5_000,
      );
      socket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    const processor = app.get(TasksReportProcessor);
    const jobId = 'test-job';
    // Processor uses only `job.id` + `job.data`.
    void processor.process({
      id: jobId,
      data: {
        organizationId: payload.organizationId,
        requestedByUserId: payload.sub,
        requestedByRole: payload.role,
      },
    } as any);

    const eventPayload = await donePromise;
    expect(eventPayload.jobId).toBe(jobId);
    expect(eventPayload.report.total).toBeGreaterThanOrEqual(0);

    socket.disconnect();
  }, 15_000);
});
