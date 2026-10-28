#!/bin/sh
set -e

DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_WAIT_SECONDS="${DB_WAIT_SECONDS:-60}"
DB_USERNAME="${DB_USERNAME:-argos}"
DB_PASSWORD="${DB_PASSWORD:-argos}"

wait_for_db() {
  echo "Waiting for MariaDB at ${DB_HOST}:${DB_PORT}..."
  i=0
  while [ "$i" -lt "$DB_WAIT_SECONDS" ]; do
    if php -r "try { new PDO('mysql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [PDO::ATTR_TIMEOUT => 2]); exit(0); } catch (Throwable \$e) { exit(1); }"; then
      echo "MariaDB is ready."
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  echo "Timed out waiting for MariaDB." >&2
  exit 1
}

export DB_HOST DB_PORT DB_USERNAME DB_PASSWORD

if [ "${WAIT_FOR_DB:-1}" = "1" ]; then
  wait_for_db
fi

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  echo "Running migrations..."
  php artisan migrate --force --no-interaction
fi

if [ "${RUN_SEED:-0}" = "1" ]; then
  echo "Running database seeders..."
  php artisan db:seed --force --no-interaction
fi

exec "$@"
