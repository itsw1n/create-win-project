import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'
import { buildRulesIndex, collectPlaybookFiles } from '../../src/engine/project-guidance.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..', '..')

describe('buildRulesIndex — nextjs', () => {
  it('produces always-on and optional groups with § refs', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', githubActions: true }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(out).toContain('## Always-on Invariants')
    expect(out).toContain('## Conditional Workflows')
    expect(out).toContain('## Optional Concerns')
    expect(out).toContain('§')
    expect(out).toContain('validation')
    expect(out).toContain('Never load all playbooks eagerly')
    expect(out).toContain('product-onboarding')
    expect(out).toContain('plan-reconciliation')
    expect(out).toContain('CONTEXT.md reports Product status as incomplete')
    expect(out).toContain('universal/product-planning.md')
  })
})

describe('buildRulesIndex — react-native', () => {
  it('includes mobile-specific required concerns', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(out).toContain('navigation')
    expect(out).toContain('styling')
    expect(out).toContain('query')
    expect(out).toContain('styling/native-styles.md')
    expect(out).toContain('concerns/tanstack-query.md')
  })

  it('does not contain web-only concerns', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(out).not.toContain('t3-env')
    expect(out).not.toContain('url-state')
    expect(out).not.toContain('dark-mode')
  })

  it('shows platform in header', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const out     = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(out).toContain("**Platform:** mobile")
  })
})

describe('collectPlaybookFiles', () => {
  it('includes concern files for react-native stack', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const files   = collectPlaybookFiles(stack)
    expect(files.some((f) => f.startsWith('concerns/'))).toBe(true)
    expect(files).toContain('concerns/tanstack-query.md')
    expect(files).toContain('styling/native-styles.md')
  })

  it('includes concern files for nextjs stack', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind' }, catalog)
    const files   = collectPlaybookFiles(stack)
    expect(files).toContain('stack/nextjs/architecture.md')
    expect(files).toContain('stack/nextjs/security.md')
    expect(files).toContain('universal/product-planning.md')
    expect(files.some((f) => f.startsWith('concerns/'))).toBe(true)
  })

  it.each([
    ['tailwind', 'styling/tailwind/architecture.md', 'styling/tailwind/components.md'],
    ['css-modules', 'styling/css-modules/architecture.md', 'styling/css-modules/components.md'],
  ])('routes the complete %s styling contract', async (styling, architecture, components) => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack = resolveStack({ frontend: 'nextjs', backend: 'none', styling }, catalog)
    const files = collectPlaybookFiles(stack)
    const rules = await buildRulesIndex(stack, catalog, path.join(root, 'library'))

    expect(files).toContain('styling/ownership.md')
    expect(files).toContain(architecture)
    expect(files).toContain(components)
    expect(rules).toContain('styling-ownership')
    expect(rules).toContain('styling-components')
    expect(files).not.toContain('styling/tailwind-extensions.md')
  })

  it('does not duplicate files', async () => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack   = resolveStack({ frontend: 'react-native', backend: 'supabase' }, catalog)
    const files   = collectPlaybookFiles(stack)
    const unique  = new Set(files)
    expect(files.length).toBe(unique.size)
  })
})

describe('frontend component ownership vocabulary', () => {
  it.each(['nextjs', 'react-vite', 'expo'])(
    'documents layout/common ownership for %s',
    async (stackId) => {
      const structure = await fs.readFile(
        path.join(root, 'library', 'stacks', stackId, 'structure.md'),
        'utf8',
      )

      expect(structure).toContain('components/layout')
      expect(structure).toContain('components/common')
      expect(structure).not.toContain('components/ui')
      expect(structure).not.toContain('components/shared')
    },
  )
})
