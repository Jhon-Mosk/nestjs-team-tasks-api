# Team Task Management API (NestJS)

Production-ready backend API проект для резюме: **NestJS + TypeORM + PostgreSQL + Redis**.

Цель: показать enterprise-подходы (модульная архитектура, strict TS, миграции, auth, RBAC, multi-tenant isolation, Redis cache/queue, тесты и CI — по roadmap).

## Прогресс по Roadmap

- **День 3–4 — сделано:** полноценный auth (JWT + refresh в Redis + cookie), RBAC scaffolding (`@Roles`, `RolesGuard`, `@Auth`), `GET /auth/me`, юнит-тесты `AuthService` (`src/modules/auth/auth.service.spec.ts`). Правило изоляции: **`organizationId` в каждом CRUD-сервисе** (внедряется при CRUD).
- **День 5 — сделано:** **Organizations** (`GET/PATCH /organizations/me`, `TS.md` §5.3), CRUD **Projects** + **Users** (pagination как в Users, soft delete, RBAC + multi-tenant isolation, юнит-тесты).
- **День 6 — сделано (CRUD Tasks):** модуль **Tasks** — list с pagination и фильтрами (`status`, `assigneeId`, `priority`), get/update/delete (soft delete, `204` на DELETE), политика в `tasks.policy.ts` (см. `TS.md` §4.4).
- **День 7 — сделано (Redis cache `GET /tasks`):** `TasksListCacheService` (`src/modules/tasks/tasks-list-cache.service.ts`), ключи **org-version + scope + hash**, TTL `TASKS_LIST_CACHE_TTL_SEC` (по умолчанию 300 с), инвалидация через `INCR tasks:list:ver:{organizationId}` — см. `TS.md` §6.
- **День 8 — сделано (BullMQ отчёт + WebSocket):** `POST /reports/tasks` ставит job `tasks-report` в очередь `reports-tasks`; payload минимальный (`organizationId`, `requestedByUserId`, `requestedByRole`, опционально `targetUserId`) — `src/modules/reports/types/task-report-job-payload.ts`; worker `TasksReportProcessor` считает метрики по `TS.md` §7.3. Результат доставляется по Socket.io: **`EventsGateway`** (JWT в handshake → комната `user:{sub}`), **`ReportsEventsService`** эмитит `tasks-report:done` / `tasks-report:failed` с `{ jobId, report }` или ошибкой — см. `src/modules/events/`, `src/modules/reports/reports-events.service.ts`, `reports-ws.constants.ts`.
- **Cron / overdue (`TS.md` §8):** статус `overdue` в enum, миграция, ежедневный cron `TaskOverdueCronService`, через API статус `overdue` задать нельзя — см. `src/modules/tasks/crons/`, `tasks.policy.ts`, `../memory/decision-log.md`.
- **Интеграционные тесты CRUD:** `test/crud.integration-spec.ts`, `npm run test:integration` — см. [ниже](#интеграционные-тесты).
- **Интеграционный тест WebSocket (Day 8):** `test/reports.ws.integration-spec.ts` — проверяет WS auth + room `user:{sub}` и что `TasksReportProcessor` эмитит `tasks-report:done`.
- **Юнит-тесты reports (Day 8):** `src/modules/reports/report.service.spec.ts`, `src/modules/reports/processors/tasks-report-processor.spec.ts`.

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
  - **Интеграционные (HTTP + PostgreSQL + Redis):** `test/crud.integration-spec.ts` — см. раздел [Интеграционные тесты](#интеграционные-тесты) ниже
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
- **Tasks (Day 6–7)**
  - Сущность `Task`: денормализованный **`organizationId`** (согласован с проектом при создании; описание в `TS.md` §4.4), индексы под multi-tenant list и FK — см. `tasks.entity.ts`.
  - `POST /tasks`, `GET /tasks` (pagination + фильтры; **кеш Redis** — см. `TS.md` §6), `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id` (`204`)
  - RBAC: `tasks.policy.ts` (allowlist по ролям, как идея `user.policy.ts`); юнит-тесты: `tasks.service.spec.ts`, `tasks.policy.spec.ts`, `tasks-list-cache.service.spec.ts`
- **Cron просроченных задач (`TS.md` §8)**
  - Статус **`overdue`** в enum `TaskStatus`; миграция `src/database/migrations/*AddOverdueTaskStatus*.ts` (расширение PG enum `tasks_status_enum`).
  - Ежедневно (`@nestjs/schedule`, `CronExpression.EVERY_DAY_AT_MIDNIGHT`): `TaskOverdueCronService` — `UPDATE` задач с `dueDate < now`, не `done`/`overdue`, не soft-deleted → `status = overdue` (`src/modules/tasks/crons/task-overdue.cron.service.ts`).
  - Через **API нельзя** вручную задать `status: overdue` (`tasks.policy.ts` + тесты).
- **Infra**
  - Docker Compose: `postgres` + `redis`
  - Zod env validation (`src/config/env.schema.ts`)
  - Logging через `nestjs-pino`; в HTTP-логах **redact** для `Authorization` / `Cookie` / `Set-Cookie` (`src/app.module.ts` → `pinoHttp.redact`)
  - Global `ValidationPipe` и `HttpExceptionFilter` (единый формат ошибок)

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
- Опционально: **`TASKS_LIST_CACHE_TTL_SEC`** — TTL кеша `GET /tasks` в секундах (по умолчанию `300`)

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

## Интеграционные тесты

Проверяют CRUD через реальный стек (Nest + TypeORM + Postgres + Redis, `supertest`). Файл сьюита: `test/crud.integration-spec.ts`; хелперы в `test/helpers/`; конфиг Jest: `test/jest-e2e.json`; переменные тестовой БД: `test/.env.integration` (подмешиваются **поверх** `.env.development.local` в скриптах `test:e2e` / `test:integration`).

**Подготовка один раз:** нужны запущенные Postgres и Redis (как для dev). Создай отдельную БД под интеграционные тесты (имя по умолчанию совпадает с `POSTGRES_DB` в `test/.env.integration`, обычно `mydb_integration`):

```bash
docker compose exec postgres psql -U app -d postgres -c "CREATE DATABASE mydb_integration;"
```

Миграции применяются автоматически в `beforeAll` первого прогона.

**Запуск:**

```bash
cd repo
npm run test:integration   # только *.integration-spec.ts
npm run test:e2e             # integration + smoke (например GET /health)
```

## Quality

```bash
cd repo
npm run lint
npm test
npm run test:cov
```

## Errors format (Day 9)

Глобальный `HttpExceptionFilter` приводит ответы об ошибках к единому формату из `TS.md` §9:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "...",
  "path": "/tasks"
}
```

`message` может быть строкой или массивом строк (для ошибок валидации).

## Coverage (Day 9)

Цель: держать coverage **≥ 70%** по unit-тестам.

Запуск:

```bash
cd repo
npm run test:cov
```

Coverage считается по бизнес-логике; из покрытия исключены “обвязочные” файлы, которые обычно не тестируют unit-тестами:

- `**/*.controller.ts`
- `**/*.module.ts`
- `**/*.entity.ts`
- `**/*.constants.ts`
- `**/dto/**`
- `**/database/**` (в т.ч. миграции)
- `**/main.ts`, `**/app.module.ts`

Настройка находится в `package.json` → `jest.collectCoverageFrom`.

Coverage gate:

- локально/в CI используется `package.json` → `jest.coverageThreshold` (глобально ≥ 70%)

## Документация

- **ТЗ (домен, требования):** `TS.md`

## Roadmap

**День 8 (очередь + WS):** закрыт — BullMQ, `POST /reports/tasks`, processor, WebSocket-доставка, unit/integration тесты — см. `../memory/decision-log.md`.
**Cron / overdue (`TS.md` §8):** статус `overdue`, cron, миграция, запрет ручной установки через API — см. выше и `../memory/decision-log.md`.

**Клиент WebSocket (кратко):** подключение к тому же origin, что и HTTP; передать access JWT в `auth: { token: '<accessJwt>' }` или в заголовке `Authorization: Bearer …`; слушать события `tasks-report:done` и при необходимости `tasks-report:failed` (имена в `src/modules/reports/reports-ws.constants.ts`).

**Следующий фокус:** CI и coverage ≥ 70% — см. `../Roadmap.md` (День 9).

**Статус:** кеш `GET /tasks` — `TasksListCacheService` (`TS.md` §6). Отчёт BullMQ + WS — см. выше и `../memory/decision-log.md` (Day 8).

**Правило:** multi-tenant isolation — в запросах к данным всегда ограничивать **`organizationId`** из JWT; для `Task` оно хранится в строке задачи и совпадает с организацией проекта.
