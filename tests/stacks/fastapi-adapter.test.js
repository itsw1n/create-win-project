import { describe, expect, it } from 'vitest'
import { stackRegistry } from '../../src/stacks/available-stacks.js'
import { buildFastApiFiles as buildFiles } from '../../src/stacks/backends/fastapi/create-files.js'
import { loadCompatibility } from '../../src/engine/tested-versions.js'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function stackFor(overrides = {}) {
  return {
    frontendKey: 'nextjs',
    architecture: 'medium',
    authentication: 'oidc',
    authAudience: 'website',
    testing: 'basic',
    ...overrides,
  }
}

async function profile() {
  return (await loadCompatibility(path.join(root, 'library', 'tested-versions.json'))).profile
}

describe('fastapi adapter', () => {
  it('registers with python runtime, oidc-only auth, and verification ownership', () => {
    const fastapi = stackRegistry.require('fastapi')

    expect(fastapi.compatibleWith.frontend).toEqual(['nextjs', 'react', 'react-native', 'no-frontend'])
    expect(fastapi.capabilities.applicationShapes).toEqual(['separate', 'api', 'mobile'])
    expect(fastapi.capabilities.authenticationModels).toEqual(['public', 'undecided', 'oidc'])
    expect(fastapi.capabilities.runtime).toBe('python')
    expect(fastapi.contributes.environment({})).toContain('DATABASE_URL')
    expect(fastapi.contributes.environment({})).toContain('OIDC_ISSUER')
    expect(fastapi.contributes.install({})).toEqual([
      { cwd: 'backend', command: 'uv', args: ['sync'] },
    ])
    expect(fastapi.contributes.install({ stack: { frontendKey: 'no-frontend' } })).toEqual([
      { cwd: '.', command: 'uv', args: ['sync'] },
    ])
    expect(fastapi.contributes.verification({})).toEqual(expect.arrayContaining([
      expect.objectContaining({ frontend: 'nextjs', authentication: 'oidc' }),
      expect.objectContaining({ frontend: 'react-native', authentication: 'oidc' }),
      expect.objectContaining({ frontend: 'no-frontend', authentication: 'undecided' }),
    ]))
  })

  it('maps authentication intent yes to oidc for every audience', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    for (const authAudience of ['website', 'multi-client']) {
      const stack = resolveStack({
        frontend: 'nextjs', backend: 'fastapi', architecture: 'medium',
        authentication: 'yes', authAudience, styling: 'tailwind',
        testing: 'basic', githubActions: true,
      }, catalog)
      expect(stack.authentication).toBe('oidc')
    }
  })

  it('generates small profile at backend/ with exact catalog versions', async () => {
    const p = await profile()
    const answers = { projectName: 'demo-app', projectDescription: 'demo', packageName: 'com.app' }
    const files = buildFiles(answers, { PYTHON_VERSION: p.runtimes.python }, { ...stackFor({ architecture: 'small', authentication: 'public' }), profile: p })

    expect(files['backend/pyproject.toml']).toContain(`fastapi==${p.pythonPackages.fastapi}`)
    expect(files['backend/pyproject.toml']).toContain(`sqlalchemy==${p.pythonPackages.sqlalchemy}`)
    expect(files['backend/.python-version'].trim()).toBe(p.runtimes.python)
    expect(files['backend/app/routes_health.py']).toContain('/health')
    expect(files['backend/app/routes_api.py']).toContain('prefix="/api"')
    expect(files['backend/alembic/env.py']).toContain('alembic upgrade head')
    expect(files['backend/alembic/versions/0001_baseline.py']).toContain('examples')
    expect(files['backend/tests/test_health.py']).toContain('/health')
    for (const name of ['app/main.py', 'app/config.py', 'app/db.py', 'app/security.py', 'app/routes_health.py', 'app/routes_api.py']) {
      const content = files[`backend/${name}`]
      const firstImport = content.split('\n').find((line) => /^(from|import) /.test(line))
      expect(firstImport).toBe('from __future__ import annotations')
    }
  })

  it('generates medium and large profiles with feature modules and boundary tests', async () => {
    const p = await profile()
    const answers = { projectName: 'demo-app', projectDescription: 'demo', packageName: 'com.app' }
    const medium = buildFiles(answers, {}, { ...stackFor({ architecture: 'medium' }), profile: p })
    expect(medium['backend/app/features/status/router.py']).toContain('prefix="/api"')
    expect(medium['backend/app/features/status/service.py']).toContain('StatusService')
    expect(medium['backend/app/core/security.py']).toContain('require_auth')

    const large = buildFiles(answers, {}, { ...stackFor({ architecture: 'large' }), profile: p })
    expect(large['backend/app/modules/status/__init__.py']).toContain('__all__')
    expect(large['backend/tests/test_boundaries.py']).toContain('public interface')
  })

  it('places backend-only projects at the repository root', async () => {
    const p = await profile()
    const answers = { projectName: 'demo-api', projectDescription: 'demo', packageName: 'com.app' }
    const files = buildFiles(answers, {}, { ...stackFor({ frontendKey: 'no-frontend' }), profile: p })

    expect(files['pyproject.toml']).toBeDefined()
    expect(files['backend/pyproject.toml']).toBeUndefined()
    expect(files['app/main.py']).toBeDefined()
  })

  it('fails closed for undecided and requires bearer tokens for oidc', async () => {
    const p = await profile()
    const answers = { projectName: 'demo-app', projectDescription: 'demo', packageName: 'com.app' }
    const undecided = buildFiles(answers, {}, { ...stackFor({ authentication: 'undecided' }), profile: p })
    expect(undecided['backend/app/core/security.py']).toContain('403')

    const oidc = buildFiles(answers, {}, { ...stackFor({ authentication: 'oidc' }), profile: p })
    expect(oidc['backend/app/core/security.py']).toContain('PyJWKClient')
    expect(oidc['backend/tests/test_security.py']).toContain('401')

    const pub = buildFiles(answers, {}, { ...stackFor({ authentication: 'public' }), profile: p })
    expect(pub['backend/tests/test_security.py']).toContain('200')
  })

  it('exposes the adapter files hook', async () => {
    const p = await profile()
    const fastapi = stackRegistry.require('fastapi')
    const entries = fastapi.contributes.files({
      answers: { projectName: 'demo-app', projectDescription: 'demo', packageName: 'com.app' },
      stack: { ...stackFor({ architecture: 'small', authentication: 'public' }), profile: p },
      vars: {},
    })
    expect(Object.fromEntries(entries)['backend/pyproject.toml']).toContain('fastapi==')
  })
})
