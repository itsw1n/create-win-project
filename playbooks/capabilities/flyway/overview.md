# Flyway Capability

Used with: Spring Boot + PostgreSQL

## Rules
- NEVER edit a migration file after it has been applied
- To change schema: create a new migration file with the next version number
- Dev seed data lives in db/dev/ — NEVER in db/migration/
- Migration files live in: backend/src/main/resources/db/migration/
- Seed files live in: backend/src/main/resources/db/dev/

## File Naming
```
V{n}__{description}.sql

V1__create_users_table.sql
V2__create_refresh_tokens_table.sql
V3__add_role_column_to_users.sql
V4__create_orders_table.sql
```

Rules:
- Double underscore between version and description
- Description: snake_case, lowercase
- Version: sequential integer, no gaps
- Never reuse a version number

## Schema Conventions
- Table names: snake_case, plural (users, refresh_tokens, orders)
- Column names: snake_case (created_at, user_id, expires_at)
- Primary key: VARCHAR(36) UUID on every table
- Every table: id, created_at, updated_at
- Foreign keys: always define ON DELETE behavior explicitly

## Standard Table Pattern
```sql
CREATE TABLE [name] (
  id          VARCHAR(36)  PRIMARY KEY,
  -- your columns here
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## Foreign Key Pattern
```sql
-- Always define ON DELETE behavior
user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- Use RESTRICT when deletion should be blocked
category_id VARCHAR(36) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT
```

## Initial Schema (Baseline)
```sql
-- V1__create_users_table.sql
CREATE TABLE users (
  id          VARCHAR(36)  PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  role        VARCHAR(50)  NOT NULL DEFAULT 'USER',
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- V2__create_refresh_tokens_table.sql
CREATE TABLE refresh_tokens (
  id          VARCHAR(36)  PRIMARY KEY,
  token_hash  VARCHAR(255) NOT NULL UNIQUE,
  family_id   VARCHAR(36)  NOT NULL,
  user_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMP    NOT NULL,
  used_at     TIMESTAMP,
  revoked_at  TIMESTAMP,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

Never store a raw refresh token. Rotate tokens atomically, and revoke the token
family when an already-used token is presented. Prefer server-managed sessions
or a maintained identity provider unless bearer refresh tokens are an explicit
architecture requirement.

## Spring Boot Config
```yaml
# application.yml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: false

# application-test.yml
spring:
  flyway:
    enabled: true
    locations: classpath:db/migration
    # Dev seeds excluded from test runs
```

## Commands
```bash
make migrate      # Apply pending migrations
make seed         # Load dev seed data
make db-reset     # Drop + migrate + seed (full fresh slate)
make db-shell     # Open psql shell for manual inspection
```

## Spring Boot Profiles
| Profile | Migration runs | Seed data loaded |
|---------|---------------|-----------------|
| dev     | Yes           | Yes (manually via make seed) |
| test    | Yes           | No              |
| prod    | Yes           | No              |

## CI Behavior
- CI uses real PostgreSQL service container (never H2)
- SPRING_PROFILES_ACTIVE=test in CI
- Migrations run automatically before tests
- Seed data never runs in CI

## Agent Rules
```
Schema change needed?
  → Create new migration: V{n}__description.sql
  → NEVER edit existing migration
  → Run: make migrate

New table?
  → Always include id, created_at, updated_at
  → Always define ON DELETE on foreign keys

Migration failed?
  → Check naming: V{n}__description.sql (double underscore)
  → Check version: no gaps, no duplicates
  → Check SQL syntax in psql shell: make db-shell

Dev data needed?
  → Add to db/dev/ seed files
  → NEVER add to db/migration/
```
