# Database: Supabase

Used in: Next.js + Supabase, React + Supabase combos.

---

## Core Rules
- Local development and production are separate environments — never treat them as the same database
- Git branch does NOT decide which Supabase environment is used
- `make dev` / local app startup must use local Supabase on every branch, including `main`
- RLS (Row Level Security) enabled on every table/view exposed through the Supabase Data API
- Publishable key: safe for browser/client use when RLS is enforced
- Secret key: server-only, bypasses RLS, NEVER expose to client code or prefix with `NEXT_PUBLIC_`
- Legacy `anon` / `service_role` keys may still exist, but prefer publishable / secret keys for new work
- Never bypass RLS from client components
- Use normal authenticated clients + RLS for user/admin application flows
- Use a secret/admin client only for trusted system operations that intentionally require RLS bypass
- Project convention: use Supabase Auth unless architecture explicitly requires another provider
- Use `@supabase/ssr` for Next.js cookie-based auth
- Never trust `getSession()` alone for server-side authorization
- Use migrations as the source of truth for schema changes
- Development seed data must never be pushed into production
- Production database reset commands are forbidden

---

## Environment Model

```text
Git flow:
feature/* / fix/*
        ↓
       dev
        ↓
      main
        ↓
   release tag

Database environments:
Local machine          → Local Supabase
Production deployment  → Hosted Supabase
```

Important:

```text
feature branch + make dev → LOCAL Supabase
dev branch     + make dev → LOCAL Supabase
main branch    + make dev → LOCAL Supabase
```

Production credentials belong to the deployment environment, not to the Git branch.

There is no staging environment unless the project explicitly adds one later.

---

## Local Development

Local Supabase runs on the developer machine through the Supabase CLI + Docker-compatible runtime.

Typical local endpoints:

```text
API:     http://127.0.0.1:54321
DB:      postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio:  http://127.0.0.1:54323
```

Always use the actual values reported by:

```bash
npx supabase status
```

Start local Supabase:

```bash
npx supabase start
```

Stop local Supabase:

```bash
npx supabase stop
```

Open local Studio using the Studio URL returned by `supabase status`.

---

## Production Environment

Production uses the hosted Supabase project.

Production environment variables must be configured through the deployment platform / hosting provider.

Do NOT store production secrets in committed files.

Do NOT make local development automatically connect to production because the current branch is `main`.

Production rules:

```text
Real data              → production only
Development seed data  → never production
Database reset         → forbidden
Schema changes         → migrations only
Secrets                → deployment/server environment only
```

---

## Environment Variables

### Local `.env.local`

Use the variables already expected by the project. For a current Next.js setup:

```bash
# Public — safe in browser/client code
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local-publishable-key>

# Private — server only, only if trusted RLS-bypass operations are required
SUPABASE_SECRET_KEY=<local-secret-key>
```

Get local values from:

```bash
npx supabase status
```

### Production Environment Variables

Configured in the deployment platform:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
```

Rules:
- `.env.local` must be ignored by Git
- `.env.example` contains variable names/placeholders only
- Never commit `SUPABASE_SECRET_KEY`
- Never expose secret/service-role credentials to browser code
- If the existing project still uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`, migrate intentionally; do not silently rename variables without updating application code and deployment configuration

---

## Supabase Project Directory

Expected local project structure:

```text
supabase/
├── config.toml       # local stack configuration — commit
├── migrations/       # ordered schema migrations — commit
├── seed.sql          # optional dev/test data — commit
├── .temp/            # CLI internal state — ignore
└── .branches/        # CLI internal state — ignore
```

Git rules:

```gitignore
supabase/.temp/
supabase/.branches/
```

`config.toml` is normally safe to commit. If it needs sensitive values, reference environment variables rather than hardcoding secrets.

---

## Client Setup (Next.js + @supabase/ssr)

### lib/supabase/client.ts — Browser Client

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### lib/supabase/server.ts — Server Client

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components may be unable to write cookies directly.
            // Session refresh is handled by the Next.js Proxy setup.
          }
        },
      },
    }
  )
}
```

### lib/supabase/admin.ts — Trusted System Client (Server Only)

```typescript
import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// RLS BYPASS — use only for trusted backend/system operations.
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

Do NOT use the admin client simply because the logged-in user has an `ADMIN` role. Prefer the authenticated server client + RLS policies for normal admin UI/application behavior.

