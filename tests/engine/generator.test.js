import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { generateProject } from '../../lib/generator.js'

const root = path.resolve(import.meta.dirname, '..', '..')
const temporaryDirectories = []

async function generate(overrides) {
  const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'create-win-project-test-'))
  temporaryDirectories.push(workingDirectory)
  const previous = process.cwd()
  process.chdir(workingDirectory)
  try {
    await generateProject({
      projectName: 'example-app',
      projectDescription: 'A runnable test fixture',
      frontend: 'nextjs',
      backend: 'supabase',
      styling: 'tailwind',
      architecture: 'medium',
      authentication: 'not-yet',
      authAudience: 'website',
      testing: 'basic',
      docker: false,
      makefile: false,
      githubActions: true,
      expectedConcerns: [],
      ...overrides,
    }, root)
  } finally {
    process.chdir(previous)
  }
  return path.join(workingDirectory, overrides.projectName || 'example-app')
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)))
})

describe('runnable project contract', () => {
  it.each([
    ['no-frontend', 'api', 'medium'],
    ['react', 'separate', 'small'],
  ])('generates a Laravel API for %s (%s)', async (frontend, applicationShape, architecture) => {
    const destination = await generate({
      frontend,
      backend: 'laravel',
      applicationShape,
      architecture,
      styling: frontend === 'react' ? 'tailwind' : undefined,
      githubActions: false,
      projectName: `laravel-${frontend}`,
    })
    const laravelRoot = frontend === 'no-frontend' ? destination : path.join(destination, 'backend')
    const composer = await fs.readJson(path.join(laravelRoot, 'composer.json'))
    expect(composer.require['laravel/framework']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(composer['require-dev']['larastan/larastan']).toMatch(/^\d+\.\d+\.\d+$/)
    expect(await fs.pathExists(path.join(laravelRoot, 'artisan'))).toBe(true)
    expect(await fs.pathExists(path.join(laravelRoot, 'routes/api.php'))).toBe(true)
    expect(await fs.pathExists(path.join(laravelRoot, 'tests/Feature/HealthTest.php'))).toBe(true)
    expect(await fs.readFile(path.join(laravelRoot, '.php-version'), 'utf8')).toBe('8.5.10\n')
    expect(await fs.readFile(path.join(destination, 'docs/guides/toolchain.md'), 'utf8')).toContain('Composer')
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.applicationShape).toBe(applicationShape)
  })

  it.each([
    ['none', 'public'],
    ['not-yet', 'undecided'],
    ['yes', 'sanctum-spa'],
  ])('generates honest Laravel authentication for %s', async (authentication, model) => {
    const destination = await generate({
      frontend: 'react', backend: 'laravel', applicationShape: 'separate', architecture: 'medium',
      authentication, authAudience: 'website', styling: 'tailwind', githubActions: false,
      projectName: `laravel-auth-${authentication}`,
    })
    const composer = await fs.readJson(path.join(destination, 'backend/composer.json'))
    const routes = await fs.readFile(path.join(destination, 'backend/routes/api.php'), 'utf8')
    expect(composer.require['laravel/sanctum'] !== undefined).toBe(authentication === 'yes')
    expect(routes.includes("middleware('auth:sanctum')")).toBe(authentication === 'yes')
    expect(routes.includes('Authentication is not configured.')).toBe(authentication === 'not-yet')
    expect(await fs.pathExists(path.join(destination, 'backend/app/Http/Controllers/AuthController.php'))).toBe(authentication === 'yes')
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.authentication.model).toBe(model)
  })

  it('generates a pinned OIDC resource-server adapter for Laravel multi-client APIs', async () => {
    const destination = await generate({
      frontend: 'no-frontend', backend: 'laravel', applicationShape: 'api', architecture: 'medium',
      authentication: 'yes', authAudience: 'multi-client', githubActions: false,
      projectName: 'laravel-oidc-api',
    })
    const composer = await fs.readJson(path.join(destination, 'composer.json'))
    expect(composer.require['auth0/login']).toBe('7.22.0')
    expect(await fs.pathExists(path.join(destination, 'config/auth0.php'))).toBe(true)
    expect(await fs.readFile(path.join(destination, 'routes/api.php'), 'utf8')).toContain("Auth::shouldUse('auth0-api')")
    expect(await fs.readFile(path.join(destination, '.env.example'), 'utf8')).toContain('AUTH0_AUDIENCE=')
  })

  it.each([
    ['blade', 'resources/views/home.blade.php', null],
    ['livewire', 'app/Livewire/HomePage.php', 'livewire/livewire'],
    ['inertia-react', 'resources/js/Pages/Home.jsx', 'inertiajs/inertia-laravel'],
  ])('generates the %s Laravel full-stack UI', async (laravelUi, expectedFile, composerPackage) => {
    const destination = await generate({
      frontend: 'laravel-ui', backend: 'laravel', applicationShape: 'fullstack', laravelUi,
      architecture: 'medium', authentication: 'yes', styling: 'tailwind', githubActions: false,
      projectName: `laravel-${laravelUi}`,
    })
    expect(await fs.pathExists(path.join(destination, expectedFile))).toBe(true)
    const composer = await fs.readJson(path.join(destination, 'composer.json'))
    if (composerPackage) expect(composer.require[composerPackage]).toMatch(/^\d+\.\d+\.\d+$/)
    if (laravelUi === 'inertia-react') {
      const packageJson = await fs.readJson(path.join(destination, 'package.json'))
      expect(packageJson.dependencies['@inertiajs/react']).toMatch(/^\d+\.\d+\.\d+$/)
      expect(packageJson.packageManager).toBe('npm@11.19.0')
      expect(await fs.readFile(path.join(destination, '.node-version'), 'utf8')).toBe('24.20.0\n')
    }
    const rules = await fs.readFile(path.join(destination, 'RULES.md'), 'utf8')
    expect(rules).toContain(`platform/laravel-ui/${laravelUi}/architecture.md`)
  })

  it('keeps Laravel Docker build and run as separate operations', async () => {
    const destination = await generate({
      frontend: 'no-frontend', backend: 'laravel', applicationShape: 'api', architecture: 'medium',
      authentication: 'not-yet', docker: true, makefile: true, githubActions: false,
      projectName: 'laravel-docker-api',
    })
    const makefile = await fs.readFile(path.join(destination, 'Makefile'), 'utf8')
    expect(makefile).toMatch(/build:.*\n\t\$\(COMPOSE\) build/)
    expect(makefile).toMatch(/run:.*\n\t\$\(COMPOSE\) up -d/)
    expect(makefile.match(/run:.*\n\t.*--build/)).toBeNull()
    const compose = await fs.readFile(path.join(destination, 'docker-compose.yml'), 'utf8')
    expect(compose).toContain('backend:')
    expect(compose).toContain('postgres:16-alpine')
    expect(await fs.pathExists(path.join(destination, 'Dockerfile.dev'))).toBe(true)
    const setup = await fs.readFile(path.join(destination, 'docs/guides/setup.md'), 'utf8')
    expect(setup).toContain('Default local setup')
    expect(setup).toContain('Optional Docker setup')
  })

  it('generates backend-only Docker services for React Native with Laravel', async () => {
    const destination = await generate({
      frontend: 'react-native', backend: 'laravel', applicationShape: 'mobile', architecture: 'small',
      authentication: 'not-yet', authAudience: 'multi-client', docker: true, makefile: false,
      githubActions: false, projectName: 'mobile-laravel-docker',
    })
    const compose = await fs.readFile(path.join(destination, 'docker-compose.yml'), 'utf8')

    expect(compose).toContain('  backend:')
    expect(compose).toContain('  db:')
    expect(compose).not.toContain('  frontend:')
    expect(await fs.pathExists(path.join(destination, 'backend/Dockerfile.dev'))).toBe(true)
  })

  it('generates Laravel CI in the correct application directory', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'laravel', applicationShape: 'separate', architecture: 'medium',
      authentication: 'none', docker: false, makefile: false, githubActions: true,
      projectName: 'laravel-ci-api',
    })
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(workflow).toContain('working-directory: backend')
    expect(workflow).toContain('php-version: "8.5.10"')
    expect(workflow).toContain('postgres:16-alpine')
    expect(workflow).toContain('composer check')
  })

  it.each([
    ['nextjs', 'none', 'tailwind'],
    ['nextjs', 'supabase', 'tailwind'],
    ['nextjs', 'springboot', 'css-modules'],
    ['nextjs', 'postgres', 'tailwind'],
    ['react', 'supabase', 'tailwind'],
    ['react', 'none', 'css-modules'],
    ['react', 'springboot', 'css-modules'],
    ['react-native', 'supabase', undefined],
    ['react-native', 'springboot', undefined],
    ['react-native', 'none', undefined],
  ])('generates the required foundation for %s + %s', async (frontend, backend, styling) => {
    const destination = await generate({
      frontend,
      backend,
      styling,
      packageName: backend === 'springboot' ? 'com.example' : undefined,
      projectName: `${frontend}-${backend}`,
    })
    const packageRoot = frontend === 'react' ? path.join(destination, 'frontend') : destination
    const packageJson = await fs.readJson(path.join(packageRoot, 'package.json'))
    const setupGuide = await fs.readFile(path.join(destination, 'docs/guides/setup.md'), 'utf8')
    expect(packageJson.scripts.dev).toBeTruthy()
    expect(packageJson.scripts.build).toBeTruthy()
    expect(packageJson.scripts.typecheck).toBeTruthy()
    expect(packageJson.scripts.format).toBe('prettier --write .')
    expect(packageJson.scripts['format:check']).toBe('prettier --check .')
    expect(packageJson.scripts.check).toBeTruthy()
    expect(packageJson.devDependencies.prettier).toMatch(/^\d+\.\d+\.\d+$/)
    expect(packageJson.packageManager).toBe('npm@11.19.0')
    expect(packageJson.engines).toEqual({ node: '>=22.14.0', npm: '>=11.19.0' })
    expect(await fs.readFile(path.join(packageRoot, '.node-version'), 'utf8')).toBe('24.20.0\n')
    expect(await fs.readFile(path.join(packageRoot, '.npmrc'), 'utf8')).toBe('engine-strict=true\n')
    const toolchain = await fs.readFile(path.join(destination, 'docs/guides/toolchain.md'), 'utf8')
    expect(toolchain).toContain('never as global installations')
    expect(toolchain).toContain('Different projects can retain different tested dependency versions')
    if (backend !== 'laravel') {
      expect(setupGuide).toContain('Node.js 22.14.0 or newer with npm 11.19.0 or newer')
      expect(setupGuide).toContain('tested on Node.js 24.20.0')
    }
    expect(await fs.pathExists(path.join(destination, 'AGENTS.md'))).toBe(true)
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.schemaVersion).toBe(3)
    expect(profile.compatibilityProfile.id).toBe('2026.09')
    expect(profile.architectureProfile).toBe('medium')
    expect(profile.authentication).toEqual({
      intent: 'not-yet', model: 'undecided', audience: 'website',
    })
    expect(profile.stack).toBe(`${frontend}-${backend}`)
    expect(await fs.readFile(path.join(destination, 'RULES.md'), 'utf8')).not.toMatch(/section not found|MISSING/)
    if (frontend === 'nextjs') expect(await fs.pathExists(path.join(destination, 'src/app/page.tsx'))).toBe(true)
    if (frontend === 'react') expect(await fs.pathExists(path.join(destination, 'frontend/src/main.tsx'))).toBe(true)
    if (frontend === 'react-native') expect(await fs.pathExists(path.join(destination, 'app/_layout.tsx'))).toBe(true)
    if (backend === 'springboot') {
      expect(await fs.pathExists(path.join(destination, 'backend/pom.xml'))).toBe(true)
      expect(await fs.pathExists(path.join(destination, 'backend/mvnw'))).toBe(true)
      expect(await fs.pathExists(path.join(destination, 'backend/mvnw.cmd'))).toBe(true)
      expect((await fs.stat(path.join(destination, 'backend/mvnw'))).mode & 0o111).not.toBe(0)
      expect(await fs.readFile(path.join(destination, 'backend/.java-version'), 'utf8')).toBe('21\n')
      expect(toolchain).toContain('generated wrapper')
    }
  })

  it('makes the testing choice real', async () => {
    const destination = await generate({ testing: 'none', projectName: 'without-tests' })
    const packageJson = await fs.readJson(path.join(destination, 'package.json'))
    expect(packageJson.scripts.test).toBeUndefined()
    expect(packageJson.devDependencies.vitest).toBeUndefined()
    expect(await fs.pathExists(path.join(destination, 'src/app/page.test.tsx'))).toBe(false)
    expect(await fs.readFile(path.join(destination, '.github/workflows/ci-frontend.yml'), 'utf8')).not.toContain('npm run test')
  })

  it('honors the Makefile option for a frontend-only project', async () => {
    const destination = await generate({ backend: 'none', makefile: true, projectName: 'frontend-only' })
    const makefile = await fs.readFile(path.join(destination, 'Makefile'), 'utf8')
    expect(makefile).toContain('npm --prefix $(NPM_DIR) run check')
  })

  it('removes Spring test fixtures and CI steps when testing is none', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'springboot', styling: 'css-modules', testing: 'none',
      packageName: 'com.example', projectName: 'spring-without-tests',
    })
    const pom = await fs.readFile(path.join(destination, 'backend/pom.xml'), 'utf8')
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(await fs.pathExists(path.join(destination, 'backend/src/test/resources/application.yml'))).toBe(false)
    expect(pom).not.toContain('spring-boot-starter-webmvc-test')
    expect(pom).not.toContain('spring-security-test')
    expect(workflow).not.toContain('mvn --batch-mode test')
  })

  it('generates current Supabase SSR session plumbing for Next.js', async () => {
    const destination = await generate({ projectName: 'supabase-auth', authentication: 'yes' })
    for (const file of [
      'src/lib/supabase/client.ts',
      'src/lib/supabase/server.ts',
      'src/lib/supabase/proxy.ts',
      'src/proxy.ts',
      'src/app/auth/callback/route.ts',
      'src/app/login/actions.ts',
      'src/app/login/page.tsx',
    ]) expect(await fs.pathExists(path.join(destination, file))).toBe(true)
    const env = await fs.readFile(path.join(destination, '.env.example'), 'utf8')
    expect(env).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(env).not.toContain('NEXT_PUBLIC_NEXT_PUBLIC_')
    expect(env).not.toContain('SERVICE_ROLE')
  })

  it('can reproduce the previous compatibility profile', async () => {
    const destination = await generate({ projectName: 'previous-profile', compatibilityProfile: '2026.08' })
    const metadata = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    const packageJson = await fs.readJson(path.join(destination, 'package.json'))
    expect(metadata.compatibilityProfile.status).toBe('previous')
    expect(metadata.compatibilityProfile.id).toBe('2026.08')
    expect(packageJson.dependencies.next).toBe('16.3.4')
    expect(Object.values(packageJson.dependencies).every((version) => !/^[~^]/.test(version))).toBe(true)
  })

  it('uses backend-specific public values in frontend CI', async () => {
    const destination = await generate({ frontend: 'react', backend: 'supabase', projectName: 'vite-ci' })
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-frontend.yml'), 'utf8')
    expect(workflow).toContain('VITE_SUPABASE_URL')
    expect(workflow).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
    expect(workflow).not.toContain('VITE_API_URL')
  })

  it('does not invent Spring authentication secrets or external test services', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'springboot', styling: 'css-modules',
      packageName: 'com.example', projectName: 'spring-ci',
    })
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(workflow).not.toContain('JWT_SECRET')
    expect(workflow).not.toContain('services:')
  })

  it('renders Docker paths relative to each build context', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'springboot', styling: 'css-modules', docker: true,
      packageName: 'com.example', projectName: 'docker-context',
    })
    const compose = await fs.readFile(path.join(destination, 'docker-compose.yml'), 'utf8')
    expect(compose).toContain('context: frontend')
    expect(compose).toContain('dockerfile: Dockerfile.dev')
    expect(compose).toContain('./frontend:/app')
    expect(compose).not.toContain('dockerfile: frontend/Dockerfile.dev')
    expect(compose).toContain('postgres:16-alpine')
    expect(compose).toContain('${FRONTEND_HOST_PORT:-5173}:5173')
    expect(compose).toContain('${BACKEND_HOST_PORT:-8080}:8080')
    expect(compose).toContain('${POSTGRES_HOST_PORT:-5432}:5432')
    const environments = await fs.readFile(path.join(destination, 'docs/guides/development-environments.md'), 'utf8')
    expect(environments).toContain('Default local workflow')
    expect(environments).toContain('Docker Engine 27 or newer')
    expect(environments).toContain('never required to run create-win-project itself')
  })

  it('does not approximate Supabase with a bare PostgreSQL container', async () => {
    const destination = await generate({ docker: true, projectName: 'supabase-compose' })
    const compose = await fs.readFile(path.join(destination, 'docker-compose.yml'), 'utf8')
    expect(compose).toContain('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
    expect(compose).not.toContain('image: postgres')
  })

  it('keeps Docker optional and documents the local workflow', async () => {
    const destination = await generate({ backend: 'none', docker: false, projectName: 'local-default' })
    expect(await fs.pathExists(path.join(destination, 'docker-compose.yml'))).toBe(false)
    const environments = await fs.readFile(path.join(destination, 'docs/guides/development-environments.md'), 'utf8')
    expect(environments).toContain('Default local workflow')
    expect(environments).toContain('Docker files were not selected')
  })

  it('keeps mobile devices and emulators outside containers', async () => {
    const destination = await generate({ frontend: 'react-native', backend: 'supabase', applicationShape: 'mobile', projectName: 'mobile-local' })
    const environments = await fs.readFile(path.join(destination, 'docs/guides/development-environments.md'), 'utf8')
    expect(environments).toContain('iOS Simulator or Android Emulator')
    expect(environments).toContain('do not replace the local device/emulator workflow')
  })

  it('refuses to overwrite a non-empty destination', async () => {
    const workingDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'create-win-project-test-'))
    temporaryDirectories.push(workingDirectory)
    await fs.ensureDir(path.join(workingDirectory, 'occupied'))
    await fs.writeFile(path.join(workingDirectory, 'occupied/keep.txt'), 'mine')
    const previous = process.cwd()
    process.chdir(workingDirectory)
    try {
      await expect(generateProject({
        projectName: 'occupied', projectDescription: 'Must remain safe', frontend: 'nextjs',
        backend: 'supabase', styling: 'tailwind', testing: 'none',
      }, root)).rejects.toThrow(/already exists/)
    } finally {
      process.chdir(previous)
    }
    expect(await fs.readFile(path.join(workingDirectory, 'occupied/keep.txt'), 'utf8')).toBe('mine')
  })

  it('escapes arbitrary descriptions into valid source text', async () => {
    const destination = await generate({ projectName: 'escaped-description', projectDescription: `It's <useful>\nand safe` })
    const page = await fs.readFile(path.join(destination, 'src/app/page.tsx'), 'utf8')
    expect(page).toContain(`{"It's <useful>\\nand safe"}`)
  })
})
