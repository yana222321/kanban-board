# Нагрузочные тесты (k6)

Скрипты нагрузочного тестирования REST API Kanban-доски.

## Предварительные условия

1. Запущен backend на `http://localhost:4000` с применёнными миграциями и seed-данными.
2. Установлен [k6](https://k6.io/docs/get-started/installation/).

Пример установки k6 на Windows:

```powershell
winget install grafana.k6
```

## Запуск

```powershell
# базовый прогон (smoke + нагрузка)
k6 run load-tests/kanban-load.js

# с переопределением параметров
k6 run -e BASE_URL=http://localhost:4000 -e EMAIL=manager@kanban.local -e PASSWORD=Manager123! load-tests/kanban-load.js
```

## Сценарии

| Сценарий | Executor      | Нагрузка                     | Назначение                     |
| -------- | ------------- | ---------------------------- | ------------------------------ |
| smoke    | constant-vus  | 1 VU, 10s                    | проверка работоспособности     |
| load     | ramping-vus   | 0 → 20 → 20 → 0 VU (60s)     | целевая нагрузка на чтение API |

## Пороги (thresholds)

| Метрика                             | Порог        |
| ----------------------------------- | ------------ |
| http_req_failed                     | rate < 1%    |
| http_req_duration{endpoint:api}     | p(95) < 800 ms |
| http_req_duration{endpoint:login}   | p(95) < 2000 ms |
| login_errors                        | rate < 1%    |
| board_latency                       | p(95) < 800 ms |

Пороги разделены по тегу `endpoint`: логин (bcrypt) — самый тяжёлый эндпоинт, поэтому у него отдельный, более мягкий лимит.

Прогон считается успешным, если все пороги выполнены (k6 завершается с кодом 0).