---

## Next.js Auth Proxy

Server Components cannot reliably refresh auth cookies themselves. A Next.js Proxy should refresh the Supabase auth token and synchronize cookies.

Project shape:

```text
proxy.ts
lib/supabase/proxy.ts
lib/supabase/client.ts
lib/supabase/server.ts
```

Auth rules:
- Use `supabase.auth.getClaims()` to protect pages and user data
- Use `getUser()` when the latest user record from Supabase Auth is specifically needed
- Use `getSession()` only when raw session/token data is needed
- Never rely on the user object from `getSession()` alone for server authorization
- Keep cookie refresh logic centralized in Proxy

---

## Which Client to Use

```text
Client component       → lib/supabase/client.ts    (publishable key)
Server component       → lib/supabase/server.ts    (publishable key + cookies)
Server action          → lib/supabase/server.ts    (publishable key + cookies)
Route handler / API    → lib/supabase/server.ts    (publishable key + cookies)
Authenticated admin UI → lib/supabase/server.ts    (RLS decides access)
Trusted system task    → lib/supabase/admin.ts     (secret key, RLS bypass)
```

---

## Row Level Security (RLS)

### Enable on Every Exposed Table

```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

Tables in exposed schemas should not be left accessible without deliberate policies.

### Standard User-Owned RLS Policies

```sql
-- Users can only read their own rows
CREATE POLICY "Users can read own rows"
  ON [table_name] FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own rows
CREATE POLICY "Users can insert own rows"
  ON [table_name] FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own rows
CREATE POLICY "Users can update own rows"
  ON [table_name] FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own rows
CREATE POLICY "Users can delete own rows"
  ON [table_name] FOR DELETE
  USING (auth.uid() = user_id);
```

### Admin Policy Example

```sql
CREATE POLICY "Admins can read all rows"
  ON [table_name] FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'ADMIN'
    )
  );
```

Use application roles/permissions through RLS when possible instead of bypassing RLS with the secret key.

### Public Read Policy

```sql
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'PUBLISHED');
```

### Views

Views exposed through the API require deliberate security behavior. Prefer security-invoker views where appropriate so the caller's RLS rules apply.

---

## Supabase Auth Patterns

### Sign Up

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name },
  },
})
```

### Sign In

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})
```

### Sign Out

```typescript
await supabase.auth.signOut()
```

### Verify Current Identity (Server)

```typescript
const supabase = await createClient()
const { data } = await supabase.auth.getClaims()
const claims = data?.claims

if (!claims?.sub) redirect('/login')
```

### Fetch Current User Record When Needed

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser()
```

Use this when you specifically need the latest Auth user record, not as the default authorization primitive for every request.

---

## Data Fetching Patterns

### Server Component (Preferred for Initial Data)

```typescript
export default async function UsersPage() {
  const supabase = await createClient()

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error

  return <UserList users={users} />
}
```

### Client Component with TanStack Query

```typescript
// features/users/hooks/useUsers.ts
export function useUsers() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}
```

### Server Action (Mutations)

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub

  if (!userId) throw new Error('UNAUTHORIZED')

  const { error } = await supabase
    .from('posts')
    .insert({
      title: String(formData.get('title') ?? ''),
      user_id: userId,
    })

  if (error) throw error

  revalidatePath('/posts')
}
```

RLS remains the final authorization boundary for database access.

---

## Type Generation

Normal development source = local schema.

```bash
npx supabase gen types --lang typescript --local > src/types/database.types.ts
```

Use the generated `Database` type everywhere:

```typescript
import type { Database } from '@/types/database.types'

