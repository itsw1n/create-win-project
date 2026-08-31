import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { buildRulesIndex, collectPlaybookFiles } from '../lib/playbooks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')

describe('buildRulesIndex — nextjs', () => {
  it('produces always-on and optional groups with § refs', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', githubActions: true }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'))
    expect(out).toContain('## Always-on Invariants')
    expect(out).toContain('## Optional Concerns')
    expect(out).toContain('§')
    expect(out).toContain('validation')
    expect(out).toContain('Never load all playbooks eagerly')
  })
})

describe('buildRulesIndex — react-native', () => {
  it('includes mobile-specific required concerns', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'))
    expect(out).toContain('navigation')
    expect(out).toContain('styling')
    expect(out).toContain('query')
    expect(out).toContain('concerns/nativewind.md')
    expect(out).toContain('concerns/tanstack-query.md')
  })

  it('does not contain web-only concerns', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'))
    expect(out).not.toContain('t3-env')
    expect(out).not.toContain('url-state')
    expect(out).not.toContain('dark-mode')
  })

  it('shows platform in header', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'))
    expect(out).toContain("**Platform:** mobile")
  })
})

describe('collectPlaybookFiles', () => {
  it('includes concern files for react-native stack', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const files   = collectPlaybookFiles(stack)
    expect(files.some((f) => f.startsWith('concerns/'))).toBe(true)
    expect(files).toContain('concerns/tanstack-query.md')
    expect(files).toContain('concerns/nativewind.md')
  })

  it('includes concern files for nextjs stack', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind' }, catalog)
    const files   = collectPlaybookFiles(stack)
    expect(files).toContain('stack/nextjs.md')
    expect(files.some((f) => f.startsWith('concerns/'))).toBe(true)
  })

  it('does not duplicate files', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const files   = collectPlaybookFiles(stack)
    const unique  = new Set(files)
    expect(files.length).toBe(unique.size)
  })
})
