# Team Task Management API (NestJS)

Production-ready backend API проект для резюме: **NestJS + TypeORM + PostgreSQL + Redis**.

Цель: показать enterprise-подходы (модульная архитектура, strict TS, миграции, auth, RBAC, multi-tenant isolation, Redis cache/queue, тесты и CI — по roadmap).

## Что уже реализовано

- **Auth**
  - `POST /auth/register`: создаёт `Organization`, `User (role=OWNER)`, возвращает `accessToken`, кладёт refresh в httpOnly cookie `refresh_token`
  - `POST /auth/login`: возвращает `accessToken`, обновляет refresh cookie
  - `POST /auth/refresh`: cookie-only refresh, выдаёт новый `accessToken`
  - **Redis refresh sessions**: на `register/login` создаётся ключ `refresh:{userId}:{tid}` с TTL = refresh TTL; на `refresh` проверяется существование ключа
  - `POST /auth/logout`: server-side invalidation refresh key в Redis + очистка cookie
- **RBAC (scaffolding)**
  - `@Roles(...)` decorator: `src/common/decorators/roles.decorator.ts`
  - `RolesGuard`: `src/common/guards/roles.guard.ts`
  - `JwtAuthGuard`: `src/common/guards/jwt-auth.guard.ts`
  - `@Auth(...)` composite decorator: `src/common/decorators/auth.decorator.ts`
  - `GET /auth/me`: защищённый endpoint текущего пользователя (данные читаются из БД через `AuthService.me()`)
- **Infra**
  - Docker Compose: `postgres` + `redis`
  - Zod env validation (`src/config/env.schema.ts`)
  - Logging через `nestjs-pino`
  - Global `ValidationPipe` и `HttpExceptionFilter`

## Быстрый старт (dev)

```bash
cd repo
npm install
npm run start:dev
```

`start:dev` поднимает `postgres` + `redis` через Docker Compose (см. `package.json` скрипты `docker:up:dev` / `docker:down:dev`).

## ENV

Создай `.env` на основе `.env.example` (или используй `.env.development.local` для локального запуска).

Минимально нужны:
- PostgreSQL: `POSTGRES_*`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_USER`, `REDIS_USER_PASSWORD` (+ `REDIS_PASSWORD` для контейнера)
- JWT: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`

## Миграции (TypeORM)

DataSource: `src/database/data-source.ts`

```bash
cd repo
npm run typeorm:migration:generate -- src/database/migrations/Init
npm run typeorm:migration:run
```

## Quality

```bash
cd repo
npm run lint
```

## Roadmap

План работ — в `../Roadmap.md` (RBAC + multi-tenant, CRUD, Redis cache, queue, WebSocket, тесты и CI).

Важно: multi-tenant isolation (`organizationId`) применяется как обязательное правило в каждом новом CRUD-сервисе.
