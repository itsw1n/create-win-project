import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack, stylingChoicesFor, backendChoicesFor, architectureChoicesFor } from '../../lib/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..', '..')

describe('catalog loading', () => {
  it('loads all manifests including concerns', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    expect(catalog.frontends.length).toBeGreaterThanOrEqual(3)       // nextjs, react, react-native
    expect(catalog.byId['react-native']).toBeDefined()
    expect(catalog.byId['none']).toBeDefined()
    expect(catalog.byId['nextjs'].platform).toBe('web')
    expect(catalog.byId['react-native'].platform).toBe('mobile')
  })
})

describe('interview helpers', () => {
  it('returns styling choices when frontend has >1 option', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const choices = stylingChoicesFor(catalog, 'nextjs')
    expect(choices.length).toBeGreaterThan(1)
  })

  it('returns empty styling choices for react-native (auto-select)', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const choices = stylingChoicesFor(catalog, 'react-native')
    expect(choices).toHaveLength(0)
  })

  it('includes "none" backend for react-native', async () => {
    const catalog  = await loadCatalog(path.join(root, 'library'))
    const choices  = backendChoicesFor(catalog, 'react-native')
    const values   = choices.map((c) => c.value)
    expect(values).toContain('none')
    expect(values).toContain('supabase')
    expect(values).toContain('springboot')
  })

  it('includes "none" backend for every frontend', async () => {
    const catalog  = await loadCatalog(path.join(root, 'library'))
    for (const frontend of ['nextjs', 'react', 'react-native']) {
      expect(backendChoicesFor(catalog, frontend).map((choice) => choice.value)).toContain('none')
    }
  })

  it('offers Medium first for every supported stack combination', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    for (const [frontend, backend] of [
      ['nextjs', 'none'], ['react', 'supabase'], ['react-native', 'springboot'],
    ]) {
      const choices = architectureChoicesFor(catalog, frontend, backend)
      expect(choices).toEqual(['small', 'medium', 'large'])
    }
  })
})

describe('resolveStack — env prefix', () => {
  it('applies NEXT_PUBLIC_ prefix to nextjs client env vars', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'medium' }, catalog)
    expect(stack.env.some((e) => e.startsWith('NEXT_PUBLIC_'))).toBe(true)
    // privileged keys are opt-in and are not scaffolded into a normal app
    expect(stack.env).not.toContain('SUPABASE_SECRET_KEY')
    expect(stack.env).not.toContain('NEXT_PUBLIC_SUPABASE_SECRET_KEY')
    expect(stack.env).toContain('NEXT_PUBLIC_SUPABASE_URL')
    expect(stack.env).not.toContain('NEXT_PUBLIC_NEXT_PUBLIC_API_URL')
  })

  it('applies EXPO_PUBLIC_ prefix to react-native client env vars', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    expect(stack.env.some((e) => e.startsWith('EXPO_PUBLIC_'))).toBe(true)
    expect(stack.env).not.toContain('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('applies VITE_ prefix to react-vite client env vars', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react', backend: 'supabase', styling: 'tailwind' }, catalog)
    expect(stack.env.some((e) => e.startsWith('VITE_'))).toBe(true)
  })
})

describe('resolveStack — capability flags', () => {
  it('supports a backend-only Spring Boot application shape', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack = resolveStack({ frontend: 'no-frontend', backend: 'springboot', applicationShape: 'api' }, catalog)
    expect(stack.applicationShape).toBe('api')
    expect(stack.platform).toBe('api')
    expect(stack.styleId).toBeNull()
  })

  it('maps Laravel authentication from application shape and audience', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const spa = resolveStack({ frontend: 'react', backend: 'laravel', applicationShape: 'separate', authentication: 'yes' }, catalog)
    const api = resolveStack({ frontend: 'react-native', backend: 'laravel', applicationShape: 'mobile', authentication: 'yes' }, catalog)
    expect(spa.authentication).toBe('sanctum-spa')
    expect(api.authentication).toBe('laravel-oidc')
    expect(spa.playbooks).toContain('capabilities/laravel/sanctum-spa.md')
  })
  it('nextjs + supabase produces correct capabilities', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'medium' }, catalog)
    expect(stack.platform).toBe('web')
    expect(stack.isMobile).toBe(false)
    expect(stack.ciTemplate).toBe('nextjs')
    expect(stack.label).toBe('Next.js + Supabase')
    expect(stack.architecture).toBe('medium')
    expect(stack.applicationShape).toBe('fullstack')
    expect(stack.playbooks).toContain('stack/nextjs/architecture.md')
    expect(stack.playbooks).toContain('capabilities/supabase/nextjs.md')
  })

  it('react-native + supabase produces correct capabilities', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    expect(stack.platform).toBe('mobile')
    expect(stack.isMobile).toBe(true)
    expect(stack.ciTemplate).toBe('expo')
    expect(stack.styleId).toBe('native-styles')
    expect(stack.architecture).toBe('medium')
    expect(stack.applicationShape).toBe('mobile')
    expect(stack.playbooks).toContain('stack/expo/architecture.md')
    expect(stack.playbooks).toContain('capabilities/supabase/expo.md')
  })

  it('react-native + none produces correct capabilities', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'none' }, catalog)
    expect(stack.platform).toBe('mobile')
    expect(stack.backendKey).toBe('none')
    expect(stack.needsDocker).toBe(false)
  })

  it('rejects invalid frontend/backend pairing', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    expect(() => resolveStack({ frontend: 'nextjs', backend: 'missing', styling: 'tailwind' }, catalog))
      .toThrow(/Unknown backend/)
  })
})

describe('resolveStack — concerns', () => {
  it('react-native keeps only platform foundations required', async () => {
    const catalog    = await loadCatalog(path.join(root, 'library'))
    const stack      = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const reqIds     = stack.concerns.filter((c) => c.required).map((c) => c.id)
    expect(reqIds).toContain('styling')
    expect(reqIds).toContain('navigation')
    expect(reqIds).not.toContain('query')
    expect(reqIds).not.toContain('http-client')
  })

  it('react-native concerns point to concerns/ playbooks for shared concerns', async () => {
    const catalog   = await loadCatalog(path.join(root, 'library'))
    const stack     = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const queryConcern = stack.concerns.find((c) => c.id === 'query')
    expect(queryConcern?.playbook).toBe('concerns/tanstack-query.md')
  })

  it('nextjs optional concerns do not appear for react-native', async () => {
    const catalog  = await loadCatalog(path.join(root, 'library'))
    const rnStack  = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const ids      = rnStack.concerns.map((c) => c.id)
    expect(ids).not.toContain('t3-env')
    expect(ids).not.toContain('url-state')
    expect(ids).not.toContain('safe-action')
    expect(ids).not.toContain('dark-mode')
  })
})
