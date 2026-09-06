# SQLAlchemy and Alembic

## Session Ownership

Use SQLAlchemy 2 async sessions with `asyncpg`. Services own session and transaction
boundaries spanning multiple writes or read-modify-write behavior. Routers never manage
sessions directly; they receive a session dependency from shared core infrastructure.

Database unique/check/foreign-key constraints are the final concurrency boundary; map
expected constraint conflicts to stable application errors.

## Migrations

Alembic owns all schema changes. Generate revisions explicitly and apply them with
`alembic upgrade head` from the backend directory. Application startup must not
automatically migrate production databases. Verify migration configuration and upgrade
checks in CI before container builds.
