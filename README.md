# Kanban Board

Клиент-серверное веб-приложение «Kanban-доска» (аналог Jira) с полным циклом разработки: реализация, автоматизированное тестирование (модульное, интеграционное, E2E, нагрузочное, security) и CI/CD.

## Стек

| Слой            | Технологии                                                        |
| --------------- | ----------------------------------------------------------------- |
| Frontend        | React 18, TypeScript, Vite, MUI 5, Redux Toolkit, dnd-kit, axios  |
| Backend         | Node.js, Express 5, TypeScript, Prisma ORM, Zod                    |
| БД              | PostgreSQL 16/17                                                   |
| Аутентификация  | JWT (access + refresh), bcrypt                                    |
| Тесты backend   | Jest, Supertest                                                    |
| Тесты E2E       | Playwright                                                         |
| Нагрузка        | k6                                                                 |
| CI/CD           | GitHub Actions                                                     |
| Контейнеризация | Docker, docker-compose, nginx                                      |

Подробное обоснование выбора — в [docs/STACK.md](docs/STACK.md).

## Возможности

- Регистрация и вход, JWT-аутентификация, обновление токена.
- Роли: глобальные `ADMIN` / `MANAGER` / `DEVELOPER`, проектные `MANAGER` / `DEVELOPER` / `VIEWER`.
- Проекты: создание, список, обновление, удаление, участники, метки.
- Доски с колонками, WIP-лимиты на колонку.
- Карточки: CRUD, drag & drop, приоритет, дедлайн, исполнитель, метки, комментарии, вложения, история изменений.
- Фильтрация карточек по тексту, приоритету, исполнителю.
- Логирование действий (activity log), OpenAPI/Swagger-документация.

## Структура репозитория

```
kanban-board/
├── backend/            # Express + Prisma API
│   ├── prisma/         # схема, миграции, seed
│   ├── src/            # исходный код
│   └── tests/          # Jest: unit + integration
├── frontend/           # React + Vite SPA
│   ├── src/            # исходный код
│   └── e2e/            # Playwright тесты
├── load-tests/         # k6 сценарии
├── docs/               # документация (стек, тест-план, тест-кейсы, архитектура)
├── .github/workflows/  # CI/CD
└── docker-compose.yml
```

## Быстрый старт (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000/api
- Swagger UI: http://localhost:4000/api/docs

При первом запуске автоматически применяются миграции и создаются демо-данные.

## Локальный запуск

Требования: Node.js 22+, PostgreSQL 16/17, npm.

### 1. База данных

Создайте БД `kanban` и `kanban_test` в PostgreSQL.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env          # проверьте DATABASE_URL / TEST_DATABASE_URL
npx prisma migrate deploy
npm run seed
npm run dev                   # http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Vite проксирует `/api` на `http://localhost:4000`.

## Демо-учётные записи (seed)

| Email                  | Пароль       | Роль      |
| ---------------------- | ------------ | --------- |
| admin@kanban.local     | Admin123!    | ADMIN     |
| manager@kanban.local   | Manager123!  | MANAGER   |
| dev@kanban.local       | Dev12345!    | DEVELOPER |

## Тестирование

| Тип                | Команда                                     | Где         |
| ------------------ | ------------------------------------------- | ----------- |
| Unit + Integration | `cd backend && npm run test:coverage`       | backend     |
| E2E                | `cd frontend && npx playwright test`        | frontend    |
| Нагрузочное        | `k6 run load-tests/kanban-load.js`          | load-tests  |
| Линт/типы          | `npm run lint && npm run typecheck`         | обе части   |

Текущие результаты backend: **76 тестов, 9 сьютов**, покрытие строк **94.24 %** (порог 80 %).
E2E: **8 сценариев** (аутентификация + работа с доской). После прогона E2E тестовые данные
автоматически удаляются (`globalTeardown` → `cd backend && npm run cleanup:e2e`); вручную — той же командой.

План тестирования — [docs/TEST_PLAN.md](docs/TEST_PLAN.md), тест-кейсы — [docs/TEST_CASES.md](docs/TEST_CASES.md).

## API

OpenAPI-спецификация доступна по адресу `/api/openapi.json`, интерактивная документация — `/api/docs`.
Проверка состояния — `/api/health`.

## CI/CD

Пайплайн GitHub Actions (`.github/workflows/ci.yml`):

- **backend** — линт, типы, тесты с покрытием (сервис PostgreSQL).
- **frontend** — линт, типы, сборка.
- **e2e** — Playwright против поднятого приложения.
- **load-test** — k6 (ручной запуск).
- **security** — `npm audit` + OWASP ZAP baseline (ручной запуск).

Документация по разработке — в каталоге [docs/](docs/).
