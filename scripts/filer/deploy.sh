#!/bin/sh
set -eu
release=/tmp/zuratax-filer-release-20260922
backend=/var/www/zuratax/backend
cd "$backend"
patch --dry-run -p0 < "$release/scripts/filer/deploy.patch"
umask 077
tar -czf /var/www/zuratax/shared/deploy-backups/before-filer-20260922.tar.gz -C /var/www/zuratax frontend/dist backend/routes/web.php backend/config/filesystems.php backend/app/Http/Middleware/EnsureSpaRequestIsTrusted.php backend/.env
tar -xzf /tmp/zuratax-back-filer-20260922.tar.gz -C "$backend"
patch -p0 < "$release/scripts/filer/deploy.patch"
install -d -o www-data -g www-data -m 750 /var/www/zuratax/shared/filer
if ! grep -q '^FILER_ROOT=' .env; then
    printf '\nFILER_ROOT=/var/www/zuratax/shared/filer\n' >> .env
fi
php artisan config:clear --no-interaction
php artisan migrate --path=database/migrations/2026_09_22_100311_create_filer_tables.php --force --no-interaction
php artisan route:list --path=files --no-ansi
systemctl reload php8.4-fpm
cp -a "$release/dist/assets/." /var/www/zuratax/frontend/dist/assets/
install -m 644 "$release/dist/index.html" /var/www/zuratax/frontend/dist/index.html
echo FILER_DEPLOY_OK
