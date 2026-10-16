# Zuratax Frontend

Рабочий интерфейс Zuratax на React, JavaScript и Vite.

## Локальный запуск

```bash
npm install
npm run dev
```

Frontend обращается к API по относительному пути `/api`. В режиме разработки Vite проксирует запросы на `https://zuraback`; адрес можно переопределить через `VITE_API_PROXY_TARGET`.

```bash
copy .env.example .env
```

## Продакшн: каталоги релизов

Рабочий код на сервере не обновляется через `git pull` поверх текущего каталога.
Каждый релиз получает чистые GitHub-checkout обоих репозиториев, отдельные PHP-зависимости
и фронт, собранный из зафиксированного коммита с `npm ci`.

- `/var/www/zuratax/releases/<release-id>/backend` и `frontend` — код релиза.
- `/var/www/zuratax/current` — активный релиз; `previous` — предыдущий.
- `/var/www/zuratax/shared` — постоянные `.env`, storage, вложения, отчёты и резервные копии.
- `/var/www/zuratax/deploy` — серверные инструменты из `scripts/deploy`.

После `git fetch origin` в обоих локальных репозиториях:

```bash
node scripts/deploy/prepare-release.mjs /path/to/zuraback
```

Команда выведет каталог с `frontend.tar.gz` и `release.json`. Передайте эти два файла
в отдельный закрытый каталог сервера, затем выполните:

```bash
/var/www/zuratax/deploy/server-release.sh prepare /tmp/path-to-artifact
/var/www/zuratax/deploy/server-release.sh check RELEASE_ID
/var/www/zuratax/deploy/server-release.sh activate RELEASE_ID
```

Подготовка ещё не переключает сайт. Активация сохраняет БД и предыдущий релиз, кратко
включает обслуживание, переключает `current`, перезапускает только обработчик Zuratax
и проверяет HTTP, файлы и службы. Старые статические ресурсы сохраняются для открытых вкладок.
Новые миграции разрешаются явно: `activate RELEASE_ID --migrate`; без этого флага
активация с неприменёнными миграциями запрещена. `migrate:fresh` здесь не используется.

```bash
/var/www/zuratax/deploy/server-release.sh rollback
/var/www/zuratax/deploy/artisan migrate:status
```

Откат переключает код, но не откатывает БД: совместимость миграций проверяется отдельно.
Для production Artisan используйте приведённую обёртку: она задаёт постоянные пути
`LARAVEL_STORAGE_PATH` и `REPORTS_ROOT`, как nginx и обработчик очереди.
Не удаляйте активный/предыдущий релиз и `shared`; автоматической очистки нет.
Шаблоны nginx и systemd в `scripts/deploy` рассчитаны на текущий сервер Zuratax;
для другой установки сначала настройте домен, пути и имя службы.

## Документация

- [Аутентификация](docs/AUTHENTICATION.md) — реализованный session-auth и отдельные контуры для агентов и интеграций.
- [Зоны ответственности и премирование](docs/COMPENSATION.md) — согласованная продуктовая модель и открытые вопросы.
- [Tasker](docs/TASKER.md) — задачи, чек-листы, подзадачи, связи и человекочитаемые ключи.
- [Промпт для Google Stitch](docs/STITCH_TASKER_PROMPT.md) — задание на компактный дизайн Tasker.
- [Telefront v2](TELEFRONT_V2_ARCHITECTURE.md) — исторический концепт прототипа; не является описанием текущей реализации Zuratax.
