# Аутентификация Zuratax

> Статус: браузерный контур реализован 2026-08-25.

## Разделение акторов

Zuratax не использует один механизм авторизации для всех клиентов:

| Клиент | Механизм | Статус |
|---|---|---|
| Браузерный frontend | Laravel database session в HttpOnly cookie | Реализовано |
| AI-агенты | Отзываемые bearer-токены Laravel Sanctum | Запланировано |
| Внешние системы, включая СКУД | Отдельные integration credentials / HMAC | Запланировано |

## Браузерная сессия

Frontend отправляет запросы с `credentials: include` и обязательным заголовком:

```http
X-App-Request: Zuratax
Accept: application/json
```

Изменяющие запросы принимаются только как JSON. Backend отклоняет cross-site запросы и проверяет `Origin` по allowlist. Cookie имеет `HttpOnly` и `SameSite=Strict`.

CSRF-token handshake намеренно не используется. Вместо него применяются совместно:

- строгий `SameSite`;
- allowlist источников;
- запрет `Sec-Fetch-Site: cross-site`;
- обязательный нестандартный заголовок приложения;
- JSON-only для изменяющих запросов.

Это единый защитный контракт: нельзя отключать отдельные проверки без пересмотра всей модели угроз.

## Маршруты

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

Вход поддерживает email или уникальный `username`. После успешного входа идентификатор сессии регенерируется. Logout инвалидирует серверную сессию.

У пользователя есть `is_active`. Неактивный пользователь не может войти; существующая сессия перестаёт давать доступ при следующем авторизованном запросе.

Login ограничен rate limiter: пять попыток в минуту на сочетание идентификатора и IP.

## Локальная разработка

Frontend использует `/api`, а Vite проксирует его на:

```text
https://zuraback
```

Самоподписанный локальный сертификат разрешён только на уровне dev-прокси (`secure: false`). Production-конфигурация не должна наследовать это послабление.

## Стартовый пользователь

`Database\Seeders\StarterSeeder` запускается отдельно и не входит автоматически в `DatabaseSeeder`:

```bash
php artisan db:seed --class=StarterSeeder
```

Перед запуском должны быть заданы:

```text
STARTER_USER_NAME
STARTER_USER_USERNAME
STARTER_USER_EMAIL
STARTER_USER_PASSWORD
```

Пароль не хранится в репозитории.
