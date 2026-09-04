import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { buildLaravelFiles } from '../lib/stacks/laravel/generate.js'

const root = path.resolve(import.meta.dirname, '..')

async function laravelStack(overrides = {}) {
  const catalog = await loadCatalog(path.join(root, 'playbooks'))
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
