# Team Task Management API (NestJS)

Production-ready backend API проект для резюме: **NestJS + TypeORM + PostgreSQL + Redis**.

Цель: показать enterprise-подходы (модульная архитектура, strict TS, миграции, auth, RBAC, multi-tenant isolation, Redis cache/queue, тесты и CI — по roadmap).

## Прогресс по Roadmap

- **День 3–4 — сделано:** полноценный auth (JWT + refresh в Redis + cookie), RBAC scaffolding (`@Roles`, `RolesGuard`, `@Auth`), `GET /auth/me`, юнит-тесты `AuthService` (`src/modules/auth/auth.service.spec.ts`). Правило изоляции: **`organizationId` в каждом CRUD-сервисе** (внедряется при CRUD).
- **День 5 — сделано:** **Organizations** (`GET/PATCH /organizations/me`, `TS.md` §5.3), CRUD **Projects** + **Users** (pagination как в Users, soft delete, RBAC + multi-tenant isolation, юнит-тесты).
- **День 6 — сделано (CRUD Tasks):** модуль **Tasks** — list с pagination и фильтрами (`status`, `assigneeId`, `priority`), get/update/delete (soft delete, `204` на DELETE), политика в `tasks.policy.ts` (см. `TS.md` §4.4). **Дальше по плану:** Redis cache для `GET /tasks`, отчёты/очередь.

## Что уже реализовано

- **Auth**
  - `POST /auth/register`: создаёт `Organization`, `User (role=OWNER)`, возвращает `accessToken`, кладёт refresh в httpOnly cookie `refresh_token`
  - `POST /auth/login`: возвращает `accessToken`, обновляет refresh cookie
  - `POST /auth/refresh`: cookie-only refresh, выдаёт новый `accessToken`
  - **Redis refresh sessions**: на `register/login` создаётся ключ `refresh:{userId}:{tid}` с TTL = refresh TTL; на `refresh` проверяется существование ключа
  - `POST /auth/logout`: server-side invalidation refresh key в Redis + очистка cookie
- **RBAC (scaffolding, Day 4)**
  - `@Roles(...)` decorator: `src/common/decorators/roles.decorator.ts`
  - `RolesGuard`: `src/common/guards/roles.guard.ts`
  - `JwtAuthGuard`: `src/common/guards/jwt-auth.guard.ts`
  - `@Auth(...)` composite decorator: `src/common/decorators/auth.decorator.ts`
  - `GET /auth/me`: защищённый endpoint текущего пользователя (данные читаются из БД через `AuthService.me()`)
- **Тесты**
  - Юнит-тесты `AuthService`: `src/modules/auth/auth.service.spec.ts` (`npm test -- auth.service.spec.ts`)
  - Юнит-тесты `Users`: `src/modules/users/user.service.spec.ts`, `src/modules/users/user.policy.spec.ts`
  - Юнит-тесты `Projects`: `src/modules/projects/projects.service.spec.ts`
  - Юнит-тесты `Organizations`: `src/modules/organizations/organizations.service.spec.ts`
  - Юнит-тесты `Tasks`: `src/modules/tasks/tasks.service.spec.ts`, `src/modules/tasks/tasks.policy.spec.ts`
- **Organizations (`TS.md` §5.3)**
  - `GET /organizations/me` — своя организация (любая роль с JWT)
  - `PATCH /organizations/me` — смена имени, только **OWNER**
- **Users (Day 5)**
  - `POST /users` (owner/manager, роль-ограничения в policy)
  - `GET /users` (pagination)
  - `DELETE /users/:id` (soft delete, `204`)
- **Projects (Day 5)**
  - `POST /projects`
  - `GET /projects` (pagination)
  - `GET /projects/:id`
  - `PATCH /projects/:id`
  - `DELETE /projects/:id` (soft delete, `204`)
  - Уникальность имени проекта в рамках организации среди активных: partial unique index `uq_projects_org_name_active` (`WHERE deleted_at IS NULL`)
- **Tasks (Day 6)**
  - Сущность `Task`: денормализованный **`organizationId`** (согласован с проектом при создании; описание в `TS.md` §4.4), индексы под multi-tenant list и FK — см. `tasks.entity.ts`.
  - `POST /tasks`, `GET /tasks` (pagination + фильтры), `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id` (`204`)
  - RBAC: `tasks.policy.ts` (allowlist по ролям, как идея `user.policy.ts`); юнит-тесты: `tasks.service.spec.ts`, `tasks.policy.spec.ts`
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

DataSource: `src/database/data-source.ts`. Команды используют `.env.development.local` (см. `package.json` → `typeorm`).

PostgreSQL должен быть доступен (например `npm run docker:up:dev`).

```bash
cd repo
# после изменения сущностей — осмысленное имя файла:
npm run typeorm:migration:generate -- src/database/migrations/<MigrationName>
npm run typeorm:migration:run
```

Сгенерированный SQL для `NOT NULL` без default на непустой таблице иногда нужно **дополнить вручную** (nullable → backfill → `SET NOT NULL`).

## Quality

```bash
cd repo
npm run lint
npm test
```

## Документация

- **ТЗ (домен, требования):** `TS.md`

## Roadmap

Дальше по плану: Redis cache для списка задач, Bull/WebSocket, CI, coverage ≥ 70% и т.д.

**Правило:** multi-tenant isolation — в запросах к данным всегда ограничивать **`organizationId`** из JWT; для `Task` оно хранится в строке задачи и совпадает с организацией проекта.
