import path from 'node:path'

export function buildSupabaseProjectFiles(stack) {
  if (stack.backendKey !== 'supabase') return {}
  const authenticated = stack.authentication === 'supabase'
  const policies = authenticated
    ? `grant select, insert, update, delete on table public.examples to authenticated;\n\ncreate policy "owners read examples" on public.examples for select to authenticated using ((select auth.uid()) = user_id);\ncreate policy "owners create examples" on public.examples for insert to authenticated with check ((select auth.uid()) = user_id);\ncreate policy "owners update examples" on public.examples for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);\ncreate policy "owners delete examples" on public.examples for delete to authenticated using ((select auth.uid()) = user_id);`
    : stack.authentication === 'public'
      ? `grant select on table public.examples to anon, authenticated;\ncreate policy "public reads examples" on public.examples for select to anon, authenticated using (true);`
      : '-- No grants or policies: authentication is intentionally undecided and access is fail-closed.'
  return {
    'supabase/config.toml': `project_id = "${stack.key}"\n\n[api]\nenabled = true\nport = 54321\nschemas = ["public", "graphql_public"]\nextra_search_path = ["public", "extensions"]\n\n[db]\nport = 54322\nmajor_version = 16\n\n[studio]\nenabled = true\nport = 54323\n`,
    'supabase/migrations/00000000000000_create_examples.sql': `create table public.examples (\n  id uuid primary key default gen_random_uuid(),\n  user_id uuid references auth.users(id) on delete cascade,\n  name text not null check (char_length(name) between 1 and 120),\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\nalter table public.examples enable row level security;\nrevoke all on table public.examples from anon, authenticated;\ncreate index examples_user_id_idx on public.examples (user_id);\n\n${policies}\n`,
    'supabase/tests/examples_rls.test.sql': authenticated
      ? `begin;\nselect plan(5);\nselect ok((select relrowsecurity from pg_class where oid = 'public.examples'::regclass), 'examples has RLS enabled');\nselect ok((select count(*) >= 1 from pg_indexes where schemaname = 'public' and tablename = 'examples' and indexdef like '%user_id%'), 'RLS ownership column is indexed');\n\ninsert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at) values\n  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@example.test', '', now(), now()),\n  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'other@example.test', '', now(), now());\ninsert into public.examples (user_id, name) values ('11111111-1111-1111-1111-111111111111', 'owned row');\n\nset local role authenticated;\nselect set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);\nselect results_eq('select name from public.examples order by name', $$values ('owned row'::text)$$, 'owner can read their row');\nselect set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);\nselect is((select count(*) from public.examples), 0::bigint, 'non-owner cannot read the row');\nreset role;\nset local role anon;\nselect is((select count(*) from public.examples), 0::bigint, 'anonymous caller cannot read the row');\nreset role;\n\nselect * from finish();\nrollback;\n`
      : `begin;\nselect plan(2);\nselect ok((select relrowsecurity from pg_class where oid = 'public.examples'::regclass), 'examples has RLS enabled');\nselect ok((select count(*) >= 1 from pg_indexes where schemaname = 'public' and tablename = 'examples' and indexdef like '%user_id%'), 'RLS policy column is indexed');\nselect * from finish();\nrollback;\n`,
  }
}

export function buildSharedTestFiles(files, root, stack, level) {
  if (level === 'none') return
  if (stack.isMobile) {
    files[path.join(root, 'jest.config.js')] = "export default { preset: 'jest-expo' }\n"
    files[path.join(root, 'app/index.test.tsx')] = `import { render } from '@testing-library/react-native'\nimport HomeScreen from './index'\n\ntest('renders the starter heading', async () => {\n  const view = await render(<HomeScreen />)\n  expect(view.getByText('Your starter is running')).toBeTruthy()\n})\n`
    return
  }

  files[path.join(root, 'vitest.config.ts')] = `import { fileURLToPath, URL } from 'node:url'\nimport { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', exclude: ['e2e/**', 'node_modules/**'] },\n})\n`
  files[path.join(root, 'src/test/setup.ts')] = "import '@testing-library/jest-dom/vitest'\n"
  if (level === 'full') {
    files[path.join(root, 'playwright.config.ts')] = `import { defineConfig, devices } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './e2e',\n  use: { baseURL: 'http://127.0.0.1:${stack.frontendPort}' },\n  webServer: { command: 'npm run dev -- ${stack.frontendKey === 'nextjs' ? '--hostname' : '--host'} 127.0.0.1 --port ${stack.frontendPort}', url: 'http://127.0.0.1:${stack.frontendPort}', reuseExistingServer: true, timeout: 120_000 },\n  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],\n})\n`
    files[path.join(root, 'e2e/home.spec.ts')] = `import { expect, test } from '@playwright/test'\n\ntest('loads the starter', async ({ page }) => {\n  await page.goto('/')\n  await expect(page.getByRole('heading', { name: 'Your starter is running' })).toBeVisible()\n})\n`
  }
}

