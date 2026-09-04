# Prisma Migrations

## Development

Use `prisma migrate dev` only against disposable development data, review generated SQL, and commit
the schema and migration together. Never rewrite an applied migration.

## Production

Use `prisma migrate deploy` in one controlled release job. Never run `migrate reset` or development
migration commands against production. Use expand/contract changes and forward fixes.
