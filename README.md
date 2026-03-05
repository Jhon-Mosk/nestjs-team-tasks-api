# 🚀 Universal NestJS Starter

Production-ready **NestJS + TypeScript** starter template.

Включает:

* NestJS
* PostgreSQL
* Docker / Docker Compose
* ESLint + Prettier
* Jest (unit + e2e)
* Husky
* Pino logger
* Готовую структуру для масштабирования

---

# 📦 Project Setup

```bash
npm install
```

---

# ▶️ Запуск приложения

## Development

```bash
npm run start:dev
```

Запуск в watch-режиме с форматированным выводом логов через `pino-pretty`.

## Debug

```bash
npm run start:debug
```

## Production (локально)

```bash
npm run build
npm run start:prod
```

---

# 🧪 Тестирование

```bash
# unit tests
npm run test

# watch mode
npm run test:watch

# coverage
npm run test:cov

# e2e tests
npm run test:e2e
```

---

# 🔧 ENV переменные

Создай `.env` на основе `.env.example`.

```env
NODE_ENV=development
PORT=3000

POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=app
POSTGRES_PASSWORD=secret
POSTGRES_DB=mydb
```

### Описание

| Переменная          | Описание                                        |
| ------------------- | ----------------------------------------------- |
| `NODE_ENV`          | Среда выполнения (`development` / `production`) |
| `PORT`              | Порт HTTP сервера                               |
| `POSTGRES_HOST`     | Хост PostgreSQL                                 |
| `POSTGRES_PORT`     | Порт PostgreSQL                                 |
| `POSTGRES_USER`     | Пользователь БД                                 |
| `POSTGRES_PASSWORD` | Пароль                                          |
| `POSTGRES_DB`       | Название базы                                   |

---

# 🐳 Docker запуск

## Запуск всего стека

```bash
docker compose up --build
```

Поднимаются:

* NestJS application
* PostgreSQL

## Остановка

```bash
docker compose down
```

## Production запуск контейнера

Если используется multi-stage Dockerfile:

```bash
docker build -t nest-app .
docker run -p 3000:3000 --env-file .env nest-app
```

---

# 🏗 Архитектурные принципы

Этот шаблон ориентирован на:

### 1️⃣ Чистую модульную архитектуру

* Каждый домен — отдельный модуль
* Минимальная связанность
* Чёткое разделение ответственности

### 2️⃣ Конфигурация через ENV

* Никаких хардкодов
* 12-Factor App подход

### 3️⃣ Строгая типизация

* TypeScript strict mode
* DTO + validation
* Явные интерфейсы

### 4️⃣ Production-first подход

* Graceful shutdown
* Логирование через Pino
* Docker-first окружение
* Готовность к CI/CD

### 5️⃣ Масштабируемость

Шаблон подходит для:

* монолита
* выделения сервисов
* перехода к микросервисной архитектуре

---

# 🧹 Code Quality

```bash
npm run lint
npm run lint:fix
npm run format
```

Используется:

* ESLint
* Prettier
* Husky (pre-commit hooks)

---

# 📁 Структура проекта

```
src/
 ├── main.ts
 ├── app.module.ts
 └── modules/
```

Проект легко расширяется добавлением новых модулей.

---

# 📜 License

MIT
