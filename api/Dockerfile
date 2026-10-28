# syntax=docker/dockerfile:1

FROM php:8.4-cli-bookworm AS base

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y --no-install-recommends \
      git \
      unzip \
      libzip-dev \
      libicu-dev \
      libpng-dev \
      libonig-dev \
    && docker-php-ext-install -j"$(nproc)" \
      pdo_mysql \
      mbstring \
      exif \
      pcntl \
      bcmath \
      zip \
      intl \
      sockets \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

FROM base AS vendor
COPY --link composer.json composer.lock ./
RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install \
      --no-dev \
      --no-scripts \
      --no-autoloader \
      --prefer-dist \
      --no-interaction

FROM base AS runtime
COPY --link --from=vendor /var/www/html/vendor ./vendor
COPY --link . .

RUN --mount=type=cache,target=/tmp/composer-cache \
    COMPOSER_CACHE_DIR=/tmp/composer-cache \
    composer install \
      --no-dev \
      --prefer-dist \
      --no-interaction \
      --optimize-autoloader \
    && mkdir -p \
      storage/framework/cache/data \
      storage/framework/sessions \
      storage/framework/views \
      storage/logs \
      bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/entrypoint.sh

COPY --link docker/entrypoint.sh /usr/local/bin/argos-entrypoint
RUN chmod +x /usr/local/bin/argos-entrypoint

USER www-data

EXPOSE 8000 8080

ENTRYPOINT ["argos-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
