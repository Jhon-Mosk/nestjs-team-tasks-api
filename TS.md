# 📘 Техническое задание

# Team Task Management API

**NestJS + TypeORM + PostgreSQL + Redis**

---

# 1. Цель проекта

Разработать production-ready backend API для системы управления задачами внутри организации (B2B формат).

Проект должен демонстрировать:

* уверенное владение NestJS
* работу с TypeORM (DataSource API)
* проектирование архитектуры backend-приложения
* работу с PostgreSQL
* Redis (кеширование + брокер очередей)
* JWT (access + refresh)
* RBAC
* асинхронную обработку задач (BullMQ)
* WebSocket
* тестирование ≥ 70% coverage
* Docker + CI

Проект предназначен:

* для демонстрации работодателям
* как шаблон для тестовых заданий
* для обсуждения архитектурных решений на собеседовании

---

# 2. Технологический стек

## Backend

* NestJS
* TypeScript (strict mode)
* TypeORM (DataSource API)
* PostgreSQL
* Redis
* JWT (access + refresh)
* bcrypt

## Асинхронность

* @nestjs/bullmq
* BullMQ -> ioredis (Redis как брокер)
* @nestjs/websockets

## Dev

* ESLint
* Prettier
* Swagger
* Docker (multi-stage)
* docker-compose

## Тестирование

* Jest
* Supertest
* Coverage ≥ 70%

---

# 3. Архитектура

## 3.1 Структура проекта

```
src/
  main.ts
  app.module.ts

  modules/
    auth/
    users/
    organizations/
    projects/
    tasks/
    reports/

  common/
    guards/
    decorators/
    interceptors/
    filters/
    exceptions/

  config/
  database/
  queue/
```

---

## 3.2 Архитектурные принципы

* Модульная архитектура
* DI через constructor
* DTO + class-validator
* Разделение controller / service / repository
* Transactions при необходимости
* Soft delete через TypeORM
* Явная проверка границ организации (multi-tenant isolation)
* Отсутствие any
* Strict TypeScript

---

# 4. Бизнес-домен

## 4.1 Organization

| Поле      | Тип       |
| --------- | --------- |
| id        | uuid      |
| name      | string    |
| ownerId   | uuid      |
| createdAt | timestamp |
| updatedAt | timestamp |

Связи:

* OneToMany → Users
* OneToMany → Projects

---

## 4.2 User

| Поле           | Тип                             |
| -------------- | ------------------------------- |
| id             | uuid                            |
| email          | string (unique)                 |
| password       | string (hashed)                 |
| role           | enum (owner, manager, employee) |
| organizationId | uuid                            |
| createdAt      | timestamp                       |
| updatedAt      | timestamp                       |
| deletedAt      | timestamp                       |

Связи:

* ManyToOne → Organization
* OneToMany → Tasks

---

## 4.3 Project

| Поле           | Тип       |
| -------------- | --------- |
| id             | uuid      |
| name           | string    |
| organizationId | uuid      |
| createdAt      | timestamp |
| updatedAt      | timestamp |
| deletedAt      | timestamp |

Связи:

* ManyToOne → Organization
* OneToMany → Tasks

---

## 4.4 Task

| Поле            | Тип                            |
| --------------- | ------------------------------ |
| id              | uuid                           |
| title           | string                         |
| description     | text                           |
| status          | enum (todo, in_progress, done) |
| priority        | enum (low, medium, high)       |
| organizationId  | uuid                           |
| assigneeId      | uuid                           |
| projectId       | uuid                           |
| dueDate         | timestamp                      |
| createdAt       | timestamp                      |
| updatedAt       | timestamp                      |
| deletedAt       | timestamp                      |

Связи:

* ManyToOne → User (assignee)
* ManyToOne → Project

`organizationId` дублирует организацию проекта на уровне строки задачи: так проще изоляция multi-tenant в запросах и индексы без обязательного `JOIN` с `projects` при каждом списке/фильтре. Значение всегда должно совпадать с `projects.organizationId` для выбранного `projectId` (выставляется при создании/смене проекта на стороне сервиса).

---

# 5. Функциональные требования

---

# 5.1 Аутентификация

## Регистрация

* Создание организации
* Создание owner-пользователя
* Хеширование пароля

## Логин

* Проверка email/password
* Access token (15 минут)
* Refresh token (7 дней)

## Refresh

* Проверка refresh token
* Выдача нового access token

## Logout

* Инвалидация refresh token в Redis

---

# 5.2 Авторизация и RBAC

Роли:

| Роль     | Права                                |
| -------- | ------------------------------------ |
| owner    | полный доступ в пределах организации |
| manager  | CRUD projects + tasks                |
| employee | CRUD только своих задач              |

Дополнительные требования:

* Пользователь может работать только в пределах своей организации
* Пользователь может работать только со своими задачами (если employee)
* Даже owner не имеет доступа к данным другой организации
* Реализация через RolesGuard + @Roles()

---

# 5.3 Organizations

* Получение своей организации
* Обновление имени (owner only)

---

# 5.4 Users

* Создание пользователя (owner/manager)
* Просмотр списка пользователей
* Soft delete
* Запрет межорганизационного доступа

---

# 5.5 Projects

* CRUD
* Pagination
* Soft delete
* Только внутри своей организации

---

# 5.6 Tasks

* CRUD
* Pagination
* Фильтрация:

  * по статусу
  * по assignee
  * по priority
* Soft delete
* Проверка прав доступа

---

# 6. Кеширование (Redis)

