# Zuratax Frontend

Рабочий интерфейс Zuratax на React, TypeScript и Vite.

## Локальный запуск

```bash
npm install
npm run dev
```

Frontend обращается к API по относительному пути `/api`. В режиме разработки Vite проксирует запросы на `https://zuraback`; адрес можно переопределить через `VITE_API_PROXY_TARGET`.

```bash
copy .env.example .env
```

## Документация

- [Аутентификация](docs/AUTHENTICATION.md) — реализованный session-auth и отдельные контуры для агентов и интеграций.
- [Зоны ответственности и премирование](docs/COMPENSATION.md) — согласованная продуктовая модель и открытые вопросы.
- [Tasker](docs/TASKER.md) — задачи, чек-листы, подзадачи, связи и человекочитаемые ключи.
- [Промпт для Google Stitch](docs/STITCH_TASKER_PROMPT.md) — задание на компактный дизайн Tasker.
- [Telefront v2](TELEFRONT_V2_ARCHITECTURE.md) — исторический концепт прототипа; не является описанием текущей реализации Zuratax.
