FROM {{NODE_IMAGE}} AS assets
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY resources ./resources
COPY vite.config.js ./
RUN npm run build

FROM {{COMPOSER_IMAGE}} AS composer

FROM {{PHP_IMAGE}}
RUN apk add --no-cache libpq-dev && docker-php-ext-install pdo_pgsql
WORKDIR /app
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY composer.json ./
RUN composer install --no-interaction --prefer-dist --no-scripts
COPY . .
COPY --from=assets /app/public/build ./public/build
RUN composer dump-autoload --optimize
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
