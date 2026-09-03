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
  if (!stack.isMobile) scripts.lint = 'eslint .'
  Object.keys(scripts).forEach((key) => scripts[key] === undefined && delete scripts[key])
  return { scripts, devDeps }
}

function packageFile(answers, stack) {
  const { scripts, devDeps } = testingPackage(stack, answers.testing || 'basic')
  if (stack.styleId === 'tailwind') {
    devDeps.tailwindcss = packageVersion(stack.profile, 'tailwindcss', stack.frontendKey)
    if (stack.frontendKey === 'nextjs') devDeps['@tailwindcss/postcss'] = packageVersion(stack.profile, '@tailwindcss/postcss', 'nextjs')
    if (stack.frontendKey === 'react') devDeps['@tailwindcss/vite'] = packageVersion(stack.profile, '@tailwindcss/vite', 'react')
  }
  const dependencies = { ...stack.deps }
  if (stack.frontendKey !== 'nextjs') delete dependencies['@supabase/ssr']
  if (stack.isMobile && stack.backendKey === 'supabase') {
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

function testFiles(files, root, stack, level) {
  if (level === 'none') return
  if (stack.isMobile) {
    files[path.join(root, 'jest.config.js')] = "export default { preset: 'jest-expo' }\n"
    files[path.join(root, 'app/index.test.tsx')] = `import { render } from '@testing-library/react-native'\nimport HomeScreen from './index'\n\ntest('renders the starter heading', async () => {\n  const view = await render(<HomeScreen />)\n  expect(view.getByText('Your starter is running')).toBeTruthy()\n})\n`
    return
  }

  files[path.join(root, 'vitest.config.ts')] = `import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts' },\n})\n`
  files[path.join(root, 'src/test/setup.ts')] = "import '@testing-library/jest-dom/vitest'\n"
  if (level === 'full') {
    files[path.join(root, 'playwright.config.ts')] = `import { defineConfig, devices } from '@playwright/test'\n\nexport default defineConfig({\n  testDir: './e2e',\n  use: { baseURL: 'http://127.0.0.1:${stack.frontendPort}' },\n  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:${stack.frontendPort}', reuseExistingServer: true },\n  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],\n})\n`
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
  files['src/app/page.tsx'] = `export default function HomePage() {\n  return (\n    <main>\n      <p>create-win-project</p>\n      <h1>Your starter is running</h1>\n      <p>{${JSON.stringify(answers.projectDescription)}}</p>\n      <p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p>\n    </main>\n  )\n}\n`
  files['src/app/api/health/route.ts'] = "export function GET() {\n  return Response.json({ status: 'ok' })\n}\n"
  files['src/app/page.test.tsx'] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport HomePage from './page'\n\ntest('renders the starter heading', () => {\n  render(<HomePage />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  if ((answers.testing || 'basic') === 'none') delete files['src/app/page.test.tsx']
  testFiles(files, '', stack, answers.testing || 'basic')
  if (stack.backendKey === 'supabase') Object.assign(files, supabaseWebFiles(true))
  if (stack.backendKey === 'postgres') Object.assign(files, prismaFiles())
  return files
}

function supabaseWebFiles(isNext) {
  if (!isNext) return {
    'src/lib/supabase.ts': `import { createClient } from '@supabase/supabase-js'\n\nconst url = import.meta.env.VITE_SUPABASE_URL\nconst key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY\nif (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY')\nexport const supabase = createClient(url, key)\n`,
  }
  return {
    'src/lib/supabase/client.ts': `import { createBrowserClient } from '@supabase/ssr'\n\nexport function createClient() {\n  return createBrowserClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n  )\n}\n`,
    'src/lib/supabase/server.ts': `import { createServerClient } from '@supabase/ssr'\nimport { cookies } from 'next/headers'\n\nexport async function createClient() {\n  const store = await cookies()\n  return createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    { cookies: { getAll: () => store.getAll(), setAll: (values) => {\n      try { values.forEach(({ name, value, options }) => store.set(name, value, options)) } catch { /* Proxy owns refresh writes. */ }\n    } } },\n  )\n}\n`,
    'src/lib/supabase/proxy.ts': `import { createServerClient } from '@supabase/ssr'\nimport { NextResponse, type NextRequest } from 'next/server'\n\nexport async function updateSession(request: NextRequest) {\n  let response = NextResponse.next({ request })\n  const supabase = createServerClient(\n    process.env.NEXT_PUBLIC_SUPABASE_URL!,\n    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,\n    { cookies: {\n      getAll: () => request.cookies.getAll(),\n      setAll: (values) => {\n        values.forEach(({ name, value }) => request.cookies.set(name, value))\n        response = NextResponse.next({ request })\n        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options))\n      },\n    } },\n  )\n  await supabase.auth.getClaims()\n  return response\n}\n`,
    'src/proxy.ts': `import type { NextRequest } from 'next/server'\nimport { updateSession } from '@/lib/supabase/proxy'\n\nexport async function proxy(request: NextRequest) { return updateSession(request) }\n\nexport const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }\n`,
    'src/app/auth/callback/route.ts': `import { NextResponse, type NextRequest } from 'next/server'\nimport { createClient } from '@/lib/supabase/server'\n\nexport async function GET(request: NextRequest) {\n  const code = request.nextUrl.searchParams.get('code')\n  const destination = new URL('/', request.url)\n  if (!code) return NextResponse.redirect(destination)\n  const supabase = await createClient()\n  const { error } = await supabase.auth.exchangeCodeForSession(code)\n  if (error) destination.searchParams.set('authError', 'callback_failed')\n  return NextResponse.redirect(destination)\n}\n`,
  }
}

function prismaFiles() {
  return {
    'prisma/schema.prisma': `generator client {\n  provider = "prisma-client-js"\n}\n\ndatasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nmodel Example {\n  id        String   @id @default(uuid())\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  @@map("examples")\n}\n`,
  }
}

function viteFiles(answers, stack) {
  const root = 'frontend'
  const files = {}
  files[`${root}/package.json`] = packageFile(answers, stack)
  files[`${root}/tsconfig.json`] = json({ compilerOptions: { target: 'ES2022', useDefineForClassFields: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], allowJs: false, skipLibCheck: true, esModuleInterop: true, allowSyntheticDefaultImports: true, strict: true, forceConsistentCasingInFileNames: true, module: 'ESNext', moduleResolution: 'Bundler', resolveJsonModule: true, isolatedModules: true, noEmit: true, jsx: 'react-jsx', paths: { '@/*': ['./src/*'] } }, include: ['src', 'vite.config.ts', 'vitest.config.ts'] })
  files[`${root}/index.html`] = `<!doctype html>\n<html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="${html(answers.projectDescription)}" /><title>${html(answers.projectName)}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`
  files[`${root}/vite.config.ts`] = `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n${stack.styleId === 'tailwind' ? "import tailwindcss from '@tailwindcss/vite'\n" : ''}\nexport default defineConfig({ plugins: [react()${stack.styleId === 'tailwind' ? ', tailwindcss()' : ''}] })\n`
  files[`${root}/eslint.config.js`] = `import js from '@eslint/js'\nimport tseslint from 'typescript-eslint'\n\nexport default tseslint.config(\n  { ignores: ['dist', 'coverage', 'playwright-report'] },\n  js.configs.recommended,\n  ...tseslint.configs.recommended,\n  { files: ['**/*.{ts,tsx}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } } },\n)\n`
  files[`${root}/src/vite-env.d.ts`] = "/// <reference types=\"vite/client\" />\n"
  files[`${root}/src/main.tsx`] = `import { StrictMode } from 'react'\nimport { createRoot } from 'react-dom/client'\nimport { App } from './App'\nimport './styles.css'\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)\n`
  files[`${root}/src/App.tsx`] = `export function App() {\n  return <main><p>create-win-project</p><h1>Your starter is running</h1><p>{${JSON.stringify(answers.projectDescription)}}</p><p>Read <code>AGENTS.md</code> before your first agent-assisted change.</p></main>\n}\n`
  files[`${root}/src/styles.css`] = `${stack.styleId === 'tailwind' ? '@import "tailwindcss";\n' : ''}:root { color-scheme: light dark; font-family: system-ui, sans-serif; }\n* { box-sizing: border-box; }\nbody { margin: 0; }\nmain { max-width: 48rem; margin: 0 auto; padding: 4rem 1.5rem; }\n`
  if ((answers.testing || 'basic') !== 'none') files[`${root}/src/App.test.tsx`] = `import { expect, test } from 'vitest'\nimport { render, screen } from '@testing-library/react'\nimport { App } from './App'\n\ntest('renders the starter heading', () => {\n  render(<App />)\n  expect(screen.getByRole('heading', { name: 'Your starter is running' })).toBeInTheDocument()\n})\n`
  testFiles(files, root, stack, answers.testing || 'basic')
  if (stack.backendKey === 'supabase') {
    for (const [name, value] of Object.entries(supabaseWebFiles(false))) files[`${root}/${name}`] = value
  }
  return files
}

function nativeFiles(answers, stack) {
  const files = {
    'package.json': packageFile(answers, stack),
    'app.json': json({ expo: { name: answers.projectName, slug: answers.projectName, version: '1.0.0', orientation: 'portrait', scheme: answers.projectName, userInterfaceStyle: 'automatic', plugins: stack.backendKey === 'supabase' ? ['expo-router', 'expo-secure-store'] : ['expo-router'], experiments: { typedRoutes: true } } }),
    'tsconfig.json': json({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true, types: ['jest'], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx', '.expo/types/**/*.ts', 'expo-env.d.ts'] }),
    'expo-env.d.ts': "/// <reference types=\"expo/types\" />\n",
    'app/_layout.tsx': `import { Stack } from 'expo-router'\n\nexport default function RootLayout() { return <Stack screenOptions={{ headerTitle: '${answers.projectName}' }} /> }\n`,
    'app/index.tsx': `import { StyleSheet, Text, View } from 'react-native'\nimport { SafeAreaView } from 'react-native-safe-area-context'\n\nexport default function HomeScreen() {\n  return <SafeAreaView style={styles.safe}><View style={styles.container}><Text>create-win-project</Text><Text accessibilityRole="header">Your starter is running</Text><Text>{${JSON.stringify(answers.projectDescription)}}</Text></View></SafeAreaView>\n}\nconst styles = StyleSheet.create({ safe: { flex: 1 }, container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 } })\n`,
  }
  testFiles(files, '', stack, answers.testing || 'basic')
  if (stack.backendKey === 'supabase') files['lib/supabase.ts'] = `import { createClient } from '@supabase/supabase-js'\nimport * as SecureStore from 'expo-secure-store'\n\nconst storage = { getItem: SecureStore.getItemAsync, setItem: SecureStore.setItemAsync, removeItem: SecureStore.deleteItemAsync }\nexport const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })\n`
  return files
}

function springFiles(answers, vars) {
  const pkg = vars.PACKAGE_NAME
  const pkgPath = vars.PACKAGE_PATH
  const appName = `${answers.projectName.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Application`
  const files = {
    'backend/pom.xml': `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">\n  <modelVersion>4.0.0</modelVersion>\n  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>${vars.SPRING_BOOT_VERSION}</version><relativePath/></parent>\n  <groupId>${pkg}</groupId><artifactId>${answers.projectName}</artifactId><version>0.0.1-SNAPSHOT</version>\n  <properties><java.version>${vars.JAVA_VERSION}</java.version></properties>\n  <dependencies>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-actuator</artifactId></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>\n    <dependency><groupId>org.flywaydb</groupId><artifactId>flyway-database-postgresql</artifactId></dependency>\n    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>\n    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc-test</artifactId><scope>test</scope></dependency>\n    <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>\n    <dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId><scope>test</scope></dependency>\n  </dependencies>\n  <build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>\n</project>\n`,
    [`backend/src/main/java/${pkgPath}/${appName}.java`]: `package ${pkg};\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;\n\n@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)\npublic class ${appName} {\n    public static void main(String[] args) { SpringApplication.run(${appName}.class, args); }\n}\n`,
    [`backend/src/main/java/${pkgPath}/health/HealthController.java`]: `package ${pkg}.health;\n\nimport java.util.Map;\nimport org.springframework.web.bind.annotation.GetMapping;\nimport org.springframework.web.bind.annotation.RestController;\n\n@RestController\npublic class HealthController {\n    @GetMapping("/api/health")\n    Map<String, String> health() { return Map.of("status", "ok"); }\n}\n`,
    [`backend/src/main/java/${pkgPath}/config/SecurityConfig.java`]: `package ${pkg}.config;\n\nimport org.springframework.context.annotation.Bean;\nimport org.springframework.context.annotation.Configuration;\nimport org.springframework.security.config.annotation.web.builders.HttpSecurity;\nimport org.springframework.security.web.SecurityFilterChain;\n\n@Configuration\npublic class SecurityConfig {\n    @Bean\n    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {\n        return http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/health", "/actuator/health").permitAll().anyRequest().denyAll()).build();\n    }\n}\n`,
    'backend/src/main/resources/application.yml': `spring:\n  application:\n    name: ${answers.projectName}\n  datasource:\n    url: \${DATABASE_URL:jdbc:postgresql://localhost:5432/${answers.projectName.replaceAll('-', '_')}}\n    username: \${POSTGRES_USER:postgres}\n    password: \${POSTGRES_PASSWORD:postgres}\n  jpa:\n    open-in-view: false\n    hibernate:\n      ddl-auto: validate\n  flyway:\n    enabled: true\nmanagement:\n  endpoints:\n    web:\n      exposure:\n        include: health,info\n  endpoint:\n    health:\n      probes:\n        enabled: true\nserver:\n  error:\n    include-message: never\n`,
    'backend/src/main/resources/db/migration/V1__baseline.sql': 'CREATE TABLE examples (\n  id UUID PRIMARY KEY,\n  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),\n  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()\n);\n',
    'backend/src/test/resources/application.yml': 'spring:\n  datasource:\n    url: jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1\n    driver-class-name: org.h2.Driver\n  flyway:\n    enabled: false\n  jpa:\n    open-in-view: false\n    hibernate:\n      ddl-auto: none\n',
    [`backend/src/test/java/${pkgPath}/health/HealthControllerTest.java`]: `package ${pkg}.health;\n\nimport static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;\nimport static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;\nimport static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;\nimport org.junit.jupiter.api.Test;\nimport org.springframework.beans.factory.annotation.Autowired;\nimport org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;\nimport org.springframework.boot.test.context.SpringBootTest;\nimport org.springframework.test.web.servlet.MockMvc;\n\n@SpringBootTest\n@AutoConfigureMockMvc\nclass HealthControllerTest {\n    @Autowired MockMvc mvc;\n    @Test void healthIsPublic() throws Exception { mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ok")); }\n}\n`,
  }
  if ((answers.testing || 'basic') === 'none') {
    delete files['backend/src/test/resources/application.yml']
    delete files[`backend/src/test/java/${pkgPath}/health/HealthControllerTest.java`]
    for (const dependency of ['spring-boot-starter-webmvc-test', 'spring-security-test', 'h2']) {
      files['backend/pom.xml'] = files['backend/pom.xml'].replace(
        new RegExp(`\\n    <dependency><groupId>[^<]+</groupId><artifactId>${dependency}</artifactId><scope>test</scope></dependency>`),
        '',
      )
    }
  }
  return files
}

export function buildRunnableFiles(answers, stack, vars) {
  let files
  if (stack.frontendKey === 'nextjs') files = nextFiles(answers, stack)
  else if (stack.frontendKey === 'react') files = viteFiles(answers, stack)
  else files = nativeFiles(answers, stack)
  if (stack.backendKey === 'springboot') Object.assign(files, springFiles(answers, vars))
  Object.assign(files, envFiles(answers, stack))
  files['create-win-project.profile.json'] = json({
    schemaVersion: 1,
    profile: stack.profile.id,
    status: stack.profile.status,
    supportedUntil: stack.profile.supportedUntil,
    stack: stack.key,
    runtimes: stack.profile.runtimes,
  })
  files['README.md'] = projectReadme(answers, stack)
  return files
}
