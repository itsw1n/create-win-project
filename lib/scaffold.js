import path from 'node:path'
import { packageVersion } from './compatibility.js'

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
  if (stack.frontendKey === 'react') {
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
  const files = {}
  files['package.json'] = packageFile(answers, stack)
  files['tsconfig.json'] = json({
    compilerOptions: {
      target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'], allowJs: false,
      skipLibCheck: true, strict: true, noEmit: true, esModuleInterop: true,
      module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true,
      isolatedModules: true, jsx: 'react-jsx', incremental: true,
      plugins: [{ name: 'next' }], paths: { '@/*': ['./src/*'] },
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts', '.next/dev/types/**/*.ts'],
    exclude: ['node_modules'],
  })
  files['next-env.d.ts'] = "/// <reference types=\"next\" />\n/// <reference types=\"next/image-types/global\" />\n"
  files['eslint.config.mjs'] = "import { defineConfig, globalIgnores } from 'eslint/config'\nimport nextVitals from 'eslint-config-next/core-web-vitals'\nimport nextTs from 'eslint-config-next/typescript'\n\nexport default defineConfig([\n  ...nextVitals,\n  ...nextTs,\n  globalIgnores(['.next/**', 'out/**', 'next-env.d.ts']),\n])\n"
  files['next.config.ts'] = `import type { NextConfig } from 'next'\n\nconst securityHeaders = [\n  { key: 'X-Content-Type-Options', value: 'nosniff' },\n  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },\n  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },\n  { key: 'X-Frame-Options', value: 'DENY' },\n]\n\nconst nextConfig: NextConfig = {\n  reactStrictMode: true,\n  output: 'standalone',\n  async headers() { return [{ source: '/(.*)', headers: securityHeaders }] },\n}\n\nexport default nextConfig\n`
  files['postcss.config.mjs'] = stack.styleId === 'tailwind'
    ? "const config = { plugins: { '@tailwindcss/postcss': {} } }\nexport default config\n"
    : "const config = { plugins: {} }\nexport default config\n"
  files['src/app/globals.css'] = `${stack.styleId === 'tailwind' ? '@import "tailwindcss";\n\n' : ''}:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; }\nmain { max-width: 48rem; margin: 0 auto; padding: 4rem 1.5rem; }\na { color: inherit; }\n`
  files['src/app/layout.tsx'] = `import type { Metadata } from 'next'\nimport type { ReactNode } from 'react'\nimport './globals.css'\n\nexport const metadata: Metadata = { title: ${JSON.stringify(answers.projectName)}, description: ${JSON.stringify(answers.projectDescription)} }\n\nexport default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {\n  return <html lang="en"><body>{children}</body></html>\n}\n`
  files['src/app/page.tsx'] = stack.architecture === 'small'
    ? `export default function HomePage() {\n  return (\n    <main>\n      <p>create-win-project</p>\n      <h1>Your starter is running</h1>\n      <p>{${JSON.stringify(answers.projectDescription)}}</p>\n      <p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>\n    </main>\n  )\n}\n`
    : `${stack.architecture === 'large'
      ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
      : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport default function HomePage() {\n  const status = getStarterStatus()\n  return <main><p>create-win-project</p><StarterStatus status={status} /><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
  files['src/app/api/health/route.ts'] = "export function GET() {\n  return Response.json({ status: 'ok' })\n}\n"
  files['src/app/page.test.tsx'] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport HomePage from './page'\n\ntest('renders the starter heading', () => {\n  render(<HomePage />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  if ((answers.testing || 'basic') === 'none') delete files['src/app/page.test.tsx']
  testFiles(files, '', stack, answers.testing || 'basic')
  Object.assign(files, statusFeatureFiles('', stack))
  if (stack.backendKey === 'supabase') Object.assign(files, supabaseWebFiles(true, stack.authentication === 'supabase'))
  if (stack.backendKey === 'postgres') Object.assign(files, prismaFiles())
  return files
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
  const files = {}
  files[`${root}/package.json`] = packageFile(answers, stack)
  files[`${root}/tsconfig.json`] = json({ compilerOptions: { target: 'ES2022', useDefineForClassFields: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], allowJs: false, skipLibCheck: true, esModuleInterop: true, allowSyntheticDefaultImports: true, strict: true, forceConsistentCasingInFileNames: true, module: 'ESNext', moduleResolution: 'Bundler', resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', paths: { '@/*': ['./src/*'] } }, include: ['src', 'vite.config.ts', 'vitest.config.ts'] })
  files[`${root}/index.html`] = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="${html(answers.projectDescription)}" /><title>${html(answers.projectName)}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`
  files[`${root}/vite.config.ts`] = `import { fileURLToPath, URL } from 'node:url'\nimport { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n${stack.styleId === 'tailwind' ? "import tailwindcss from '@tailwindcss/vite'\n" : ''}\nexport default defineConfig({\n  plugins: [react()${stack.styleId === 'tailwind' ? ', tailwindcss()' : ''}],\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n})\n`
  files[`${root}/eslint.config.js`] = `import js from '@eslint/js'\nimport tseslint from 'typescript-eslint'\n\nexport default tseslint.config(\n  { ignores: ['dist', 'coverage', 'playwright-report'] },\n  js.configs.recommended,\n  ...tseslint.configs.recommended,\n  { files: ['**/*.{ts,tsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },\n)\n`
  files[`${root}/src/vite-env.d.ts`] = "/// <reference types=\"vite/client\" />\n"
  files[`${root}/src/main.tsx`] = `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport { App } from './App'\nimport './styles.css'\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)\n`
  files[`${root}/src/App.tsx`] = stack.architecture === 'small'
    ? `export function App() {\n  return <main><p>create-win-project</p><h1>Your starter is running</h1><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
    : `${stack.architecture === 'large'
      ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
      : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport function App() {\n  const status = getStarterStatus()\n  return <main><p>create-win-project</p><StarterStatus status={status} /><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
  files[`${root}/src/styles.css`] = `${stack.styleId === 'tailwind' ? '@import "tailwindcss";\n' : ''}:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\nmain { max-width: 48rem; margin: 0 auto; padding: 4rem 1.5rem; }\n`
  if ((answers.testing || 'basic') !== 'none') files[`${root}/src/App.test.tsx`] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport { App } from './App'\n\ntest('renders the starter heading', () => {\n  render(<App />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  testFiles(files, root, stack, answers.testing || 'basic')
  Object.assign(files, statusFeatureFiles(root, stack))
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
  const files = {
    'package.json': packageFile(answers, stack),
    'app.json': json({ expo: { name: answers.projectName, slug: answers.projectName, version: '1.0.0', orientation: 'portrait', scheme: answers.projectName, userInterfaceStyle: 'automatic', plugins: stack.authentication === 'supabase' ? ['expo-router', 'expo-secure-store'] : ['expo-router'], experiments: { typedRoutes: true } } }),
    'tsconfig.json': json({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true, types: ['jest'], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'] }),
    'expo-env.d.ts': "/// <reference types=\"expo/types\" />\n",
    'app/_layout.tsx': stack.authentication === 'supabase'
      ? `import { Stack } from 'expo-router'\nimport { useEffect } from 'react'\nimport { bindSupabaseAuthLifecycle } from '@/lib/supabase-lifecycle'\n\nexport default function RootLayout() {\n  useEffect(() => bindSupabaseAuthLifecycle(), [])\n  return <Stack screenOptions={{ headerTitle: '${answers.projectName}' }} />\n}\n`
      : `import { Stack } from 'expo-router'\n\nexport default function RootLayout() { return <Stack screenOptions={{ headerTitle: '${answers.projectName}' }} /> }\n`,
    'app/index.tsx': stack.architecture === 'small'
      ? `import { StyleSheet, Text, View } from 'react-native'\nimport { SafeAreaView } from 'react-native-safe-area-context'\n\nexport default function HomeScreen() {\n  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text>create-win-project</Text><Text accessibilityRole="header">Your starter is running</Text><Text>{${JSON.stringify(answers.projectDescription)}}</Text></View></SafeAreaView>\n}\nconst styles = StyleSheet.create({ safe: { flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`
      : `import { StyleSheet, Text, View } from 'react-native'\nimport { SafeAreaView } from 'react-native-safe-area-context'\n${stack.architecture === 'large'
        ? "import { getStarterStatus, StarterStatus } from '@/features/status'"
        : "import { StarterStatus } from '@/features/status/components/StarterStatus'\nimport { getStarterStatus } from '@/features/status/services/getStarterStatus'"}\n\nexport default function HomeScreen() {\n  const status = getStarterStatus()\n  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text>create-win-project</Text><StarterStatus status={status} /><Text>{${JSON.stringify(answers.projectDescription)}}</Text></View></SafeAreaView>\n}\nconst styles = StyleSheet.create({ safe: { flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`,
  }
  testFiles(files, '', stack, answers.testing || 'basic')
  Object.assign(files, nativeStatusFeatureFiles(stack))
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
  const pkg = vars.PACKAGE_NAME
  const pkgPath = vars.PACKAGE_PATH
  const appName = `${answers.projectName.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Application`
  const isLarge = stack.architecture === 'large'
  const withTests = (answers.testing || 'basic') !== 'none'
  const withFullTests = answers.testing === 'full'
  const healthWebMvcTest = stack.authentication === 'oidc'
    ? '@WebMvcTest(controllers = HealthController.class, properties = "spring.autoconfigure.exclude=org.springframework.boot.security.oauth2.server.resource.autoconfigure.servlet.OAuth2ResourceServerAutoConfiguration")'
    : '@WebMvcTest(HealthController.class)'
  const integrationSecurityImports = stack.authentication === 'oidc'
    ? `\nimport static org.mockito.ArgumentMatchers.anyString;\nimport static org.mockito.Mockito.doThrow;\nimport org.springframework.security.oauth2.jwt.JwtDecoder;\nimport org.springframework.security.oauth2.jwt.BadJwtException;\nimport org.springframework.security.oauth2.jwt.JwtException;\nimport org.springframework.test.context.bean.override.mockito.MockitoBean;`
    : stack.authentication === 'session'
      ? `\nimport static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;\nimport static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;`
      : ''
  const integrationSecurityFields = stack.authentication === 'oidc'
    ? '\n    @MockitoBean JwtDecoder jwtDecoder;'
    : ''
  const integrationSecurityTests = stack.authentication === 'oidc'
    ? `\n    @Test void protectedRoutesRejectMissingBearerToken() throws Exception { mvc.perform(get("/api/private-probe")).andExpect(status().isUnauthorized()); }\n    @Test void invalidBearerTokenIsRejected() throws Exception { doThrow(new BadJwtException("invalid")).when(jwtDecoder).decode(anyString()); mvc.perform(get("/api/private-probe").header("Authorization", "Bearer invalid")).andExpect(status().isUnauthorized()); }`
    : stack.authentication === 'session'
      ? `\n    @Test void protectedRoutesRequireASession() throws Exception { mvc.perform(get("/api/private-probe")).andExpect(status().is3xxRedirection()); }\n    @Test void authenticatedRequestsReachTheApplication() throws Exception { mvc.perform(get("/api/private-probe").with(user("test"))).andExpect(status().isNotFound()); }\n    @Test void logoutRequiresCsrf() throws Exception { mvc.perform(post("/api/auth/logout").with(user("test"))).andExpect(status().isForbidden()); mvc.perform(post("/api/auth/logout").with(user("test")).with(csrf())).andExpect(status().is3xxRedirection()); }`
      : stack.authentication === 'undecided'
        ? `\n    @Test void undecidedAuthenticationFailsClosed() throws Exception { mvc.perform(get("/api/private-probe")).andExpect(status().isForbidden()); }`
        : `\n    @Test void publicApplicationsDoNotInventAuthentication() throws Exception { mvc.perform(get("/api/private-probe")).andExpect(status().isNotFound()); }`
  const securityDependency = stack.authentication === 'oidc'
    ? '\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>'
    : ''
  const modulithManagement = isLarge
    ? `\n  <dependencyManagement><dependencies><dependency><groupId>org.springframework.modulith</groupId><artifactId>spring-modulith-bom</artifactId><version>${vars.SPRING_MODULITH_VERSION}</version><type>pom</type><scope>import</scope></dependency></dependencies></dependencyManagement>`
    : ''
  const modulithDependency = isLarge && withTests
    ? '\n    <dependency><groupId>org.springframework.modulith</groupId><artifactId>spring-modulith-starter-test</artifactId><scope>test</scope></dependency>'
    : ''
  const testDependencies = withTests
    ? `\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc-test</artifactId><scope>test</scope></dependency>\n    <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>${modulithDependency}${withFullTests ? `\n    <dependency><groupId>org.testcontainers</groupId><artifactId>junit-jupiter</artifactId><version>${vars.TESTCONTAINERS_VERSION}</version><scope>test</scope></dependency>\n    <dependency><groupId>org.testcontainers</groupId><artifactId>postgresql</artifactId><version>${vars.TESTCONTAINERS_VERSION}</version><scope>test</scope></dependency>` : ''}`
    : ''
  const excludeDefaultUser = stack.authentication === 'session' ? '' : '\nimport org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;'
  const applicationAnnotation = stack.authentication === 'session'
    ? '@SpringBootApplication'
    : '@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)'
  const accessRule = stack.authentication === 'public'
    ? '.anyRequest().permitAll()'
    : stack.authentication === 'undecided' ? '.anyRequest().denyAll()' : '.anyRequest().authenticated()'
  const authConfig = stack.authentication === 'session'
    ? '\n            .formLogin(Customizer.withDefaults())\n            .logout(logout -> logout.logoutUrl("/api/auth/logout").invalidateHttpSession(true).deleteCookies("JSESSIONID"))'
    : stack.authentication === 'oidc'
      ? '\n            .csrf(csrf -> csrf.disable())\n            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))\n            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))'
      : stack.authentication === 'public' ? '\n            .csrf(csrf -> csrf.disable())' : ''
  const securityImports = `${['session', 'oidc'].includes(stack.authentication) ? '\nimport org.springframework.security.config.Customizer;' : ''}${stack.authentication === 'oidc' ? '\nimport org.springframework.security.config.http.SessionCreationPolicy;' : ''}`
  const files = {
    'backend/mvnw': `#!/bin/sh\nset -eu\nif command -v mvn >/dev/null 2>&1; then exec mvn "$@"; fi\nif command -v docker >/dev/null 2>&1; then exec docker run --rm -v "$PWD:/workspace" -w /workspace ${vars.MAVEN_IMAGE} mvn "$@"; fi\necho "Maven is unavailable. Install Maven ${vars.MAVEN_VERSION} or Docker." >&2\nexit 1\n`,
    'backend/mvnw.cmd': `@echo off\r\nwhere mvn >nul 2>nul\r\nif %errorlevel% equ 0 (mvn %* & exit /b %errorlevel%)\r\nwhere docker >nul 2>nul\r\nif %errorlevel% equ 0 (docker run --rm -v "%cd%:/workspace" -w /workspace ${vars.MAVEN_IMAGE} mvn %* & exit /b %errorlevel%)\r\necho Maven is unavailable. Install Maven ${vars.MAVEN_VERSION} or Docker. 1>&2\r\nexit /b 1\r\n`,
    'backend/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n  <modelVersion>4.0.0</modelVersion>\n  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>${vars.SPRING_BOOT_VERSION}</version><relativePath/></parent>\n  <groupId>${pkg}</groupId><artifactId>${answers.projectName}</artifactId><version>0.0.1-SNAPSHOT</version>\n  <properties><java.version>${vars.JAVA_VERSION}</java.version></properties>${modulithManagement}\n  <dependencies>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>\n    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>\n    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>${securityDependency}${testDependencies}\n  </dependencies>\n  <build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>\n</project>\n`,
    [`backend/src/main/java/${pkgPath}/${appName}.java`]: `package ${pkg};\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;${excludeDefaultUser}\n\n${applicationAnnotation}\npublic class ${appName} {\n    public static void main(String[] args) { SpringApplication.run(${appName}.class, args); }\n}\n`,
    [`backend/src/main/java/${pkgPath}/health/HealthController.java`]: `package ${pkg}.health;\n\nimport java.util.Map;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n    @GetMapping("/api/health")\n    Map<String, String> health() { return Map.of("status", "ok"); }\n}\n`,
    [`backend/src/main/java/${pkgPath}/config/SecurityConfig.java`]: `package ${pkg}.config;\n\nimport org.springframework.context.annotation.Bean;\nimport org.springframework.context.annotation.Configuration;${securityImports}\nimport org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;\nimport org.springframework.security.config.annotation.web.builders.HttpSecurity;\nimport org.springframework.security.web.SecurityFilterChain;\n\n@Configuration\n@EnableMethodSecurity\npublic class SecurityConfig {\n    @Bean\n    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {\n        return http\n            .authorizeHttpRequests(auth -> auth\n                .requestMatchers("/api/health", "/actuator/health").permitAll()\n                ${accessRule}\n            )${authConfig}\n            .build();\n    }\n}\n`,
    [`backend/src/main/java/${pkgPath}/common/error/ErrorCode.java`]: `package ${pkg}.common.error;\n\npublic enum ErrorCode { RESOURCE_NOT_FOUND, CONFLICT, OPERATION_FORBIDDEN }\n`,
    [`backend/src/main/java/${pkgPath}/common/error/AppException.java`]: `package ${pkg}.common.error;\n\npublic final class AppException extends RuntimeException {\n    private final ErrorCode code;\n    public AppException(ErrorCode code, String message) { super(message); this.code = code; }\n    public ErrorCode code() { return code; }\n}\n`,
    [`backend/src/main/java/${pkgPath}/common/error/ApiExceptionHandler.java`]: `package ${pkg}.common.error;\n\nimport jakarta.servlet.http.HttpServletRequest;\nimport org.springframework.http.HttpStatus;\nimport org.springframework.http.ProblemDetail;\nimport org.springframework.web.bind.annotation.ExceptionHandler;\nimport org.springframework.web.bind.annotation.RestControllerAdvice;\n\n@RestControllerAdvice\npublic class ApiExceptionHandler {\n    @ExceptionHandler(AppException.class)\n    ProblemDetail handle(AppException exception, HttpServletRequest request) {\n        HttpStatus status = switch (exception.code()) {\n            case RESOURCE_NOT_FOUND -> HttpStatus.NOT_FOUND;\n            case CONFLICT -> HttpStatus.CONFLICT;\n            case OPERATION_FORBIDDEN -> HttpStatus.FORBIDDEN;\n        };\n        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, exception.getMessage());\n        problem.setTitle(status.getReasonPhrase());\n        problem.setProperty("code", exception.code().name());\n        return problem;\n    }\n}\n`,
    'backend/src/main/resources/application.yml': `spring:\n  application:\n    name: ${answers.projectName}\n  datasource:\n    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/${answers.projectName.replaceAll('-', '_')}}\n    username: \${POSTGRES_USER:postgres}\n    password: \${POSTGRES_PASSWORD:postgres}\n  jpa:\n    open-in-view: false\n    hibernate:\n      ddl-auto: validate\n  flyway:\n    enabled: true\nmanagement:\n  endpoints:\n    web:\n      exposure:\n        include: health,info\n  endpoint:\n    health:\n      probes:\n        enabled: true\nserver:\n  error:\n    include-message: never\n`,
    'backend/src/main/resources/db/migration/V1__baseline.sql': 'CREATE TABLE examples (\n  id UUID PRIMARY KEY,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n',
  }
  if (stack.authentication === 'oidc') {
    files['backend/src/main/resources/application.yml'] += '\nspring.security.oauth2.resourceserver.jwt.issuer-uri: ${OIDC_ISSUER_URI:http://localhost:9090/realms/app}\nspring.security.oauth2.resourceserver.jwt.audiences: ${OIDC_AUDIENCE:api}\n'
  }

  if (stack.architecture !== 'small') {
    if (isLarge) {
      files[`backend/src/main/java/${pkgPath}/system/SystemStatus.java`] = `package ${pkg}.system;\n\npublic interface SystemStatus { Status current(); record Status(String status, String architecture) {} }\n`
      files[`backend/src/main/java/${pkgPath}/system/internal/SystemStatusService.java`] = `package ${pkg}.system.internal;\n\nimport org.springframework.stereotype.Service;\nimport ${pkg}.system.SystemStatus;\n\n@Service\nclass SystemStatusService implements SystemStatus {\n    public Status current() { return new Status("ok", "large"); }\n}\n`
      files[`backend/src/main/java/${pkgPath}/system/internal/SystemStatusController.java`] = `package ${pkg}.system.internal;\n\nimport ${pkg}.system.SystemStatus;\nimport ${pkg}.system.SystemStatus.Status;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\n@RequestMapping("/api/status")\nclass SystemStatusController {\n    private final SystemStatus status;\n    SystemStatusController(SystemStatus status) { this.status = status; }\n    @GetMapping Status current() { return status.current(); }\n}\n`
    } else {
      files[`backend/src/main/java/${pkgPath}/system/api/SystemStatusResponse.java`] = `package ${pkg}.system.api;\n\npublic record SystemStatusResponse(String status, String architecture) {}\n`
      files[`backend/src/main/java/${pkgPath}/system/service/SystemStatusService.java`] = `package ${pkg}.system.service;\n\nimport ${pkg}.system.api.SystemStatusResponse;\nimport org.springframework.stereotype.Service;\n\n@Service\npublic class SystemStatusService {\n    public SystemStatusResponse current() { return new SystemStatusResponse("ok", "medium"); }\n}\n`
      files[`backend/src/main/java/${pkgPath}/system/api/SystemStatusController.java`] = `package ${pkg}.system.api;\n\nimport ${pkg}.system.service.SystemStatusService;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RequestMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\n@RequestMapping("/api/status")\npublic class SystemStatusController {\n    private final SystemStatusService service;\n    public SystemStatusController(SystemStatusService service) { this.service = service; }\n    @GetMapping SystemStatusResponse current() { return service.current(); }\n}\n`
    }
  }

  if (withTests) {
    files[`backend/src/test/java/${pkgPath}/health/HealthControllerTest.java`] = `package ${pkg}.health;\n\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;\nimport static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;\nimport static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;\nimport org.junit.jupiter.api.Test;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;\nimport org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;\nimport org.springframework.test.web.servlet.MockMvc;\n\n${healthWebMvcTest}\n@AutoConfigureMockMvc(addFilters = false)\nclass HealthControllerTest {\n    @Autowired MockMvc mvc;\n    @Test void healthContractIsStable() throws Exception { mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok")); }\n}\n`
    if (isLarge) {
      files[`backend/src/test/java/${pkgPath}/ArchitectureTest.java`] = `package ${pkg};\n\nimport org.junit.jupiter.api.Test;\nimport org.springframework.modulith.core.ApplicationModules;\n\nclass ArchitectureTest {\n    @Test void modulesRespectTheirPublicApis() { ApplicationModules.of(${appName}.class).verify(); }\n}\n`
    }
    if (withFullTests) {
      files[`backend/src/test/java/${pkgPath}/PostgresIntegrationTest.java`] = `package ${pkg};\n\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;\nimport static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;${integrationSecurityImports}\nimport org.junit.jupiter.api.Test;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.boot.test.context.SpringBootTest;\nimport org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;\nimport org.springframework.test.context.DynamicPropertyRegistry;\nimport org.springframework.test.context.DynamicPropertySource;\nimport org.springframework.test.web.servlet.MockMvc;\nimport org.testcontainers.containers.PostgreSQLContainer;\nimport org.testcontainers.junit.jupiter.Container;\nimport org.testcontainers.junit.jupiter.Testcontainers;\n\n@SpringBootTest\n@AutoConfigureMockMvc\n@Testcontainers\nclass PostgresIntegrationTest {\n    @Container static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("${vars.POSTGRES_IMAGE}");\n    @Autowired MockMvc mvc;${integrationSecurityFields}\n    @DynamicPropertySource static void database(DynamicPropertyRegistry registry) {\n        registry.add("spring.datasource.url", postgres::getJdbcUrl);\n        registry.add("spring.datasource.username", postgres::getUsername);\n        registry.add("spring.datasource.password", postgres::getPassword);\n    }\n    @Test void migrationsAndPostgresContextStart() {}${integrationSecurityTests}\n}\n`
    }
  }
  return files
}

export function buildRunnableFiles(answers, stack, vars) {
  let files
  if (stack.frontendKey === 'nextjs') files = nextFiles(answers, stack)
  else if (stack.frontendKey === 'react') files = viteFiles(answers, stack)
  else files = nativeFiles(answers, stack)
  if (stack.backendKey === 'springboot') Object.assign(files, springFiles(answers, vars, stack))
  Object.assign(files, supabaseProjectFiles(stack))
  Object.assign(files, envFiles(answers, stack))
  files['create-win-project.profile.json'] = json({
    schemaVersion: 2,
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
