# Laravel Migrations

## Development

Laravel migrations are the schema source of truth. Generate descriptive migrations,
review their SQL impact, test from an empty PostgreSQL database, and commit them with the
code that needs them. Never edit an already-deployed migration to change history.

## Production

Use reviewed `php artisan migrate --force` in a deployment job with concurrency control,
backups, monitoring, and a documented recovery path. Prefer expand/contract changes for
zero-downtime releases. Production reset/refresh commands are forbidden. Prefer a new
forward-fix migration after deployment; use `down()` only when rollback is verified safe.

