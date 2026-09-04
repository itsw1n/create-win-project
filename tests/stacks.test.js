import { describe, expect, it, vi } from 'vitest'
import {
  ARCHITECTURE_PROFILES,
  CONTRIBUTION_HOOKS,
  defineStackAdapter,
  isStackAdapter,
} from '../lib/stacks/contract.js'
import { createStackContext } from '../lib/stacks/context.js'
import { createStackRegistry } from '../lib/stacks/registry.js'
import { collectContributions, collectPromptContributions } from '../lib/stacks/shared/contributions.js'
import { stackRegistry } from '../lib/stacks/index.js'

function adapter(overrides = {}) {
  return defineStackAdapter({
    id: 'example',
    kind: 'frontend',
    label: 'Example',
    compatibleWith: { backend: ['api'] },
    capabilities: {
      applicationShapes: ['separate'],
      architectureProfiles: ['small', 'medium', 'large'],
      authenticationModels: ['public'],
    },
    contributes: {},
    ...overrides,
  })
}

describe('stack adapter contract', () => {
  it('normalizes every contribution hook and freezes identity and capabilities', () => {
    const value = adapter()

    expect(isStackAdapter(value)).toBe(true)
    expect(Object.isFrozen(value)).toBe(true)
    expect(Object.isFrozen(value.capabilities)).toBe(true)
    expect(Object.keys(value.contributes)).toEqual(CONTRIBUTION_HOOKS)
    expect(value.capabilities.architectureProfiles).toEqual(ARCHITECTURE_PROFILES)
    expect(value.contributes.files({})).toEqual([])
  })

  it.each([
    [{ id: 'Not Valid' }, /Invalid stack adapter id/],
    [{ kind: 'service' }, /Invalid stack adapter kind/],
    [{ capabilities: { applicationShapes: ['desktop'] } }, /unsupported value: desktop/],
    [{ contributes: { files: [] } }, /files must be a function/],
    [{ dependencies: { react: 'latest' } }, /Unknown stack adapter field: dependencies/],
  ])('rejects invalid identity or capability definitions', (overrides, error) => {
    expect(() => adapter(overrides)).toThrow(error)
  })
})

describe('stack adapter registry', () => {
  const frontend = adapter()
  const backend = adapter({
    id: 'api',
    kind: 'backend',
    label: 'API',
    compatibleWith: { frontend: ['example'] },
  })

  it('requires explicit registration and supports kind queries', () => {
    const registry = createStackRegistry([frontend, backend])

    expect(registry.require('example')).toBe(frontend)
    expect(registry.list('backend')).toEqual([backend])
    expect(registry.supports('example', 'api')).toBe(true)
    expect(() => registry.require('missing')).toThrow(/Unknown stack adapter/)
  })

  it('rejects duplicate identities and incompatible pairings', () => {
    expect(() => createStackRegistry([frontend, frontend])).toThrow(/Duplicate stack adapter id/)
    const incompatible = adapter({
      id: 'other-api',
      kind: 'backend',
      label: 'Other API',
      compatibleWith: { frontend: ['other-frontend'] },
    })
    const registry = createStackRegistry([frontend, incompatible])
    expect(registry.supports('example', 'other-api')).toBe(false)
  })
})

