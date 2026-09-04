import path from 'node:path'
import { packageVersion } from './compatibility.js'
import { buildNextjsFiles } from '../src/stacks/frontends/nextjs/generate.js'
import { buildReactViteFiles } from '../src/stacks/frontends/react-vite/generate.js'
import { buildReactNativeFiles } from '../src/stacks/frontends/react-native/generate.js'
import { buildSpringBootFiles } from '../src/stacks/backends/springboot/generate.js'

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function html(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function envLine(name, answers) {
  const defaults = {
    NEXT_PUBLIC_API_URL: 'http://localhost:8080',
    VITE_API_URL: 'http://localhost:8080',
    EXPO_PUBLIC_API_URL: 'http://localhost:8080',
    DATABASE_URL: `jdbc:postgresql://localhost:5432/${answers.projectName.replaceAll('-', '_')}`,
    POSTGRES_USER: 'postgres', POSTGRES_PASSWORD: 'change-me',
    POSTGRES_DB: answers.projectName.replaceAll('-', '_'), SPRING_PROFILES_ACTIVE: 'dev',
    SPRING_SECURITY_USER_NAME: 'developer', SPRING_SECURITY_USER_PASSWORD: 'change-me-before-production',
    OIDC_ISSUER_URI: 'http://localhost:9090/realms/app', OIDC_AUDIENCE: 'api',
  }
  return `${name}=${defaults[name] || ''}`
}

function envFiles(answers, stack) {
  const header = '# Copy to .env or .env.local. Never commit real credentials.\n\n'
  const publicNames = stack.env.filter((name) => name.startsWith(stack.envPrefix))
  const serverNames = stack.env.filter((name) => !name.startsWith(stack.envPrefix))
  const output = {}
  if (stack.frontendKey === 'no-frontend') {
    output['.env.example'] = `${header}${serverNames.map((name) => envLine(name, answers)).join('\n')}\n`
  } else if (stack.frontendKey === 'react') {
    output['frontend/.env.example'] = `${header}${publicNames.map((name) => envLine(name, answers)).join('\n')}\n`
    if (stack.backendKey === 'springboot') output['.env.example'] = `${header}${serverNames.map((name) => envLine(name, answers)).join('\n')}\n`
  } else if (stack.isMobile) {
    const names = stack.backendKey === 'springboot' ? [...publicNames, ...serverNames] : publicNames
    output['.env.example'] = `${header}${names.map((name) => envLine(name, answers)).join('\n')}\n`
  } else {
    const names = stack.backendKey === 'supabase'
      ? stack.env
      : [...publicNames, ...serverNames]
    output['.env.example'] = `${header}${names.map((name) => envLine(name, answers)).join('\n')}\n`
  }
  return output
}

function projectReadme(answers, stack) {
  if (stack.frontendKey === 'no-frontend') {
    return `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\nGenerated backend-only ${stack.backendLabel} application.\n\n## Start\n\n\`\`\`bash\ncp .env.example .env\ncd backend\n./mvnw spring-boot:run  # use mvnw.cmd on Windows\n\`\`\`\n\n## Validate\n\n\`\`\`bash\ncd backend\n./mvnw --batch-mode test\n./mvnw --batch-mode package -DskipTests\n\`\`\`\n`
  }
  const root = stack.frontendKey === 'react' ? 'frontend/' : ''
  const quality = stack.isMobile
    ? `npm run typecheck\n${answers.testing === 'none' ? '' : 'npm test -- --runInBand\n'}npm run build -- --platform web`
    : `npm run lint\nnpm run typecheck\nnpm run test --if-present\nnpm run build`
  const backend = stack.backendKey === 'springboot'
    ? `\nThe backend lives in \`backend/\`:\n\n\`\`\`bash\ncd backend\nmvn spring-boot:run\n# verify: curl http://localhost:8080/api/health\n\`\`\`\n`
    : ''
  return `# ${answers.projectName}\n\n> ${answers.projectDescription}\n\nGenerated with create-win-project. This repository includes a runnable application, tests, CI guidance, and task-routed agent playbooks.\n\n## Start\n\n\`\`\`bash\n${root ? `cd ${root}\n` : ''}cp .env.example .env.local 2>/dev/null || cp .env.example .env\nnpm install\nnpm run dev\n\`\`\`\n${backend}\n## Validate\n\n\`\`\`bash\n${root ? `cd ${root}\n` : ''}${quality}\n\`\`\`\n\nCommit the generated lockfile before enabling CI; CI intentionally uses \`npm ci\`.\n\n## Agent-assisted work\n\n1. Put product goals and boundaries in \`CONTEXT.md\`.\n2. Read \`AGENTS.md\` for commands and authority boundaries.\n3. Use \`RULES.md\` to open only the relevant playbook section.\n4. Treat tests and application behavior as the source of truth when prose drifts.\n\n## Important files\n\n- \`AGENTS.md\`: small always-on operating contract.\n- \`RULES.md\`: concern-to-playbook router.\n- \`CONTEXT.md\`: project-specific intent and decisions.\n- \`docs/\`: architecture, API, setup, and deployment documentation.\n`
}

function testingPackage(stack, level) {
  const scripts = { ...stack.scripts, start: stack.frontendKey === 'nextjs' ? 'next start' : undefined }
  const devDeps = { ...stack.devDeps }

  if (level === 'none') delete scripts.test
  if (level !== 'none') {
    if (stack.isMobile) {
      Object.assign(devDeps, {
        jest: packageVersion(stack.profile, 'jest', 'react-native'),
        '@types/jest': packageVersion(stack.profile, '@types/jest', 'react-native'),
        'jest-expo': packageVersion(stack.profile, 'jest-expo', 'react-native'),
        '@testing-library/react-native': packageVersion(stack.profile, '@testing-library/react-native', 'react-native'),
      })
    } else {
      Object.assign(devDeps, {
        vitest: packageVersion(stack.profile, 'vitest', stack.frontendKey),
        jsdom: packageVersion(stack.profile, 'jsdom', stack.frontendKey),
        '@testing-library/react': packageVersion(stack.profile, '@testing-library/react', stack.frontendKey),
        '@testing-library/jest-dom': packageVersion(stack.profile, '@testing-library/jest-dom', stack.frontendKey),
      })
    }
  }
  if (level === 'full' && !stack.isMobile) {
    scripts['test:e2e'] = 'playwright test'
    devDeps['@playwright/test'] = packageVersion(stack.profile, '@playwright/test', stack.frontendKey)
  }

  scripts.typecheck = 'tsc --noEmit'
  scripts.format = 'prettier --write .'
  scripts['format:check'] = 'prettier --check .'
  if (!stack.isMobile) scripts.lint = 'eslint .'
  if (stack.architecture === 'large') scripts['check:boundaries'] = 'node scripts/check-boundaries.mjs'
  if (stack.backendKey === 'supabase') {
    const workdir = stack.frontendKey === 'react' ? ' --workdir ..' : ''
    scripts['supabase:start'] = `supabase${workdir} start`
    scripts['supabase:stop'] = `supabase${workdir} stop`
    scripts['supabase:status'] = `supabase${workdir} status`
    scripts['supabase:reset'] = `supabase${workdir} db reset`
    scripts['supabase:test'] = `supabase${workdir} test db`
    const typePath = stack.frontendKey === 'react' ? 'src/types/database.types.ts' : stack.isMobile ? 'types/database.types.ts' : 'src/types/database.types.ts'
    scripts['supabase:types'] = `supabase${workdir} gen types typescript --local > ${typePath}`
  }
  const boundaryCheck = stack.architecture === 'large' ? ' && npm run check:boundaries' : ''
  scripts.check = stack.isMobile
    ? `npm run format:check && npm run typecheck${level === 'none' ? '' : ' && npm test -- --runInBand'}${boundaryCheck}`
    : `npm run format:check && npm run lint && npm run typecheck${level === 'none' ? '' : ' && npm test'}${boundaryCheck}`
  Object.keys(scripts).forEach((key) => scripts[key] === undefined && delete scripts[key])
  return { scripts, devDeps }
}

function packageFile(answers, stack) {
  const { scripts, devDeps } = testingPackage(stack, answers.testing || 'basic')
  if (stack.backendKey === 'postgres') {
    scripts['prisma:generate'] = 'prisma generate'
    scripts['db:migrate'] = 'prisma migrate dev'
    scripts['db:deploy'] = 'prisma migrate deploy'
    scripts['db:reset'] = 'prisma migrate reset --force'
    scripts['db:studio'] = 'prisma studio'
    scripts.dev = 'prisma generate && next dev'
    scripts.build = 'prisma generate && next build'
    scripts.typecheck = 'prisma generate && tsc --noEmit'
  }
  if (stack.styleId === 'tailwind') {
    devDeps.tailwindcss = packageVersion(stack.profile, 'tailwindcss', stack.frontendKey)
    if (stack.frontendKey === 'nextjs') devDeps['@tailwindcss/postcss'] = packageVersion(stack.profile, '@tailwindcss/postcss', 'nextjs')
    if (stack.frontendKey === 'react') devDeps['@tailwindcss/vite'] = packageVersion(stack.profile, '@tailwindcss/vite', 'react')
  }
  const dependencies = { ...stack.deps }
  if (stack.frontendKey !== 'nextjs') delete dependencies['@supabase/ssr']
  if (stack.isMobile && stack.authentication === 'supabase') {
    dependencies['expo-secure-store'] = packageVersion(stack.profile, 'expo-secure-store', 'react-native')
  }
  const packageJson = {
    name: answers.projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    main: stack.isMobile ? 'expo-router/entry' : undefined,
    scripts,
    dependencies,
    devDependencies: devDeps,
  }
  if (!packageJson.main) delete packageJson.main
  return json(packageJson)
}

function boundaryScript(sourceRoot) {
  return `/* eslint-disable no-undef -- node script runs outside linted frontend bundle */
import fs from 'node:fs'\nimport path from 'node:path'\n\nconst root = path.resolve(${JSON.stringify(sourceRoot)}, 'features')\nconst violations = []\nif (fs.existsSync(root)) {\n  for (const feature of fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {\n    const featureRoot = path.join(root, feature)\n    const visit = (directory) => {\n      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {\n        const file = path.join(directory, entry.name)\n        if (entry.isDirectory()) visit(file)\n        else if (/\\.[cm]?[jt]sx?$/.test(entry.name)) {\n          const content = fs.readFileSync(file, 'utf8')\n          for (const match of content.matchAll(/from\\s+['\"]@\\/features\\/([^/'\"]+)(\\/[^'\"]+)?['\"]/g)) {\n            if (match[1] !== feature && match[2]) violations.push(\`${'${file}'} deep-imports feature ${'${match[1]}'}; import its public API instead\`)\n          }\n        }\n      }\n    }\n    visit(featureRoot)\n  }\n}\nif (violations.length) { console.error(violations.join('\\n')); process.exit(1) }\nconsole.log('Feature boundaries are valid.')\n`
}

function statusFeatureFiles(root, stack) {
  if (stack.architecture === 'small') return {}
  const prefix = root ? `${root}/` : ''
  const files = {
    [`${prefix}src/features/status/types.ts`]: "export interface StarterStatus { heading: string; profile: 'medium' | 'large' }\n",
    [`${prefix}src/features/status/services/getStarterStatus.ts`]: `import type { StarterStatus } from '../types'\n\nexport function getStarterStatus(): StarterStatus {\n  return { heading: 'Your starter is running', profile: '${stack.architecture}' }\n}\n`,
    [`${prefix}src/features/status/components/StarterStatus.tsx`]: "import type { StarterStatus as Status } from '../types'\n\nexport function StarterStatus({ status }: { status: Status }) {\n  return <><h1>{status.heading}</h1><p>Architecture: {status.profile}</p></>\n}\n",
  }
  if (stack.backendKey === 'springboot') {
    const baseUrl = stack.frontendKey === 'nextjs' ? 'process.env.NEXT_PUBLIC_API_URL' : 'import.meta.env.VITE_API_URL'
    files[`${prefix}src/features/status/api/getBackendStatus.ts`] = `export interface BackendStatus { status: string }\n\nexport async function getBackendStatus(signal?: AbortSignal): Promise<BackendStatus> {\n  const response = await fetch(\`${'${' + baseUrl + '}'}/api/health\`, { signal })\n  if (!response.ok) throw new Error(\`Backend health request failed (${'${response.status}'})\`)\n  return response.json() as Promise<BackendStatus>\n}\n`
  }
  if (stack.architecture === 'large') {
    files[`${prefix}src/features/status/index.ts`] = "export { StarterStatus } from './components/StarterStatus'\nexport { getStarterStatus } from './services/getStarterStatus'\nexport type { StarterStatus as StarterStatusModel } from './types'\n"
    files[`${prefix}scripts/check-boundaries.mjs`] = boundaryScript(prefix ? 'src' : 'src')
  }
  return files
}

function nativeStatusFeatureFiles(stack) {
  if (stack.architecture === 'small') return {}
  const files = {
    'features/status/types.ts': "export interface StarterStatus { heading: string; profile: 'medium' | 'large' }\n",
    'features/status/services/getStarterStatus.ts': `import type { StarterStatus } from '../types'\n\nexport function getStarterStatus(): StarterStatus {\n  return { heading: 'Your starter is running', profile: '${stack.architecture}' }\n}\n`,
    'features/status/components/StarterStatus.tsx': "import { Text } from 'react-native'\nimport type { StarterStatus as Status } from '../types'\n\nexport function StarterStatus({ status }: { status: Status }) {\n  return <><Text accessibilityRole=\"header\">{status.heading}</Text><Text>Architecture: {status.profile}</Text></>\n}\n",
  }
  if (stack.backendKey === 'springboot') {
    files['features/status/api/getBackendStatus.ts'] = "export interface BackendStatus { status: string }\n\nexport async function getBackendStatus(signal?: AbortSignal): Promise<BackendStatus> {\n  const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/health`, { signal })\n  if (!response.ok) throw new Error(`Backend health request failed (${response.status})`)\n  return response.json() as Promise<BackendStatus>\n}\n"
  }
  if (stack.architecture === 'large') {
    files['features/status/index.ts'] = "export { StarterStatus } from './components/StarterStatus'\nexport { getStarterStatus } from './services/getStarterStatus'\nexport type { StarterStatus as StarterStatusModel } from './types'\n"
    files['scripts/check-boundaries.mjs'] = boundaryScript('.')
  }
  return files
}

function supabaseProjectFiles(stack) {
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

function testFiles(files, root, stack, level) {
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

function nextFiles(answers, stack) {
  return buildNextjsFiles(answers, stack, {
    json, packageFile, testFiles, statusFeatureFiles, supabaseWebFiles, prismaFiles,
  })
}

function supabaseWebFiles(isNext, withAuth = false) {
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

function prismaFiles() {
  return {
    'prisma.config.ts': `import 'dotenv/config'\nimport { defineConfig, env } from 'prisma/config'\n\nexport default defineConfig({\n  schema: 'prisma/schema.prisma',\n  migrations: { path: 'prisma/migrations' },\n  datasource: { url: env('DATABASE_URL') },\n})\n`,
    'prisma/schema.prisma': `generator client {\n  provider = "prisma-client"\n  output   = "../src/generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel Example {\n  id        String   @id @default(uuid())\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  @@map("examples")\n}\n`,
    'src/lib/prisma.ts': `import { PrismaPg } from '@prisma/adapter-pg'\nimport { PrismaClient } from '@/generated/prisma/client'\n\nconst connectionString = process.env.DATABASE_URL\nif (!connectionString) throw new Error('DATABASE_URL is required')\nconst globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }\nexport const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma\n`,
  }
}

function viteFiles(answers, stack) {
  const root = 'frontend'
  const files = buildReactViteFiles(answers, stack, { html, json, packageFile, testFiles, statusFeatureFiles })
  if (stack.backendKey === 'supabase') {
    for (const [name, value] of Object.entries(supabaseWebFiles(false, stack.authentication === 'supabase'))) files[`${root}/${name}`] = value
    if (stack.authentication === 'supabase') {
      files[`${root}/src/features/auth/services/auth.ts`] = `import { supabase } from '@/lib/supabase'\n\nexport async function signIn(email: string, password: string) {\n  const { error } = await supabase.auth.signInWithPassword({ email, password })\n  if (error) throw new Error('Unable to sign in with those credentials.')\n}\n\nexport async function signOut() {\n  const { error } = await supabase.auth.signOut()\n  if (error) throw new Error('Unable to sign out.')\n}\n`
      files[`${root}/src/features/auth/components/AuthPanel.tsx`] = `import { useState, type FormEvent } from 'react'\nimport { signIn } from '../services/auth'\n\nexport function AuthPanel() {\n  const [error, setError] = useState('')\n  const [pending, setPending] = useState(false)\n  async function submit(event: FormEvent<HTMLFormElement>) {\n    event.preventDefault()\n    setPending(true)\n    setError('')\n    const data = new FormData(event.currentTarget)\n    try { await signIn(String(data.get('email') || ''), String(data.get('password') || '')) }\n    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sign in.') }\n    finally { setPending(false) }\n  }\n  return <section aria-labelledby="login-heading"><h2 id="login-heading">Sign in</h2>{error ? <p role="alert">{error}</p> : null}<form onSubmit={submit}><label>Email <input name="email" type="email" autoComplete="email" required /></label><label>Password <input name="password" type="password" autoComplete="current-password" required /></label><button disabled={pending} type="submit">{pending ? 'Signing in…' : 'Sign in'}</button></form></section>\n}\n`
      files[`${root}/src/App.tsx`] = `import { AuthPanel } from '@/features/auth/components/AuthPanel'\n${files[`${root}/src/App.tsx`].replace('<p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>', '<p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p><AuthPanel />')}`
    }
  }
  return files
}

function nativeFiles(answers, stack) {
  const files = buildReactNativeFiles(answers, stack, { json, packageFile, testFiles, nativeStatusFeatureFiles })
  if (stack.backendKey === 'supabase') {
    files['lib/supabase.ts'] = stack.authentication === 'supabase'
      ? `import { createClient } from '@supabase/supabase-js'\nimport * as SecureStore from 'expo-secure-store'\n\nconst storage = { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync }\nexport const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })\n`
      : `import { createClient } from '@supabase/supabase-js'\n\nexport const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })\n`
    if (stack.authentication === 'supabase') {
      files['lib/supabase-lifecycle.ts'] = `import { AppState, type AppStateStatus } from 'react-native'\nimport { supabase } from './supabase'\n\nexport function bindSupabaseAuthLifecycle() {\n  const update = (state: AppStateStatus) => {\n    if (state === 'active') supabase.auth.startAutoRefresh()\n    else supabase.auth.stopAutoRefresh()\n  }\n  update(AppState.currentState)\n  const subscription = AppState.addEventListener('change', update)\n  return () => { subscription.remove(); supabase.auth.stopAutoRefresh() }\n}\n`
      files['app/login.tsx'] = `import { useState } from 'react'\nimport { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'\nimport { supabase } from '@/lib/supabase'\n\nexport default function LoginScreen() {\n  const [email, setEmail] = useState('')\n  const [password, setPassword] = useState('')\n  const [error, setError] = useState('')\n  const [pending, setPending] = useState(false)\n  async function signIn() {\n    setPending(true); setError('')\n    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })\n    if (result.error) setError('Unable to sign in with those credentials.')\n    setPending(false)\n  }\n  return <View style={styles.container}><Text accessibilityRole="header">Sign in</Text>{error ? <Text accessibilityRole="alert">{error}</Text> : null}<TextInput accessibilityLabel="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} value={email} /><TextInput accessibilityLabel="Password" autoComplete="current-password" onChangeText={setPassword} secureTextEntry value={password} /><Pressable accessibilityRole="button" disabled={pending} onPress={signIn}><Text>{pending ? 'Signing in…' : 'Sign in'}</Text></Pressable></View>\n}\nconst styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`
      if ((answers.testing || 'basic') !== 'none') files['lib/supabase-lifecycle.test.ts'] = `import { AppState } from 'react-native'\nimport { bindSupabaseAuthLifecycle } from './supabase-lifecycle'\nimport { supabase } from './supabase'\n\njest.mock('./supabase', () => ({ supabase: { auth: { startAutoRefresh: jest.fn(), stopAutoRefresh: jest.fn() } } }))\n\ntest('starts refresh while active and stops it on cleanup', () => {\n  const remove = jest.fn()\n  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove } as never)\n  Object.defineProperty(AppState, 'currentState', { configurable: true, value: 'active' })\n  const cleanup = bindSupabaseAuthLifecycle()\n  expect(supabase.auth.startAutoRefresh).toHaveBeenCalled()\n  cleanup()\n  expect(remove).toHaveBeenCalled()\n  expect(supabase.auth.stopAutoRefresh).toHaveBeenCalled()\n})\n`
    }
  }
  return files
}

function springFiles(answers, vars, stack) {
  return buildSpringBootFiles(answers, vars, stack)
}

export function buildRunnableFiles(answers, stack, vars) {
  let files
  if (stack.frontendKey === 'no-frontend' || stack.frontendKey === 'laravel-ui') files = {}
  else if (stack.frontendKey === 'nextjs') files = nextFiles(answers, stack)
  else if (stack.frontendKey === 'react') files = viteFiles(answers, stack)
  else files = nativeFiles(answers, stack)
  if (stack.backendKey === 'springboot') Object.assign(files, springFiles(answers, vars, stack))
  Object.assign(files, supabaseProjectFiles(stack))
  Object.assign(files, envFiles(answers, stack))
  files['create-win-project.profile.json'] = json({
    schemaVersion: 3,
    applicationShape: stack.applicationShape,
    compatibilityProfile: {
      id: stack.profile.id,
      status: stack.profile.status,
      supportedUntil: stack.profile.supportedUntil,
    },
    architectureProfile: stack.architecture,
    authentication: {
      intent: stack.authenticationIntent,
      model: stack.authentication,
      audience: stack.authAudience,
    },
    stack: stack.key,
    runtimes: stack.profile.runtimes,
  })
  files['README.md'] = projectReadme(answers, stack)
  if (stack.backendKey === 'springboot') {
    files['README.md'] = files['README.md'].replace('mvn spring-boot:run', './mvnw spring-boot:run  # use mvnw.cmd on Windows')
  }
  return files
}
