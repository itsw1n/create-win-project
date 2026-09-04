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
