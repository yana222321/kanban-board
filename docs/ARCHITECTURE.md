# Архитектура

## 1. Общая схема

```
┌──────────────┐        HTTP/JSON (/api)        ┌───────────────────────────┐
│   Browser    │  ───────────────────────────▶  │        Backend            │
│  React SPA   │  ◀───────────────────────────  │  Express + Prisma (REST)  │
│  (Vite/MUI)  │                                │                           │
└──────┬───────┘                                └────────────┬──────────────┘
       │                                                      │ Prisma Client
       │ (dev) Vite proxy /api → :4000                        ▼
       │ (prod) nginx proxy /api → backend:4000        ┌──────────────┐
                                                        │  PostgreSQL  │
                                                        └──────────────┘
```

- Frontend — SPA, общается с backend только по REST через `/api`.
- В dev-режиме проксирует Vite, в production — nginx.
- Backend не хранит состояния (stateless), аутентификация по JWT.

## 2. Слои backend

```
routes  →  controller  →  service  →  Prisma  →  PostgreSQL
             │              │
             │              └─ бизнес-логика, проверки прав, транзакции
             └─ валидация (Zod), вызов service
middleware: authenticate, authorize, validate, upload, errorHandler
```

| Каталог            | Назначение                                              |
| ------------------ | ------------------------------------------------------- |
| `src/config`       | конфигурация окружения, клиент Prisma                   |
| `src/middleware`   | auth (JWT), validate (Zod), upload (multer), errorHandler |
| `src/modules/*`    | auth, users, projects, boards, cards (schemas/service/controller/routes) |
| `src/services`     | permissions, activity (лог действий)                    |
| `src/utils`        | errors, jwt, password, asyncHandler, params             |
| `src/docs`         | OpenAPI/Swagger                                         |

## 3. Модель данных

```
User ──┬──< ProjectMember >── Project ──┬──< Board ──< Column ──< Card ──┬──< Comment
       │                                │                                ├──< Attachment
       │                                └──< Label >──(Card_Label)        └──< ActivityLog
       └── (ownerId) Project
```

Основные сущности:

| Сущность       | Ключевые поля                                                        |
| -------------- | -------------------------------------------------------------------- |
| `User`         | email (uniq), name, passwordHash, role (ADMIN/MANAGER/DEVELOPER)     |
| `Project`      | name, key (uniq), description, ownerId                               |
| `ProjectMember`| projectId, userId, role (MANAGER/DEVELOPER/VIEWER)                    |
| `Board`        | projectId, name                                                      |
| `Column`       | boardId, name, position, wipLimit                                    |
| `Card`         | columnId, title, description, priority, position, dueDate, assigneeId, createdById |
| `Label`        | projectId, name, color                                               |
| `Comment`      | cardId, authorId, body                                               |
| `Attachment`   | cardId, filename, path, size                                         |
| `ActivityLog`  | entity, entityId, action, field, userId                              |

Ограничения: `Column (boardId, position)`, `Card (columnId, position)`, уникальность `Card.key` не требуется — идентификация по UUID.

## 4. Аутентификация и авторизация

- **Аутентификация:** email + пароль → bcrypt-проверка → выдача пары токенов (access 1 ч, refresh 7 дней). Access-токен передаётся в заголовке `Authorization: Bearer`.
- **Глобальные роли:** `ADMIN`, `MANAGER`, `DEVELOPER`.
- **Проектные роли:** `MANAGER`, `DEVELOPER`, `VIEWER` (участники проекта), плюс владелец проекта (OWNER).
- **Уровень доступа** определяется функцией `getProjectAccess`:
  - `canManage` — ADMIN, OWNER, MANAGER;
  - `canContribute` — ADMIN, OWNER, MANAGER, DEVELOPER;
  - VIEWER — только чтение.
- Создание/редактирование сущностей ограничено middleware `authenticate` + `authorize` и проверками уровня доступа в сервисах.

## 5. Основные REST-эндпоинты

| Метод и путь                                       | Назначение                          |
| -------------------------------------------------- | ----------------------------------- |
| `POST /api/auth/register`                          | регистрация                         |
| `POST /api/auth/login`                             | вход                                |
| `POST /api/auth/refresh`                           | обновление access-токена            |
| `GET  /api/auth/me`                                | текущий пользователь                |
| `GET  /api/users`                                  | список пользователей                |
| `GET/POST /api/projects`                           | список / создание проектов          |
| `GET/PATCH/DELETE /api/projects/:id`               | чтение / изменение / удаление        |
| `GET/POST /api/projects/:id/members`               | участники проекта                   |
| `GET/POST /api/projects/:id/labels`                | метки проекта                       |
| `GET/POST /api/projects/:id/boards`                | доски проекта                       |
| `GET /api/boards/:id`                              | доска с колонками и карточками       |
| `POST /api/boards/:id/columns`                     | создание колонки                    |
| `PATCH/DELETE /api/columns/:id`                    | изменение / удаление колонки         |
| `PATCH /api/boards/:id/columns/reorder`            | порядок колонок                     |
| `GET /api/boards/:id/cards`                        | карточки доски (с фильтрами)         |
| `POST /api/columns/:id/cards`                      | создание карточки                   |
| `PATCH/DELETE /api/cards/:id`                      | изменение / удаление карточки         |
| `PATCH /api/cards/:id/move`                        | перемещение (с проверкой WIP)        |
| `GET/POST /api/cards/:id/comments`                 | комментарии                         |
| `GET/POST /api/cards/:id/attachments`              | вложения                            |
| `GET /api/cards/:id/history`                       | история изменений                   |
| `GET /api/health`, `GET /api/openapi.json`, `/api/docs` | служебные                        |

## 6. Frontend

```
src/
├── api/            # axios-клиент (JWT-интерцептор) + обёртки над API
├── store/          # Redux Toolkit: authSlice, hooks
├── components/     # Layout, ProtectedRoute, board/* (ColumnView, DraggableCard, CardDialog)
├── pages/          # Login, Register, Projects, Board
├── theme.ts, types.ts, App.tsx, main.tsx
```

- Маршрутизация — React Router; защищённые маршруты через `ProtectedRoute`.
- Состояние — Redux Toolkit (аутентификация); локальное состояние компонентов для доски.
- Drag & drop — dnd-kit (`DndContext`, `useDraggable`, `useDroppable`); при `dragEnd` вызывается `PATCH /cards/:id/move`.
- Обработка ошибок — централизованный `apiErrorMessage`.

## 7. Обработка ошибок

- Единый формат ответа об ошибке: `{ "error": { "message": string, "details"?: [...] } }`.
- `AppError` для ожидаемых ошибок; `errorHandler` преобразует ошибки Prisma (`P2002`, `P2025`) и прочие в корректные HTTP-коды.
- `asyncHandler` оборачивает асинхронные обработчики, исключая необработанные промисы.
