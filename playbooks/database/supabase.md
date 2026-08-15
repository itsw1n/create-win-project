# Database: Supabase

Used in: Next.js + Supabase, React + Supabase combos.

---

## Core Rules
- RLS (Row Level Security) enabled on EVERY table — no exceptions
- Anon key: client-side only, safe to expose
- Service role key: server-side only, NEVER prefix with NEXT_PUBLIC_
- Never bypass RLS with service role key from client components
- Auth is Supabase Auth — not custom JWT
- Use @supabase/ssr for Next.js — not @supabase/supabase-js alone

---

## Environment Variables
```bash
# Public — safe in client components
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Private — server only, NEVER NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Client Setup (Next.js + @supabase/ssr)

### lib/supabase/client.ts — Browser Client
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### lib/supabase/server.ts — Server Component Client
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

### lib/supabase/admin.ts — Service Role Client (Server Only)
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// NEVER import this in client components
export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

---

## Which Client to Use
```
Client component     → lib/supabase/client.ts    (browser, anon key)
Server component     → lib/supabase/server.ts    (server, anon key + cookies)
Server action        → lib/supabase/server.ts    (server, anon key + cookies)
API route            → lib/supabase/server.ts    (server, anon key + cookies)
Admin operation      → lib/supabase/admin.ts     (server ONLY, service role)
```

---

## Row Level Security (RLS)

### Enable on Every Table
```sql
ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;
```

### Standard RLS Policies
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

### Admin-Only Policy
```sql
CREATE POLICY "Admins can read all rows"
  ON [table_name] FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );
```

### Public Read Policy
```sql
CREATE POLICY "Anyone can read published posts"
  ON posts FOR SELECT
  USING (status = 'PUBLISHED');
```

---

## Supabase Auth Patterns

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { name }   // stored in auth.users.raw_user_meta_data
  }
})
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({ email, password })
```

### Sign Out
```typescript
await supabase.auth.signOut()
```

### Get Current User (Server Component)
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

### Get Current User (Client Component)
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

---

## Data Fetching Patterns

### Server Component (preferred for initial data)
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

### Server Action (mutations)
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHORIZED')

  const { error } = await supabase
    .from('posts')
    .insert({ title: formData.get('title'), user_id: user.id })

  if (error) throw error
  revalidatePath('/posts')
}
```

---

## Type Generation
```bash
# Generate TypeScript types from your Supabase schema
npx supabase gen types typescript --project-id [project-id] > src/types/database.types.ts
```

Use `Database` type everywhere:
```typescript
import type { Database } from '@/types/database.types'
type User = Database['public']['Tables']['users']['Row']
type NewUser = Database['public']['Tables']['users']['Insert']
```

---

## Migrations (Supabase CLI)
```bash
# Init (first time)
npx supabase init

# Create new migration
npx supabase migration new create_users_table

# Apply locally
npx supabase db reset

# Push to remote
npx supabase db push
```

Migration files: `supabase/migrations/[timestamp]_[name].sql`

---

## Storage Rules
- Bucket policies mirror RLS rules
- Public buckets: only for truly public assets (logos, public images)
- Private buckets: user-uploaded content, enforce auth

```sql
-- Storage policy: users can only access their own files
CREATE POLICY "Users own their uploads"
  ON storage.objects FOR ALL
  USING (auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Realtime
- Only enable on tables that genuinely need live updates
- Do NOT enable globally — performance cost

```typescript
// Subscribe to changes
const channel = supabase
  .channel('table-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'messages',
    filter: `room_id=eq.${roomId}`
  }, (payload) => {
    // handle change
  })
  .subscribe()

// Always unsubscribe on cleanup
return () => supabase.removeChannel(channel)
```

---

## Agent Quick Reference
```
New table?
  → Enable RLS immediately
  → Add SELECT + INSERT + UPDATE + DELETE policies
  → Add user_id column if user-owned data

New client component data fetch?
  → lib/supabase/client.ts (browser client)
  → Wrap in TanStack Query hook

New server component data fetch?
  → lib/supabase/server.ts (server client)
  → Fetch directly in the async component

New mutation?
  → Server action with 'use server'
  → Use server client
  → Call revalidatePath after mutation

Admin operation?
  → lib/supabase/admin.ts
  → Server only — never import in client component

New env var?
  → Public data → NEXT_PUBLIC_ prefix
  → Secrets → NO prefix, server only

Type safety?
  → Regenerate types after schema change
  → npx supabase gen types typescript ...
  → Use Database['public']['Tables'][name]['Row']
```
