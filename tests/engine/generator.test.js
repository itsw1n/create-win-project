import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { generateProject } from '../../src/engine/create-project.js'

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

async function sourceText(directory) {
  const contents = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) contents.push(await sourceText(target))
    else if (/\.(?:css|jsx?|tsx?)$/.test(entry.name)) contents.push(await fs.readFile(target, 'utf8'))
  }
  return contents.flat().join('\n')
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
      architecture: 'medium', authentication: 'yes', styling: 'tailwind', githubActions: true,
      projectName: `laravel-${laravelUi}`,
    })
    expect(await fs.pathExists(path.join(destination, expectedFile))).toBe(true)
    const composer = await fs.readJson(path.join(destination, 'composer.json'))
    const packageJson = await fs.readJson(path.join(destination, 'package.json'))
    expect(packageJson.devDependencies.tailwindcss).toBe('4.3.3')
    expect(packageJson.devDependencies['@tailwindcss/vite']).toBe('4.3.3')
    expect(await fs.readFile(path.join(destination, 'resources/css/app.css'), 'utf8')).toContain('@theme')
    expect(await fs.readFile(path.join(destination, 'vite.config.js'), 'utf8')).toContain('tailwindcss()')
    expect(await fs.pathExists(path.join(destination, 'resources/views/components/layout/container.blade.php'))).toBe(true)
    expect(await fs.pathExists(path.join(destination, 'resources/views/components/common/button.blade.php'))).toBe(true)
    const dockerfile = await fs.readFile(path.join(destination, 'Dockerfile'), 'utf8')
    expect(dockerfile).toContain('FROM node:24.20.0-alpine AS assets')
    expect(dockerfile).toContain('COPY --from=assets /app/public/build ./public/build')
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(workflow).toContain('npm test --if-present')
    expect(workflow).toContain('npm run build')
    const security = await fs.readFile(path.join(destination, '.github/workflows/security.yml'), 'utf8')
    expect(security).toContain('npm audit --audit-level=high')
    if (composerPackage) expect(composer.require[composerPackage]).toMatch(/^\d+\.\d+\.\d+$/)
    if (laravelUi === 'inertia-react') {
      expect(packageJson.dependencies['@inertiajs/react']).toMatch(/^\d+\.\d+\.\d+$/)
      expect(packageJson.dependencies['class-variance-authority']).toBe('0.7.1')
      expect(packageJson.packageManager).toBe('npm@11.19.0')
      expect(await fs.readFile(path.join(destination, '.node-version'), 'utf8')).toBe('24.20.0\n')
      expect(await fs.pathExists(path.join(destination, 'resources/js/components/layout/Container.jsx'))).toBe(true)
      expect(await fs.pathExists(path.join(destination, 'resources/js/components/common/Button.test.jsx'))).toBe(true)
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
    expect(compose).not.toContain('API_URL: http://localhost:8000')
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
    ['no-frontend', 'api', 'medium'],
    ['react', 'separate', 'small'],
  ])('generates a FastAPI service for %s (%s)', async (frontend, applicationShape, architecture) => {
    const projectName = `fastapi-${frontend}`
    const destination = await generate({
      frontend,
      backend: 'fastapi',
      applicationShape,
      architecture,
      styling: frontend === 'react' ? 'tailwind' : undefined,
      githubActions: false,
      projectName,
    })
    const apiRoot = frontend === 'no-frontend' ? destination : path.join(destination, 'backend')
    const pyproject = await fs.readFile(path.join(apiRoot, 'pyproject.toml'), 'utf8')
    expect(pyproject).toContain('fastapi==0.141.1')
    expect(pyproject).toContain('sqlalchemy==2.0.52')
    expect(await fs.pathExists(path.join(apiRoot, 'README.md'))).toBe(true)
    expect(await fs.pathExists(path.join(apiRoot, 'app/main.py'))).toBe(true)
    expect(await fs.pathExists(path.join(apiRoot, 'alembic/env.py'))).toBe(true)
    expect(await fs.pathExists(path.join(apiRoot, 'tests/test_health.py'))).toBe(true)
    expect(await fs.readFile(path.join(apiRoot, '.python-version'), 'utf8')).toBe('3.14.7\n')
    expect(await fs.readFile(path.join(destination, 'docs/guides/toolchain.md'), 'utf8')).toContain('uv')
    const architectureGuide = await fs.readFile(path.join(destination, 'docs/architecture/overview.md'), 'utf8')
    expect(architectureGuide).toContain(`\`\`\`text\n${projectName}/`)
    expect(architectureGuide).toContain('main.py')
    expect(architectureGuide).toContain('playbooks/stack/fastapi/structure.md')
    if (frontend === 'react') expect(architectureGuide).toContain('styles.css')
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.applicationShape).toBe(applicationShape)
  })

  it.each([
    ['none', 'public'],
    ['not-yet', 'undecided'],
    ['yes', 'oidc'],
  ])('generates honest FastAPI authentication for %s', async (authentication, model) => {
    const destination = await generate({
      frontend: 'react', backend: 'fastapi', applicationShape: 'separate', architecture: 'medium',
      authentication, authAudience: 'website', styling: 'tailwind', githubActions: false,
      projectName: `fastapi-auth-${authentication}`,
    })
    const security = await fs.readFile(path.join(destination, 'backend/app/core/security.py'), 'utf8')
    expect(security.includes('PyJWKClient')).toBe(authentication === 'yes')
    expect(security.includes('403')).toBe(authentication === 'not-yet')
    const tests = await fs.readFile(path.join(destination, 'backend/tests/test_security.py'), 'utf8')
    expect(tests.includes('401')).toBe(authentication === 'yes')
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.authentication.model).toBe(model)
  })

  it('generates backend-only Docker services for React Native with FastAPI', async () => {
    const destination = await generate({
      frontend: 'react-native', backend: 'fastapi', applicationShape: 'mobile', architecture: 'small',
      authentication: 'not-yet', authAudience: 'multi-client', docker: true, makefile: false,
      githubActions: false, projectName: 'mobile-fastapi-docker',
    })
    const compose = await fs.readFile(path.join(destination, 'docker-compose.yml'), 'utf8')

    expect(compose).toContain('  backend:')
    expect(compose).toContain('  db:')
    expect(compose).not.toContain('  frontend:')
    expect(compose).toContain('postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}')
    expect(await fs.pathExists(path.join(destination, 'backend/Dockerfile.dev'))).toBe(true)
    const dockerfile = await fs.readFile(path.join(destination, 'backend/Dockerfile.dev'), 'utf8')
    expect(dockerfile).toContain('uv sync --frozen --no-install-project')
    expect(dockerfile.indexOf('COPY . .')).toBeLessThan(dockerfile.lastIndexOf('uv sync --frozen'))
  })

  it('generates FastAPI CI in the correct application directory', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'fastapi', applicationShape: 'separate', architecture: 'medium',
      authentication: 'none', docker: false, makefile: false, githubActions: true,
      projectName: 'fastapi-ci-api',
    })
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(workflow).toContain('working-directory: backend')
    expect(workflow).toContain('python-version: "3.14.7"')
    expect(workflow).toContain('uv sync --frozen')
    expect(workflow).toContain('postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/app_test')
    expect(workflow).toContain('uv run alembic upgrade head')
    expect(workflow).toContain('uv run pytest')

    const apiOnly = await generate({
      frontend: 'no-frontend', backend: 'fastapi', applicationShape: 'api', architecture: 'medium',
      authentication: 'none', docker: false, makefile: false, githubActions: true,
      projectName: 'fastapi-ci-root',
    })
    const rootWorkflow = await fs.readFile(path.join(apiOnly, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(rootWorkflow).toContain('working-directory: .')
    expect(rootWorkflow).toContain("      - '**'")
    expect(rootWorkflow).not.toContain('      - **\n')
  })

  it('generates stack-aware security CI for successful projects', async () => {
    const web = await generate({ frontend: 'nextjs', backend: 'springboot', packageName: 'com.example', projectName: 'secure-web' })
    const webSecurity = await fs.readFile(path.join(web, '.github/workflows/security.yml'), 'utf8')
    expect(webSecurity).toContain('npm audit --audit-level=high')
    expect(webSecurity).toContain('languages: javascript-typescript,java-kotlin')
    expect(webSecurity).toContain('dependency-review-action@2031cfc')
    expect(webSecurity).toContain('trufflehog@466da5b')

    const laravel = await generate({
      frontend: 'no-frontend', backend: 'laravel', applicationShape: 'api',
      githubActions: true, projectName: 'secure-laravel',
    })
    const laravelSecurity = await fs.readFile(path.join(laravel, '.github/workflows/security.yml'), 'utf8')
    expect(laravelSecurity).toContain('composer audit --locked')
    expect(laravelSecurity).not.toContain('npm audit')
    expect(laravelSecurity).not.toContain('github/codeql-action/init')
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
    const context = await fs.readFile(path.join(destination, 'CONTEXT.md'), 'utf8')
    expect(context).toContain('**Product status:** incomplete')
    expect(context).toContain('## Product Goals')
    expect(context).toContain('## Core Workflows')
    expect(context).toContain('## Acceptance Criteria')
    expect(context).toContain('## Generated Baseline')
    expect(context).toContain('- Architecture profile: medium')
    expect(context).toContain('- Authentication: not-yet')
    expect(context).toContain('## Product Decisions')
    expect(context).toContain('## Approved Deviations')
    expect(context).not.toContain('## Key Decisions')
    const agents = await fs.readFile(path.join(destination, 'AGENTS.md'), 'utf8')
    expect(agents).toContain('## Product context')
    expect(agents).toContain('Product status: incomplete')
    expect(agents).toContain('plan-reconciliation guidance')
    expect(agents).not.toContain('What does this product do')
    expect(await fs.pathExists(path.join(destination, 'playbooks/universal/product-planning.md'))).toBe(true)
    const profile = await fs.readJson(path.join(destination, 'create-win-project.profile.json'))
    expect(profile.schemaVersion).toBe(2)
    expect(profile.compatibilityProfile.id).toBe('2026.09')
    expect(profile.architectureProfile).toBe('medium')
    expect(profile.styling).toEqual({
      mode: frontend === 'react-native' ? 'native-styles' : styling,
    })
    expect(profile.authentication).toEqual({
      intent: 'not-yet', model: 'undecided', audience: 'website',
    })
    expect(profile.stack).toBe(`${frontend}-${backend}`)
    expect(profile.productionBaseline.tests).toBe(true)
    expect(profile.capabilities).toEqual({ uploads: 'none', backgroundJobs: 'none', offline: 'none' })
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

  it('generates honest Next.js styling foundations for both web modes', async () => {
    const tailwind = await generate({
      frontend: 'nextjs', backend: 'none', styling: 'tailwind', architecture: 'small',
      projectName: 'next-tailwind-foundation',
    })
    const tailwindPackage = await fs.readJson(path.join(tailwind, 'package.json'))
    expect(tailwindPackage.dependencies).toMatchObject({
      'class-variance-authority': '0.7.1', clsx: '2.1.1', 'tailwind-merge': '3.6.0',
    })
    expect(await fs.readFile(path.join(tailwind, 'src/app/globals.css'), 'utf8')).toContain('@theme')
    expect(await fs.readFile(path.join(tailwind, 'src/app/page.tsx'), 'utf8')).toContain('ui="hero"')
    expect(await fs.readFile(path.join(tailwind, 'src/components/layout/Container.tsx'), 'utf8')).toContain('data-ui="container"')
    expect(await fs.pathExists(path.join(tailwind, 'src/components/layout/Section.tsx'))).toBe(true)
    expect(await fs.pathExists(path.join(tailwind, 'src/components/container'))).toBe(false)
    expect(await fs.pathExists(path.join(tailwind, 'src/components/section'))).toBe(false)
    expect(await fs.readFile(path.join(tailwind, 'src/components/common/Button.tsx'), 'utf8')).toContain('cva(')
    expect(await fs.pathExists(path.join(tailwind, 'src/components/common/Button.test.tsx'))).toBe(true)

    const modules = await generate({
      frontend: 'nextjs', backend: 'springboot', styling: 'css-modules', architecture: 'medium',
      packageName: 'com.example', projectName: 'next-modules-foundation',
    })
    const modulesPackage = await fs.readJson(path.join(modules, 'package.json'))
    expect(modulesPackage.dependencies).not.toHaveProperty('class-variance-authority')
    expect(modulesPackage.dependencies).not.toHaveProperty('clsx')
    expect(modulesPackage.dependencies).not.toHaveProperty('tailwind-merge')
    const modulesPage = await fs.readFile(path.join(modules, 'src/app/page.tsx'), 'utf8')
    expect(modulesPage).toContain("import styles from './page.module.css'")
    expect(modulesPage).not.toContain('data-ui')
    expect(await sourceText(path.join(modules, 'src'))).not.toContain('data-ui')
    expect(await fs.pathExists(path.join(modules, 'src/styles/tokens.css'))).toBe(true)
    expect(await fs.pathExists(path.join(modules, 'src/components/layout/Section/Section.module.css'))).toBe(true)
    expect(await fs.pathExists(path.join(modules, 'src/components/common/Button/Button.test.tsx'))).toBe(true)
    expect(await fs.pathExists(path.join(modules, 'src/features/status/components/StarterStatus.tsx'))).toBe(false)
    expect(await fs.pathExists(path.join(modules, 'src/features/status/components/StarterStatus/StarterStatus.module.css'))).toBe(true)
  })

  it('generates honest React + Vite styling foundations for both web modes', async () => {
    const tailwind = await generate({
      frontend: 'react', backend: 'supabase', styling: 'tailwind', architecture: 'medium',
      projectName: 'vite-tailwind-foundation',
    })
    const tailwindPackage = await fs.readJson(path.join(tailwind, 'frontend/package.json'))
    expect(tailwindPackage.dependencies).toMatchObject({
      'class-variance-authority': '0.7.1', clsx: '2.1.1', 'tailwind-merge': '3.6.0',
    })
    expect(await fs.readFile(path.join(tailwind, 'frontend/src/styles.css'), 'utf8')).toContain('@theme')
    expect(await fs.readFile(path.join(tailwind, 'frontend/src/App.tsx'), 'utf8')).toContain('ui="hero"')
    expect(await fs.readFile(path.join(tailwind, 'frontend/src/components/common/Button.tsx'), 'utf8')).toContain('cva(')

    const modules = await generate({
      frontend: 'react', backend: 'none', applicationShape: 'frontend', styling: 'css-modules', architecture: 'small',
      projectName: 'vite-modules-foundation',
    })
    const modulesPackage = await fs.readJson(path.join(modules, 'frontend/package.json'))
    expect(modulesPackage.dependencies).not.toHaveProperty('clsx')
    const modulesApp = await fs.readFile(path.join(modules, 'frontend/src/App.tsx'), 'utf8')
    expect(modulesApp).toContain("import styles from './App.module.css'")
    expect(modulesApp).not.toContain('data-ui')
    expect(await sourceText(path.join(modules, 'frontend/src'))).not.toContain('data-ui')
    expect(await fs.pathExists(path.join(modules, 'frontend/src/styles/tokens.css'))).toBe(true)
    expect(await fs.pathExists(path.join(modules, 'frontend/src/components/layout/Container/Container.module.css'))).toBe(true)
    expect(await fs.pathExists(path.join(modules, 'frontend/src/components/common/Button/Button.test.tsx'))).toBe(true)
  })

  it('generates the native styling ownership foundation for Expo', async () => {
    const destination = await generate({
      frontend: 'react-native', backend: 'none', applicationShape: 'mobile', architecture: 'small',
      projectName: 'expo-native-foundation',
    })
    const home = await fs.readFile(path.join(destination, 'app/index.tsx'), 'utf8')
    expect(home).toContain("import { Screen } from '@/components/layout/Screen'")
    expect(home).toContain("import { Content } from '@/components/layout/Content'")
    expect(home).not.toContain('data-ui')
    expect(await sourceText(destination)).not.toContain('data-ui')
    expect(await fs.pathExists(path.join(destination, 'theme/tokens.ts'))).toBe(true)
    expect(await fs.pathExists(path.join(destination, 'components/common/Button.tsx'))).toBe(true)
    expect(await fs.pathExists(path.join(destination, 'components/common/Button.test.tsx'))).toBe(true)
  })

  it('keeps styling ownership stable across architecture sizes', async () => {
    for (const architecture of ['small', 'medium', 'large']) {
      for (const [frontend, styling] of [['nextjs', 'tailwind'], ['nextjs', 'css-modules'], ['react', 'tailwind'], ['react', 'css-modules']]) {
        const destination = await generate({
          frontend, backend: 'none', applicationShape: frontend === 'react' ? 'frontend' : 'fullstack',
          styling, architecture, authentication: 'none', githubActions: false,
          projectName: `${frontend}-${styling}-${architecture}`,
        })
        const sourceRoot = frontend === 'react' ? path.join(destination, 'frontend/src') : path.join(destination, 'src')
        const componentRoot = path.join(sourceRoot, 'components')
        if (styling === 'tailwind') {
          expect(await fs.pathExists(path.join(componentRoot, 'layout/Container.tsx'))).toBe(true)
          expect(await fs.pathExists(path.join(componentRoot, 'layout/Section.tsx'))).toBe(true)
          expect(await fs.pathExists(path.join(componentRoot, 'common/Button.tsx'))).toBe(true)
        } else {
          expect(await fs.pathExists(path.join(componentRoot, 'layout/Container/Container.module.css'))).toBe(true)
          expect(await fs.pathExists(path.join(componentRoot, 'layout/Section/Section.module.css'))).toBe(true)
          expect(await fs.pathExists(path.join(componentRoot, 'common/Button/Button.module.css'))).toBe(true)
        }
      }

      const native = await generate({
        frontend: 'react-native', backend: 'none', applicationShape: 'mobile', architecture,
        authentication: 'none', githubActions: false, projectName: `expo-native-${architecture}`,
      })
      expect(await fs.pathExists(path.join(native, 'components/layout/Screen.tsx'))).toBe(true)
      expect(await fs.pathExists(path.join(native, 'components/layout/Content.tsx'))).toBe(true)
      expect(await fs.pathExists(path.join(native, 'components/common/Button.tsx'))).toBe(true)
    }
  })

  it('enforces generated component ownership boundaries', async () => {
    const destination = await generate({
      frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'large',
      authentication: 'yes', projectName: 'ownership-boundaries',
    })
    const runBoundaryCheck = () => spawnSync(process.execPath, ['scripts/check-boundaries.mjs'], {
      cwd: destination, encoding: 'utf8',
    })
    const clean = runBoundaryCheck()
    expect(clean.status, clean.stderr).toBe(0)

    const button = path.join(destination, 'src/components/common/Button.tsx')
    const validButton = await fs.readFile(button, 'utf8')
    await fs.writeFile(button, `import { Section } from '@/components/layout/Section'\n${validButton}`)
    const violation = runBoundaryCheck()
    expect(violation.status).toBe(1)
    expect(violation.stderr).toContain('common cannot import layout')
  })

  it('rejects unsupported production-ready without tests paths', async () => {
    await expect(generate({ testing: 'none', projectName: 'without-tests' })).rejects.toThrow('Unknown testing setup')
  })

  it('rejects unsupported capabilities before creating a destination', async () => {
    await expect(generate({ frontend: 'nextjs', backend: 'none', uploads: 'object-storage', projectName: 'bad-uploads' }))
      .rejects.toThrow('Object storage uploads require')
    await expect(generate({ frontend: 'nextjs', backend: 'supabase', offline: 'sync', projectName: 'bad-offline' }))
      .rejects.toThrow('only for mobile')
    await expect(generate({ frontend: 'react-native', backend: 'supabase', backgroundJobs: 'queue', projectName: 'bad-queue' }))
      .rejects.toThrow('Queues require')
  })

  it('generates only explicitly selected supported capability packs', async () => {
    const destination = await generate({
      frontend: 'nextjs', backend: 'laravel', applicationShape: 'separate',
      uploads: 'object-storage', backgroundJobs: 'queue', projectName: 'capability-packs',
    })
    const upload = await fs.readJson(path.join(destination, 'config/capabilities/uploads.json'))
    const queue = await fs.readJson(path.join(destination, 'config/capabilities/queue.json'))
    expect(upload).toMatchObject({ visibility: 'private', quarantineBeforeUse: true, malwareScanRequired: true })
    expect(queue).toMatchObject({ adapter: 'laravel-queue', idempotencyRequired: true, failedJobStore: true })
    expect(await fs.pathExists(path.join(destination, 'config/capabilities/offline.json'))).toBe(false)
  })

  it('generates an EAS-ready mobile production contract', async () => {
    const destination = await generate({ frontend: 'react-native', backend: 'supabase', offline: 'cache', projectName: 'mobile-production' })
    const eas = await fs.readJson(path.join(destination, 'eas.json'))
    const app = await fs.readJson(path.join(destination, 'app.json'))
    expect(Object.keys(eas.build)).toEqual(['development', 'preview', 'production'])
    expect(app.expo.runtimeVersion).toEqual({ policy: 'appVersion' })
    expect(await fs.readFile(path.join(destination, 'lib/deep-links.ts'), 'utf8')).toContain('allowedRoutes')
    expect(await fs.readJson(path.join(destination, 'config/capabilities/offline.json'))).toMatchObject({ mode: 'cache', owner: 'mobile-client' })
  })

  it('honors the Makefile option for a frontend-only project', async () => {
    const destination = await generate({ backend: 'none', makefile: true, projectName: 'frontend-only' })
    const makefile = await fs.readFile(path.join(destination, 'Makefile'), 'utf8')
    expect(makefile).toContain('npm --prefix $(NPM_DIR) run check')
  })

  it('generates production artifacts when development Docker is disabled', async () => {
    const next = await generate({ backend: 'none', docker: false, projectName: 'next-production' })
    expect(await fs.pathExists(path.join(next, 'Dockerfile'))).toBe(true)
    expect(await fs.pathExists(path.join(next, 'Dockerfile.dev'))).toBe(false)
    const spring = await generate({ frontend: 'react', backend: 'springboot', packageName: 'com.example', docker: false, projectName: 'spring-production' })
    expect(await fs.pathExists(path.join(spring, 'frontend/Dockerfile'))).toBe(true)
    expect(await fs.pathExists(path.join(spring, 'backend/Dockerfile'))).toBe(true)
    expect(await fs.pathExists(path.join(spring, 'docker-compose.prod.yml'))).toBe(true)
    expect(await fs.pathExists(path.join(spring, 'docker-compose.yml'))).toBe(false)
  })

  it('keeps Spring test fixtures and CI in the production baseline', async () => {
    const destination = await generate({
      frontend: 'react', backend: 'springboot', styling: 'css-modules', testing: 'full',
      packageName: 'com.example', projectName: 'spring-without-tests',
    })
    const pom = await fs.readFile(path.join(destination, 'backend/pom.xml'), 'utf8')
    const workflow = await fs.readFile(path.join(destination, '.github/workflows/ci-backend.yml'), 'utf8')
    expect(await fs.pathExists(path.join(destination, 'backend/src/test/java/com/example/health/HealthControllerTest.java'))).toBe(true)
    expect(pom).toContain('spring-boot-starter-webmvc-test')
    expect(pom).toContain('spring-security-test')
    expect(workflow).toContain('./mvnw --batch-mode test')
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
        backend: 'supabase', styling: 'tailwind', testing: 'full',
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