describe('registered stack capabilities', () => {
  it('registers PostgreSQL with Prisma files, environment, and verification ownership', () => {
    const postgres = stackRegistry.require('postgres')

    expect(postgres.compatibleWith.frontend).toEqual(['nextjs'])
    expect(postgres.capabilities.applicationShapes).toEqual(['fullstack'])
    expect(postgres.capabilities.authenticationModels).toEqual(['public', 'undecided'])
    expect(postgres.contributes.environment({})).toEqual(['DATABASE_URL'])
    expect(postgres.contributes.verification({})).toHaveLength(3)
  })

  it('registers Supabase with data, auth, environment, and verification ownership', () => {
    const supabase = stackRegistry.require('supabase')

    expect(supabase.compatibleWith.frontend).toEqual(['nextjs', 'react', 'react-native'])
    expect(supabase.capabilities.applicationShapes).toEqual(['fullstack', 'separate', 'mobile'])
    expect(supabase.capabilities.authenticationModels).toEqual(['public', 'undecided', 'supabase'])
    expect(supabase.contributes.environment({})).toEqual(['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'])
    expect(supabase.contributes.verification({})).toEqual(expect.arrayContaining([
      expect.objectContaining({ frontend: 'nextjs', authentication: 'supabase' }),
      expect.objectContaining({ frontend: 'react-native', authentication: 'supabase' }),
    ]))
  })

  it('registers Spring Boot with backend runtime, auth, and verification ownership', () => {
    const spring = stackRegistry.require('springboot')
    const context = {}

    expect(spring.compatibleWith.frontend).toEqual(['nextjs', 'react', 'react-native', 'no-frontend'])
    expect(spring.capabilities.applicationShapes).toEqual(['separate', 'api', 'mobile'])
    expect(spring.capabilities.authenticationModels).toEqual(['public', 'undecided', 'session', 'oidc'])
    expect(spring.contributes.environment(context)).toContain('DATABASE_URL')
    expect(spring.contributes.install(context)).toEqual([
      { cwd: 'backend', command: './mvnw', args: ['dependency:go-offline'] },
    ])
    expect(spring.contributes.verification(context)).toEqual(expect.arrayContaining([
      expect.objectContaining({ frontend: 'react', authentication: 'session' }),
      expect.objectContaining({ frontend: 'react-native', authentication: 'oidc' }),
    ]))
  })

  it('registers React Native with mobile-only capabilities and local-device verification', () => {
    const native = stackRegistry.require('react-native')
    const context = { backend: { id: 'springboot' } }

    expect(native.compatibleWith.backend).toEqual(['none', 'supabase', 'springboot', 'laravel'])
    expect(native.capabilities.applicationShapes).toEqual(['mobile'])
    expect(native.capabilities.architectureProfiles).toEqual(['small', 'medium', 'large'])
    expect(native.contributes.environment(context)).toEqual(['API_URL'])
    expect(native.contributes.docker(context)).toEqual([])
    expect(native.contributes.verification(context)).toEqual(expect.arrayContaining([
      expect.objectContaining({ backend: 'supabase', authentication: 'supabase' }),
      expect.objectContaining({ backend: 'springboot', authentication: 'oidc' }),
    ]))
  })

  it('registers React + Vite with its supported shapes, pairings, and operational facets', () => {
    const react = stackRegistry.require('react')
    const context = { backend: { id: 'springboot' } }

    expect(react.compatibleWith.backend).toEqual(['none', 'supabase', 'springboot', 'laravel'])
    expect(react.capabilities.applicationShapes).toEqual(['separate', 'frontend'])
    expect(react.capabilities.architectureProfiles).toEqual(['small', 'medium', 'large'])
    expect(react.contributes.environment(context)).toEqual(['API_URL'])
    expect(react.contributes.install(context)).toEqual([
      { cwd: 'frontend', command: 'npm', args: ['install'] },
    ])
    expect(react.contributes.verification(context)).toEqual(expect.arrayContaining([
      expect.objectContaining({ backend: 'supabase', authentication: 'supabase' }),
      expect.objectContaining({ backend: 'springboot', architecture: 'large' }),
    ]))
  })

  it('registers Next.js with its supported shapes, pairings, and contribution facets', () => {
    const nextjs = stackRegistry.require('nextjs')

    expect(nextjs.kind).toBe('frontend')
    expect(nextjs.compatibleWith.backend).toEqual([
      'none', 'postgres', 'supabase', 'springboot', 'laravel',
    ])
    expect(nextjs.capabilities.applicationShapes).toEqual(['fullstack', 'separate'])
    expect(nextjs.capabilities.architectureProfiles).toEqual(['small', 'medium', 'large'])
    expect(nextjs.capabilities.authenticationModels).toContain('supabase')
  })

  it('keeps Next.js operational and focused compatibility cases with the adapter', () => {
    const nextjs = stackRegistry.require('nextjs')
    const context = {
      backend: { id: 'springboot' },
    }

    expect(nextjs.contributes.environment(context)).toEqual(['API_URL'])
    expect(nextjs.contributes.install(context)).toEqual([
      { cwd: '.', command: 'npm', args: ['install'] },
    ])
    expect(nextjs.contributes.docker(context)).toEqual([
      { template: 'nextjs', developmentPath: 'Dockerfile.dev', productionPath: 'Dockerfile' },
    ])
    expect(nextjs.contributes.ci(context)).toEqual([
      { template: 'nextjs', path: '.github/workflows/ci-frontend.yml' },
    ])
    expect(nextjs.contributes.verification(context)).toEqual(expect.arrayContaining([
      expect.objectContaining({ backend: 'supabase', architecture: 'large', authentication: 'supabase' }),
      expect.objectContaining({ backend: 'springboot', architecture: 'medium', authentication: 'session' }),
    ]))
  })

  it('registers Laravel with its existing pairings and authentication models', () => {
    const laravel = stackRegistry.require('laravel')

    expect(laravel.kind).toBe('backend')
    expect(laravel.compatibleWith.frontend).toEqual([
      'nextjs', 'react', 'react-native', 'no-frontend', 'laravel-ui',
    ])
    expect(laravel.capabilities.applicationShapes).toEqual(['fullstack', 'separate', 'api', 'mobile'])
    expect(laravel.capabilities.authenticationModels).toContain('laravel-oidc')
  })
})

describe('adapter contribution boundaries', () => {
  it('passes a read-only context to hooks and composes returned data', () => {
    const files = vi.fn(() => [{ path: 'README.md', content: '# Example\n' }])
    const frontend = adapter({ contributes: { files } })
    const backend = adapter({ id: 'api', kind: 'backend', label: 'API', compatibleWith: {} })
    const context = createStackContext({
      answers: { architecture: 'medium' },
      profile: { id: '2026.09' },
      catalog: {},
      frontend,
      backend,
    })

    expect(Object.isFrozen(context)).toBe(true)
    expect(Object.isFrozen(context.answers)).toBe(true)
    expect(collectContributions([frontend, backend], 'files', context)).toEqual([
      { path: 'README.md', content: '# Example\n' },
    ])
    expect(files).toHaveBeenCalledWith(context)
  })

  it('keeps adapter questions inside core-owned prompt slots', () => {
    const questions = [{ type: 'list', name: 'exampleMode' }]
    const frontend = adapter({
      contributes: { prompts: () => [{ slot: 'stack-options', questions }] },
    })

    expect(collectPromptContributions([frontend], {})).toMatchObject({
      'stack-options': questions,
      'authentication-options': [],
    })
  })

  it('rejects arbitrary prompt positions and side-effect-shaped hook results', () => {
    const invalidPrompt = adapter({
      contributes: { prompts: () => [{ slot: 'before-project-name', questions: [] }] },
    })
    const invalidFiles = adapter({ contributes: { files: () => ({ write: true }) } })

    expect(() => collectPromptContributions([invalidPrompt], {})).toThrow(/supported slot/)
    expect(() => collectContributions([invalidFiles], 'files', {})).toThrow(/must return an array/)
  })
})
