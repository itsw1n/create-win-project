# Database: PostgreSQL

Used in: React + Spring Boot, Next.js + Spring Boot, Next.js + PostgreSQL combos.

---

## Core Rules
- Every table: id, created_at, updated_at — no exceptions
- Primary key: VARCHAR(36) UUID always
- Foreign keys: always define ON DELETE behavior explicitly
- Table names: snake_case, plural
- Column names: snake_case
- Never expose raw DB errors to API responses
- Migrations managed by Flyway (Spring Boot) or Prisma (Next.js)

---

## Standard Table Pattern
```sql
CREATE TABLE [name] (
  id          VARCHAR(36)  PRIMARY KEY,
  -- your columns here
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

## Foreign Key Patterns
```sql
-- CASCADE: delete child when parent is deleted
user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE

-- RESTRICT: block deletion if child exists
category_id VARCHAR(36) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT

-- SET NULL: nullify child reference when parent is deleted
assigned_to VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL
```

## Column Conventions
```sql
-- Strings
name        VARCHAR(255) NOT NULL
email       VARCHAR(255) NOT NULL UNIQUE
description TEXT                          -- unbounded text
slug        VARCHAR(100) NOT NULL UNIQUE

-- Numbers
price       NUMERIC(10, 2) NOT NULL       -- money
quantity    INTEGER NOT NULL DEFAULT 0
rating      SMALLINT CHECK (rating BETWEEN 1 AND 5)

-- Booleans
is_active   BOOLEAN NOT NULL DEFAULT TRUE

-- Timestamps
created_at  TIMESTAMP NOT NULL DEFAULT NOW()
updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
expires_at  TIMESTAMP NOT NULL

-- Enums (use VARCHAR with CHECK)
status      VARCHAR(50) NOT NULL DEFAULT 'PENDING'
            CHECK (status IN ('PENDING', 'ACTIVE', 'CANCELLED'))
role        VARCHAR(50) NOT NULL DEFAULT 'USER'
            CHECK (role IN ('USER', 'ADMIN', 'MODERATOR'))
```

---

## Baseline Schema
```sql
-- V1__create_users_table.sql
CREATE TABLE users (
  id          VARCHAR(36)  PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  name        VARCHAR(255),
  role        VARCHAR(50)  NOT NULL DEFAULT 'USER'
              CHECK (role IN ('USER', 'ADMIN')),
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- V2__create_refresh_tokens_table.sql
CREATE TABLE refresh_tokens (
  id          VARCHAR(36)  PRIMARY KEY,
  token       TEXT         NOT NULL UNIQUE,
  user_id     VARCHAR(36)  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

---

## Indexes
```sql
-- Add indexes on columns frequently used in WHERE / JOIN
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);

-- Composite index for common filter combinations
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

Add indexes in the same migration file as the table creation.

---

## Connecting Externally (Dev)
```
Host:     localhost
Port:     5432
Database: value of POSTGRES_DB in .env
User:     value of POSTGRES_USER in .env
Password: value of POSTGRES_PASSWORD in .env
```

Tools: TablePlus, DBeaver, DataGrip, psql

```bash
make db-shell     # open psql inside container
```

---

## Common Issues
```
Migration fails
  → Check naming: V{n}__description.sql (double underscore)
  → Check version: no gaps, no duplicates
  → Never edit an applied migration — create a new one

Backend fails to connect
  → DB may not be ready — wait then check: make logs-back
  → Verify DATABASE_URL matches credentials in .env

Port 5432 already in use
  → lsof -i :5432 to find conflict
  → Change port in docker-compose.yml
```

---

## Agent Rules
```
New table needed?
  → New migration file V{n}__create_[name]_table.sql
  → Always include id, created_at, updated_at
  → Always define ON DELETE on every foreign key
  → Add indexes on FK columns and commonly filtered columns

Schema change on existing table?
  → New migration: V{n}__add_[column]_to_[table].sql
  → NEVER edit an existing migration file

Enum-like column?
  → VARCHAR with CHECK constraint
  → NOT a PostgreSQL ENUM type (hard to alter later)

Money column?
  → NUMERIC(10, 2) always — never FLOAT or DOUBLE

After writing migration?
  → Run: make migrate
  → Verify in db-shell or external client
```