export function buildSupabaseWebFiles(isNext, withAuth = false) {
  if (!isNext) return {
    'src/lib/supabase.ts': `import { createClient } from '@supabase/supabase-js'\n\nconst url = import.meta.env.VITE_SUPABASE_URL\nconst key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY\nif (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')\nexport const supabase = createClient(url, key)\n`,
  }
  const files = {
    'src/lib/supabase/client.ts': `import { createBrowserClient } from '@supabase/ssr'\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n  )\n}\n`,
    'src/lib/supabase/server.ts': `import { createServerClient } from '@supabase/ssr'\nimport { cookies } from 'next/headers'\n\nexport async function createClient() {\n  const store = await cookies()\n  return createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    { cookies: { getAll: () => store.getAll(), setAll: (values) => {\n      try { values.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* Proxy owns refresh writes. */ }\n    } } },\n  )\n}\n`,
  }
  if (withAuth) Object.assign(files, {
    'src/lib/supabase/proxy.ts': `import { createServerClient } from '@supabase/ssr'\nimport { NextResponse, type NextRequest } from 'next/server'\n\nexport async function updateSession(request: NextRequest) {\n  let response = NextResponse.next({ request })\n  const supabase = createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    { cookies: {\n      getAll: () => request.cookies.getAll(),\n      setAll: (values) => {\n        values.forEach(({ name, value }) => request.cookies.set(name, value))\n        response = NextResponse.next({ request })\n        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))\n      },\n    } },\n  )\n  await supabase.auth.getClaims()\n  return response\n}\n`,
    'src/proxy.ts': `import type { NextRequest } from 'next/server'\nimport { updateSession } from '@/lib/supabase/proxy'\n\nexport async function proxy(request: NextRequest) { return updateSession(request) }\n\nexport const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }\n`,
    'src/app/auth/callback/route.ts': `import { NextResponse, type NextRequest } from 'next/server'\nimport { createClient } from '@/lib/supabase/server'\n\nexport async function GET(request: NextRequest) {\n  const code = request.nextUrl.searchParams.get('code')\n  const destination = new URL('/', request.url)\n  if (!code) return NextResponse.redirect(destination)\n  const supabase = await createClient()\n  const { error } = await supabase.auth.exchangeCodeForSession(code)\n  if (error) destination.searchParams.set('authError', 'callback_failed')\n  return NextResponse.redirect(destination)\n}\n`,
    'src/app/login/actions.ts': `'use server'\n\nimport { redirect } from 'next/navigation'\nimport { createClient } from '@/lib/supabase/server'\n\nexport async function signIn(formData: FormData) {\n  const email = String(formData.get('email') || '').trim()\n  const password = String(formData.get('password') || '')\n  if (!email || !password) redirect('/login?error=missing_credentials')\n  const supabase = await createClient()\n  const { error } = await supabase.auth.signInWithPassword({ email, password })\n  if (error) redirect('/login?error=invalid_credentials')\n  redirect('/')\n}\n\nexport async function signOut() {\n  const supabase = await createClient()\n  await supabase.auth.signOut()\n  redirect('/login')\n}\n`,
    'src/app/login/page.tsx': `import { signIn } from './actions'\n\nexport default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {\n  const { error } = await searchParams\n  return <main><h1>Sign in</h1>{error ? <p role="alert">Sign-in failed. Check your details and try again.</p> : null}<form action={signIn}><label>Email <input name="email" type="email" autoComplete="email" required /></label><label>Password <input name="password" type="password" autoComplete="current-password" required /></label><button type="submit">Sign in</button></form></main>\n}\n`,
  })
  return files
}
