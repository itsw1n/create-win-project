FROM {{NODE_IMAGE}} AS assets
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

FROM {{COMPOSER_IMAGE}} AS composer

FROM {{PHP_IMAGE}} AS production
RUN apk add --no-cache libpq-dev && docker-php-ext-install pdo_pgsql
WORKDIR /app
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
COPY . .
COPY --from=assets /app/public/build ./public/build
RUN composer dump-autoload --classmap-authoritative
USER www-data
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