type User = Database['public']['Tables']['users']['Row']
type NewUser = Database['public']['Tables']['users']['Insert']
```

Regenerate types after schema changes.

Do not generate from production by default during normal feature development.

---

## Migrations (Supabase CLI)

### Init (First Time)

```bash
npx supabase init
```

This creates `supabase/config.toml`.

### Create New Migration

```bash
npx supabase migration new create_users_table
```

Migration files:

```text
supabase/migrations/[timestamp]_[name].sql
```

### Apply / Verify Locally

```bash
npx supabase db reset --local
```

This:
1. Recreates the LOCAL database
2. Replays all migrations
3. Runs configured seed files

This command must never target production.

### Generate Migration from Local Schema Changes

```bash
npx supabase db diff --local -f add_vehicle_status
```

Use explicit `--local` in project commands even when local is the CLI default.

### Production Migration Preview

Production migration application should be controlled through deployment/CI where possible.

Preview first:

```bash
npx supabase db push --linked --dry-run
```

Then apply pending migrations only after review:

```bash
npx supabase db push --linked
```

Never include development seed data in production.

### Forbidden Production Command

```bash
npx supabase db reset --linked
```

Never run this against production. It is destructive.

---

## Seed Data

Supabase database seed data belongs in SQL files, normally:

```text
supabase/seed.sql
```

Rules:
- Seed data is for local development/testing
- Seed data is not TypeScript mock data
- Application mock files may coexist with SQL seed data
- Do not copy real production customer/user data into development seeds
- Do not push development seed data to production
- `db reset --local` may replay seed data
- `db reset --local --no-seed` skips seed data

---

## Storage Rules

- Storage policies mirror database authorization principles
- Public buckets only for intentionally public assets
- Private buckets for user/private uploads
- Storage access should be protected with policies
- Do not use a secret/admin client from browser code to bypass Storage policies

```sql
CREATE POLICY "Users own their uploads"
  ON storage.objects FOR ALL
  USING (auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);
```

Prefer separate policies per operation when different read/write permissions are required.

---

## Realtime

- Enable only on tables that genuinely need live updates
- Do not enable globally without a use case
- Always unsubscribe during cleanup

```typescript
const channel = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `room_id=eq.${roomId}`,
    },
    (payload) => {
      // handle change
    }
  )
  .subscribe()

return () => supabase.removeChannel(channel)
```

---

## Git Hygiene

Commit:

```text
supabase/config.toml
supabase/migrations/
supabase/seed.sql           # if used
src/types/database.types.ts # if this project commits generated types
.env.example
```

Ignore:

```text
.env
.env.local
.env.production
.env.*.local
supabase/.temp/
supabase/.branches/
```

Never commit:
- Secret keys
- Service-role keys
- Production database passwords
- Personal access tokens
- Generated local Supabase internal state

---

## Production Safety

```text
LOCAL
  make dev                  → local Supabase
  make db-reset             → local only
  make db-reset-clean       → local only
  make migration name=...   → migration file only
  make db-types             → local schema

PRODUCTION
  deployed app              → hosted Supabase
  schema deployment         → reviewed migrations
  db reset                  → NEVER
  development seed          → NEVER
```

Git branch is not an environment selector.

A developer on `main` running local commands still uses local Supabase.

---

## Agent Quick Reference

```text
New table?
  → Put schema change in a migration
  → Enable RLS when exposed through the Data API
  → Add deliberate SELECT / INSERT / UPDATE / DELETE policies
  → Add user_id / ownership relationship if user-owned data
  → Reset/test locally
  → Regenerate local TypeScript types

New client component data fetch?
  → lib/supabase/client.ts
  → Publishable key only
  → RLS protects data
  → Wrap with TanStack Query when client caching is useful

New server component / action / route?
  → lib/supabase/server.ts
  → Use cookie-aware SSR client
  → Use getClaims() to protect pages/data
  → Let RLS enforce database authorization

Admin user feature?
  → Prefer normal authenticated server client
  → Express ADMIN permission in RLS / authorization logic
  → Do NOT automatically use secret key

Trusted system operation requiring RLS bypass?
  → lib/supabase/admin.ts
  → Server only
  → SUPABASE_SECRET_KEY only
  → Never import into client code

New env var?
  → Browser-safe public value → NEXT_PUBLIC_ prefix
  → Secret/server-only value  → NO NEXT_PUBLIC_ prefix
  → Add placeholder to .env.example
  → Never commit real secrets

Schema changed?
  → Create/update migration
  → npx supabase db reset --local
  → npx supabase gen types --lang typescript --local > src/types/database.types.ts

Reset requested?
  → LOCAL ONLY
  → npx supabase db reset --local
  → NEVER use --linked for production

Production migration requested?
  → Preview with db push --linked --dry-run
  → Prefer CI/deployment workflow
  → Apply reviewed pending migrations only
  → NEVER reset production

Current Git branch is main?
  → Local commands still use local Supabase
  → Do not silently switch credentials based on branch
```