Redis используется для:

* хранения refresh tokens
* кеширования ответа **`GET /tasks`** (список задач с пагинацией и фильтрами)

## 6.1 Схема ключей (org-version + scope + hash)

Чтобы не перечислять и не удалять сотни ключей при каждой мутации, используется **версия списков по организации**:

* счётчик: `tasks:list:ver:{organizationId}` — целое число (строка в Redis), увеличивается при любой мутации задач в этой организации;
* запись кеша (ответ `ListTasksResponseDto` в JSON):

```
tasks:list:{organizationId}:v{version}:{scope}:{hash}
```

Где:

* **`{version}`** — текущее значение счётчика для организации (если ключа ещё нет, версия считается **0**);
* **`{scope}`** — разделение выдачи по RBAC:
  * `emp:{userId}` — для роли **EMPLOYEE** (список всегда только «мои» задачи, как в `TasksService.list`);
  * `staff` — для **OWNER** и **MANAGER** (организационный список с фильтром по assignee в query);
* **`{hash}`** — короткий стабильный хеш (например SHA-1, усечённый) от нормализованных параметров запроса: пагинация (`currentPage`, `itemsPerPage`), фильтры `status`, `priority`, для **staff** — при наличии `assigneeId` в query. Для **EMPLOYEE** поле `assigneeId` из query в хеш **не входит** (оно игнорируется в сервисе).

Так обеспечиваются **multi-tenant isolation** (`organizationId` в ключе), корректная разница **employee vs staff**, и **O(1) инвалидация** всех списков организации без `SCAN`/`KEYS`.

## 6.2 TTL

* Значение TTL задаётся переменной окружения **`TASKS_LIST_CACHE_TTL_SEC`** (по умолчанию **300** секунд = 5 минут).
* Запись кеша: `SET ... EX {TTL}`.

## 6.3 Инвалидация

При успешном:

* create задачи
* update задачи
* soft delete задачи

выполняется **`INCR tasks:list:ver:{organizationId}`**. Старые ключи с предыдущей версией перестают использоваться; физически они истекают по TTL.

## 6.4 Отказоустойчивость

* Ошибка чтения кеша → запрос к БД (как без кеша).
* Ошибка записи в кеш → ответ не блокируется; данные всё равно возвращаются из БД.
* Ошибка `INCR` — best-effort; свежесть ограничена TTL.

---

# 7. Асинхронная обработка (Queue + CPU task)

## 7.1 Назначение

Реализовать генерацию отчёта по задачам пользователя через очередь.

Цель:

* демонстрация BullMQ
* асинхронная архитектура
* работа с Redis как брокером

---

## 7.2 Endpoint

POST /reports/tasks

Ответ:

```json
{
  "jobId": "uuid",
  "status": "processing"
}
```

---

## 7.3 Worker

Worker выполняет:

* подсчёт общего количества задач
* процент выполненных
* распределение по приоритетам
* распределение по статусам
* просроченные задачи
* среднее и медианное время выполнения
* искусственную CPU-нагрузку (200–500ms)

---

## 7.4 Возврат результата

Через WebSocket:

* Клиент подключается
* Подписывается на userId
* После завершения job сервер отправляет результат

---

# 8. Cron Job

Ежедневная проверка:

* Если dueDate < now AND status != done
* Логирование
* (опционально) смена статуса на overdue

---

# 9. Обработка ошибок

* Custom domain exceptions
* Глобальный exception filter
* Единый формат ответа:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "...",
  "path": "/tasks"
}
```

---

# 10. Нефункциональные требования

* Все endpoints защищены JWT (кроме auth)
* DTO + ValidationPipe
* Swagger документация
* Логирование через Logger
* Использование environment variables
* Нет any
* Strict mode включён

---

# 11. Тестирование

## 11.1 Coverage

* Минимум 70%
* Проверяется через `npm run test:cov`
* CI должен падать при снижении покрытия

---

## 11.2 Unit tests

Покрыть:

* AuthService
* TasksService
* ReportsService
* Cache layer (mock Redis)
* Queue producer
* Queue processor

---

## 11.3 Integration tests

Проверить:

* регистрация
* логин
* создание задачи
* запрет доступа к чужим задачам
* кеширование (hit/miss)
* постановка job в очередь

---

# 12. Docker

docker-compose включает:

* app
* postgres
* redis

Запуск:

```
docker compose up --build
```

Использовать multi-stage Dockerfile.

---

# 13. CI/CD

Pipeline должен включать:

1. Install
2. Lint
3. Tests
4. Coverage check (fail < 70%)
5. Build
6. Docker build

README должен содержать пример GitHub Actions.

---

# 14. Git-стратегия

* Несколько осмысленных коммитов
* Conventional commits:

```
feat(auth)
feat(tasks)
feat(redis)
feat(queue)
feat(rbac)
test(tasks)
docker setup
ci setup
```

---

# 15. Критерии готовности

Проект завершён, если:

* Работает через Docker
* Есть Swagger
* Реализован RBAC
* Есть Redis (кеш + брокер)
* Реализована очередь BullMQ
* Реализован WebSocket
* Есть тесты ≥ 70%
* Структура кода читаемая
* Нет any
* Strict mode включён

---

# Итоговый уровень проекта

Проект демонстрирует:

* Production-подход к NestJS
* Multi-tenant архитектуру
* Redis как кеш и брокер
* Асинхронную обработку через очередь
* WebSocket интеграцию
* CI/CD
* Архитектурную зрелость уровня middle+/pre-senior
