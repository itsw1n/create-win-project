FROM {{COMPOSER_IMAGE}} AS composer

FROM {{PHP_IMAGE}} AS production
RUN docker-php-ext-install pdo_pgsql
WORKDIR /app
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY composer.json ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-scripts
COPY . .
RUN composer dump-autoload --classmap-authoritative
USER www-data
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
