# Migration: Supabase CLI

Used with: Next.js + Supabase, React + Supabase combos.

---

## Core Rules
- NEVER edit migration files after they are applied
- To change schema: create a new migration file
- Migrations live in: supabase/migrations/
- Enable RLS in the same migration that creates the table
- Add RLS policies in the same migration as RLS enablement
- Run migrations locally before pushing to remote

---

## Setup
```bash
# Install Supabase CLI
npm install supabase --save-dev

# Initialize (creates supabase/ folder)
npx supabase init

# Link to remote project
npx supabase link --project-ref [project-ref]

# Start local Supabase stack
npx supabase start
```

Local services after `supabase start`:
```
API:      http://localhost:54321
Studio:   http://localhost:54323
DB:       postgresql://postgres:postgres@localhost:5432/postgres
```

---

## Migration Commands
```bash
# Create new migration file
npx supabase migration new [name]
# → creates supabase/migrations/[timestamp]_[name].sql

# Apply locally (reset + re-run all migrations)
npx supabase db reset

# Push to remote Supabase project
npx supabase db push

# Pull schema from remote (for existing projects)
npx supabase db pull

# Check migration status
npx supabase migration list

# Stop local stack
npx supabase stop
```

---

## Migration File Pattern
```
supabase/migrations/
  20240101000000_create_users_table.sql
  20240101000001_create_posts_table.sql
  20240102000000_add_avatar_to_users.sql
```

Naming: `[timestamp]_[description].sql`
- Generated automatically by `supabase migration new`
- Description: snake_case, lowercase

---

## Standard Migration Template
```sql
-- supabase/migrations/[timestamp]_create_[name]_table.sql

-- Create table
CREATE TABLE [name] (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- your columns
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Enable RLS (always in same migration as table creation)
ALTER TABLE [name] ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own rows"
  ON [name] FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rows"
  ON [name] FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rows"
  ON [name] FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rows"
  ON [name] FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER [name]_updated_at
  BEFORE UPDATE ON [name]
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX idx_[name]_user_id ON [name](user_id);
```

---

## Supabase-Specific Column Types
```sql
-- Use UUID (not VARCHAR(36))
id      UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id)

-- Use TIMESTAMPTZ (not TIMESTAMP) — stores timezone
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- Text for unbounded strings (PostgreSQL TEXT is efficient)
content TEXT

-- JSONB for flexible structured data
metadata JSONB DEFAULT '{}'
```

---

## Referencing Auth Users
```sql
-- Reference Supabase Auth users table
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

Never create a separate `users` table for auth — use `auth.users`.
Create a `profiles` table for additional user data:

```sql
-- supabase/migrations/[timestamp]_create_profiles_table.sql
CREATE TABLE profiles (
  id          UUID         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Type Generation
```bash
# After any schema change, regenerate types
npx supabase gen types typescript \
  --project-id [project-ref] \
  > src/types/database.types.ts

# Or from local
npx supabase gen types typescript \
  --local \
  > src/types/database.types.ts
```

---

## Seeding
```sql
-- supabase/seed.sql
-- Loaded automatically on: npx supabase db reset

INSERT INTO profiles (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Test User');
```

---

## Local vs Remote Workflow
```
Development:
  1. npx supabase migration new [name]
  2. Write SQL in the new migration file
  3. npx supabase db reset   (apply locally)
  4. Test locally
  5. npx supabase db push    (push to remote)
  6. npx supabase gen types  (regenerate types)
  7. Commit migration file + updated types

Production:
  → npx supabase db push (applies pending migrations to remote)
  → Never run db reset in production
```

---

## Agent Rules
```
New table needed?
  → npx supabase migration new create_[name]_table
  → Use UUID PRIMARY KEY DEFAULT gen_random_uuid()
  → Use TIMESTAMPTZ not TIMESTAMP
  → Reference auth.users not a custom users table
  → Enable RLS in same migration
  → Add all 4 policies (SELECT/INSERT/UPDATE/DELETE) in same migration
  → Add index on user_id and commonly filtered columns

Schema change on existing table?
  → New migration: npx supabase migration new add_[column]_to_[name]
  → NEVER edit existing migration files

After any schema change?
  → npx supabase db reset (local)
  → npx supabase gen types typescript ... (regenerate types)
  → npx supabase db push (remote)

User profile data?
  → profiles table referencing auth.users(id)
  → Auto-create via trigger on auth.users INSERT
  → Never duplicate auth fields (email, created_at) — read from auth.users

Bypass RLS for admin operation?
  → Use adminClient (service role) from lib/supabase/admin.ts
  → Server only — never in client components
```
