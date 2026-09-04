import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { buildLaravelFiles } from '../lib/stacks/laravel/generate.js'
import { buildLaravelFiles as buildLaravelFilesFromSource } from '../src/stacks/backends/laravel/generate.js'
import { laravelAdapter as legacyLaravelAdapter } from '../lib/stacks/laravel/index.js'
import { laravelAdapter } from '../src/stacks/backends/laravel/index.js'
import { laravelSessionAuthentication } from '../lib/stacks/laravel/auth/session.js'
import { sanctumSpaAuthentication } from '../lib/stacks/laravel/auth/sanctum.js'
import { laravelOidcAuthentication } from '../lib/stacks/laravel/auth/oidc.js'
import { getLaravelUi, laravelUiPromptContribution, laravelUis } from '../lib/stacks/laravel/ui/index.js'

const root = path.resolve(import.meta.dirname, '..')

async function laravelStack(overrides = {}) {
  const catalog = await loadCatalog(path.join(root, 'library'))
  return resolveStack({
    frontend: 'no-frontend',
    backend: 'laravel',
    applicationShape: 'api',
    architecture: 'medium',
    authentication: 'not-yet',
    ...overrides,
  }, catalog)
}

const answers = {
  projectName: 'example-api',
  projectDescription: 'Laravel adapter fixture',
}

describe('Laravel core adapter', () => {
  it('keeps legacy imports as identity-preserving compatibility exports', () => {
    expect(buildLaravelFiles).toBe(buildLaravelFilesFromSource)
    expect(legacyLaravelAdapter).toBe(laravelAdapter)
  })

  it('preserves the root API scaffold and fail-closed application routes', async () => {
    const files = buildLaravelFiles(answers, await laravelStack())

    expect(files).toHaveProperty('artisan')
    expect(files).toHaveProperty('composer.json')
    expect(files).toHaveProperty('app/Actions/GetSystemStatus.php')
    expect(files['routes/api.php']).toContain("Route::get('/health'")
    expect(files['routes/api.php']).toContain('Authentication is not configured.')
    expect(JSON.parse(files['composer.json']).require['laravel/framework']).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('preserves the backend directory for a separate frontend', async () => {
    const files = buildLaravelFiles(answers, await laravelStack({
      frontend: 'react',
      applicationShape: 'separate',
    }))

    expect(files).toHaveProperty('backend/artisan')
    expect(files).toHaveProperty('backend/composer.json')
    expect(files).not.toHaveProperty('artisan')
  })

  it.each([
    ['small', false, false],
    ['medium', true, false],
    ['large', true, true],
  ])('preserves the %s architecture files', async (architecture, hasAction, hasBoundary) => {
    const files = buildLaravelFiles(answers, await laravelStack({ architecture }))

    expect('app/Actions/GetSystemStatus.php' in files).toBe(hasAction)
    expect('tests/Architecture/BoundariesTest.php' in files).toBe(hasBoundary)
  })
})

describe('Laravel authentication adapter contracts', () => {
  it.each([
    ['none', 'public', false, false, false],
    ['not-yet', 'undecided', true, false, false],
    ['yes', 'sanctum-spa', false, true, false],
  ])('implements %s intent as %s', async (intent, model, failClosed, usesSanctum, usesOidc) => {
    const stack = await laravelStack({
      frontend: 'react',
      applicationShape: 'separate',
      authentication: intent,
      authAudience: 'website',
    })
    const files = buildLaravelFiles(answers, stack)
    const composer = JSON.parse(files['backend/composer.json'])
    const routes = files['backend/routes/api.php']

    expect(stack.authentication).toBe(model)
    expect(routes.includes('Authentication is not configured.')).toBe(failClosed)
    expect(composer.require[sanctumSpaAuthentication.composerPackage] !== undefined).toBe(usesSanctum)
    expect(composer.require[laravelOidcAuthentication.composerPackage] !== undefined).toBe(usesOidc)
  })

  it('uses a server session for Laravel UI without exposing a refresh token', async () => {
    const stack = await laravelStack({
      frontend: 'laravel-ui',
      applicationShape: 'fullstack',
      authentication: 'yes',
      laravelUi: 'blade',
    })
    const files = buildLaravelFiles(answers, stack)

    expect(stack.authentication).toBe(laravelSessionAuthentication.id)
    expect(files['routes/api.php']).toContain("middleware('auth')")
    expect(files['.env.example']).toContain('SESSION_DRIVER=database')
    expect(files['.env.example']).not.toMatch(/REFRESH_TOKEN/i)
  })

  it('keeps multi-client OIDC external and access-token only', async () => {
    const stack = await laravelStack({ authentication: 'yes', authAudience: 'multi-client' })
    const files = buildLaravelFiles(answers, stack)
    const composer = JSON.parse(files['composer.json'])

    expect(stack.authentication).toBe(laravelOidcAuthentication.id)
    expect(laravelOidcAuthentication.acceptsRefreshTokens).toBe(false)
    expect(composer.require[laravelOidcAuthentication.composerPackage]).toMatch(/^\d+\.\d+\.\d+$/)
    expect(files['routes/api.php']).toContain(`Auth::shouldUse('${laravelOidcAuthentication.guard}')`)
    expect(files['.env.example']).toContain('AUTH0_AUDIENCE=')
    expect(files['.env.example']).not.toMatch(/REFRESH_TOKEN/i)
  })
})

describe('Laravel UI adapter contracts', () => {
  it.each([
    ['blade', 'resources/views/home.blade.php', null],
    ['livewire', 'app/Livewire/HomePage.php', 'livewire/livewire'],
    ['inertia-react', 'resources/js/Pages/Home.jsx', 'inertiajs/inertia-laravel'],
  ])('owns %s files, routes, and packages', async (laravelUi, expectedFile, composerPackage) => {
    const stack = await laravelStack({
      frontend: 'laravel-ui',
      applicationShape: 'fullstack',
      authentication: 'yes',
      laravelUi,
    })
    const files = buildLaravelFiles(answers, stack)
    const composer = JSON.parse(files['composer.json'])
    const ui = getLaravelUi(laravelUi)

    expect(files).toHaveProperty(expectedFile)
    expect(files['routes/web.php']).toContain(ui.homeRoute)
    expect(ui.composerPackages).toEqual(composerPackage ? [composerPackage] : [])
    if (composerPackage) expect(composer.require[composerPackage]).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('contributes one question through the core-owned stack-options slot', () => {
    const contribution = laravelUiPromptContribution(undefined)

    expect(contribution.slot).toBe('stack-options')
    expect(contribution.questions).toHaveLength(1)
    expect(contribution.questions[0].choices.map((choice) => choice.value))
      .toEqual(laravelUis.map((ui) => ui.id))
  })
})
