/* Supertest `body` is untyped; assertions stay explicit. */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { INestApplication } from '@nestjs/common';
import Redis from 'ioredis';
import crypto from 'node:crypto';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { REDIS_CLIENT } from '../src/modules/redis/redis.provider';
import { TaskPriority, TaskStatus } from '../src/modules/tasks/tasks.entity';
import { UserRole } from '../src/modules/users/users.entity';
import { createIntegrationApp } from './helpers/bootstrap-integration-app';
import { decodeAccessTokenPayload } from './helpers/decode-jwt-payload';
import { runMigrationsOnce } from './helpers/run-migrations';
import { truncateBusinessTables } from './helpers/truncate-tables';

describe('CRUD (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    await runMigrationsOnce();
    app = await createIntegrationApp();
    dataSource = app.get(DataSource);
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

  function suffix(): string {
    return `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }

  async function registerOwner(s: string) {
    const email = `owner-${s}@test.local`;
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        organizationName: `Integration Org ${s}`,
        email,
        password: 'password123',
      })
      .expect(201);
    const accessToken = res.body.accessToken as string;
    return { accessToken, email };
  }

  async function login(email: string, password: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    return res.body.accessToken as string;
  }

  describe('Organizations', () => {
    it('GET /organizations/me returns current org', async () => {
      const { accessToken } = await registerOwner(suffix());
      const payload = decodeAccessTokenPayload(accessToken);

      const res = await request(app.getHttpServer())
        .get('/organizations/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(payload.organizationId);
      expect(res.body.name).toBeDefined();
    });

    it('PATCH /organizations/me updates name for OWNER', async () => {
      const { accessToken } = await registerOwner(suffix());

      const res = await request(app.getHttpServer())
        .patch('/organizations/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Renamed Org' })
        .expect(200);

      expect(res.body.name).toBe('Renamed Org');

      const getRes = await request(app.getHttpServer())
        .get('/organizations/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(getRes.body.name).toBe('Renamed Org');
    });

    it('PATCH /organizations/me returns 403 for EMPLOYEE', async () => {
      const s = suffix();
      const { accessToken: ownerToken } = await registerOwner(s);

      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: `emp-${s}@test.local`,
          password: 'password123',
          role: UserRole.EMPLOYEE,
        })
        .expect(201);

      const empToken = await login(`emp-${s}@test.local`, 'password123');

      await request(app.getHttpServer())
        .patch('/organizations/me')
        .set('Authorization', `Bearer ${empToken}`)
        .send({ name: 'Hack' })
        .expect(403);
    });
  });

  describe('Projects', () => {
    it('creates, lists, gets, updates, soft-deletes a project', async () => {
      const { accessToken } = await registerOwner(suffix());

      const createRes = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Project Alpha' })
        .expect(201);

      const projectId = createRes.body.id as string;
      expect(projectId).toBeDefined();

      const listRes = await request(app.getHttpServer())
        .get('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currentPage: 1, itemsPerPage: 10 })
        .expect(200);

      expect(listRes.body.items.length).toBe(1);
      expect(listRes.body.items[0].id).toBe(projectId);

      const getRes = await request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(getRes.body.name).toBe('Project Alpha');

      const patchRes = await request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Project Beta' })
        .expect(200);
      expect(patchRes.body.name).toBe('Project Beta');

      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });

  describe('Users', () => {
    it('creates, lists, soft-deletes a user', async () => {
      const s = suffix();
      const { accessToken } = await registerOwner(s);

      const createRes = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          email: `member-${s}@test.local`,
          password: 'password123',
          role: UserRole.EMPLOYEE,
        })
        .expect(201);

      const userId = createRes.body.id as string;

      const listRes = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currentPage: 1, itemsPerPage: 10 })
        .expect(200);

      expect(
        listRes.body.items.some((u: { id: string }) => u.id === userId),
      ).toBe(true);

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });

  describe('Tasks', () => {
    it('full task lifecycle as OWNER', async () => {
      const { accessToken } = await registerOwner(suffix());

      const projectRes = await request(app.getHttpServer())
        .post('/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Task Board' })
        .expect(201);
      const projectId = projectRes.body.id as string;

      const payload = decodeAccessTokenPayload(accessToken);
      const dueDate = new Date('2026-12-31T12:00:00.000Z').toISOString();

      const createRes = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: 'Do work',
          description: 'Details',
          projectId,
          dueDate,
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
        })
        .expect(201);

      const taskId = createRes.body.id as string;
      expect(createRes.body.assigneeId).toBe(payload.sub);

      const listRes = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ currentPage: 1, itemsPerPage: 10 })
        .expect(200);
      expect(
        listRes.body.items.some((t: { id: string }) => t.id === taskId),
      ).toBe(true);

      const getRes = await request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(getRes.body.title).toBe('Do work');

      const patchRes = await request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Done work', status: TaskStatus.DONE })
        .expect(200);
      expect(patchRes.body.title).toBe('Done work');

      await request(app.getHttpServer())
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });
  });
});
