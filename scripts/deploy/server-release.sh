#!/usr/bin/env bash
set -euo pipefail
umask 022
root=/var/www/zuratax
tools=$(cd "$(dirname "$0")" && pwd -P)
export LARAVEL_STORAGE_PATH="$root/shared/storage"
export REPORTS_ROOT="$root/shared/reports"
mode=${1:-help}
test "$(readlink -f "$root")" = /var/www/zuratax

usage() {
    printf 'prepare ARTIFACT_DIR | check RELEASE_ID | activate RELEASE_ID [--migrate] | rollback\n'
}
valid_release() {
    if ! [[ "$1" =~ ^[0-9]{8}-[a-f0-9]{7}-[a-f0-9]{7}$ ]] && ! { [ "$mode" = rollback ] && [[ "$1" =~ ^legacy-[0-9]{8}$ ]]; }; then
        echo 'Invalid release id' >&2; exit 2
    fi
    target="$root/releases/$1"
    test "$(readlink -f "$target")" = "$target"
    test -s "$target/release.json"
}

if [ "$mode" = prepare ]; then
    packet=$(readlink -f "${2:?Artifact directory required}")
    test -d "$packet"
    python3 "$tools/read-artifact.py" "$packet" > "$packet/validated-meta"
    mapfile -t meta < "$packet/validated-meta"
    id=${meta[0]}
    target="$root/releases/$id"
    test -d "$root/shared/storage"
    test -r "$root/shared/.env"
    mkdir -p "$root/releases" "$target"
    test ! -f "$target/release.json"
    for kind in frontend backend; do
        if [ "$kind" = frontend ]; then origin=${meta[1]}; sha=${meta[2]}; else origin=${meta[3]}; sha=${meta[4]}; fi
        repo="$target/$kind"
        if [ ! -d "$repo/.git" ]; then
            git init -q "$repo"
            git -C "$repo" remote add origin "$origin"
            timeout 180 git -C "$repo" fetch --depth=1 origin "$sha"
            git -C "$repo" checkout --detach FETCH_HEAD
        fi
        test "$(git -C "$repo" rev-parse HEAD)" = "$sha"
        test -z "$(git -C "$repo" status --porcelain)"
    done
    mkdir -p "$target/frontend/dist/avatars"
    if [ -d "$target/frontend/public/avatars" ]; then cp -a "$target/frontend/public/avatars/." "$target/frontend/dist/avatars/"; fi
    tar -xzf "$packet/frontend.tar.gz" -C "$target/frontend/dist" --no-same-owner
    if [ -L "$root/current" ]; then
        old=$(readlink -f "$root/current")
    else
        old="$root"
    fi
    for directory in assets avatars vendor; do
        if [ -d "$old/frontend/dist/$directory" ]; then
            mkdir -p "$target/frontend/dist/$directory"
            rsync -a --ignore-existing "$old/frontend/dist/$directory/" "$target/frontend/dist/$directory/"
        fi
    done
    ln -s "$root/shared/.env" "$target/backend/.env"
    ln -s "$root/shared/storage/app/public" "$target/backend/public/storage"
    cd "$target/backend"
    COMPOSER_ALLOW_SUPERUSER=1 composer install --no-dev --prefer-dist --no-scripts --no-interaction --no-progress --optimize-autoloader
    chgrp -R www-data bootstrap/cache
    chmod 2770 bootstrap/cache
    (umask 0027; php artisan package:discover --no-interaction; php artisan config:cache --no-interaction; php artisan route:cache --no-interaction)
    chgrp -R www-data bootstrap/cache
    chmod -R g+rX bootstrap/cache
    install -m 644 "$packet/release.json" "$target/release.json"
    python3 "$tools/check-release.py" prepared "$target"
    sudo -u www-data env LARAVEL_STORAGE_PATH="$LARAVEL_STORAGE_PATH" REPORTS_ROOT="$REPORTS_ROOT" php "$tools/runtime-check.php" "$target/backend"
    printf 'RELEASE_PREPARED %s\n' "$id"
elif [ "$mode" = check ]; then
    valid_release "${2:?Release id required}"
    python3 "$tools/check-release.py" prepared "$target"
    sudo -u www-data env LARAVEL_STORAGE_PATH="$LARAVEL_STORAGE_PATH" REPORTS_ROOT="$REPORTS_ROOT" php "$tools/runtime-check.php" "$target/backend"
elif [ "$mode" = activate ] || [ "$mode" = rollback ]; then
    test -L "$root/current"
    if [ "$mode" = rollback ]; then
        test -L "$root/previous"
        valid_release "$(basename "$(readlink -f "$root/previous")")"
    else
        valid_release "${2:?Release id required}"
    fi
    exec 9>"$root/deploy/deploy.lock"
    flock -n 9 || { echo 'Another deployment is active' >&2; exit 2; }
    old=$(readlink -f "$root/current")
    test "$old" != "$target"
    python3 "$tools/check-release.py" prepared "$target"
    if [ "${3:-}" != --migrate ]; then php "$tools/runtime-check.php" "$target/backend" --no-pending; fi
    backup=$(mktemp -d "$root/shared/deploy-backups/release-$(basename "$target")-XXXXXX")
    chmod 700 "$backup"
    (umask 077; mariadb-dump --single-transaction --quick --routines --triggers zuratax | gzip > "$backup/database.sql.gz"; cp -a "$root/shared/.env" "$backup/environment.env"; readlink "$root/current" > "$backup/previous-current"; cp -a "$root/shared/current-release.json" "$backup/previous-release.json")
    gzip -t "$backup/database.sql.gz"
    restore() {
        result=$?
        trap - EXIT
        if [ "$result" -ne 0 ]; then
            ln -s "$old" "$root/current.recover"
            mv -fT "$root/current.recover" "$root/current"
            php "$old/backend/artisan" up --no-interaction || true
            systemctl reload php8.4-fpm || true
            systemctl restart zuratax-filer-preview.service || true
            echo 'Deployment failed; previous code restored, database not rolled back.' >&2
        fi
        exit "$result"
    }
    trap restore EXIT
    php "$old/backend/artisan" down --retry=5 --no-interaction
    systemctl stop zuratax-filer-preview.service
    if [ "${3:-}" = --migrate ]; then php "$target/backend/artisan" migrate --force --no-interaction; fi
    ln -s "$target" "$root/current.next"
    mv -fT "$root/current.next" "$root/current"
    systemctl reload php8.4-fpm
    systemctl restart zuratax-filer-preview.service
    php "$target/backend/artisan" up --no-interaction
    python3 "$tools/check-release.py" live "$target"
    ln -s "$old" "$root/previous.next"
    mv -fT "$root/previous.next" "$root/previous"
    python3 "$tools/check-release.py" receipt "$target" > "$root/shared/current-release.json.next"
    chmod 640 "$root/shared/current-release.json.next"
    chgrp www-data "$root/shared/current-release.json.next"
    mv -fT "$root/shared/current-release.json.next" "$root/shared/current-release.json"
    trap - EXIT
    printf 'RELEASE_ACTIVATED %s; backup=%s\n' "$(basename "$target")" "$backup"
else
    usage
    test "$mode" = help
fi
