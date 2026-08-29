import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { buildRulesIndex } from '../lib/playbooks.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('buildRulesIndex', () => {
  it('produces always-on and optional groups with § refs', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const stack = resolveStack({ frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', githubActions: true }, catalog)
    const out = await buildRulesIndex(stack, catalog, path.join(root, 'playbooks'))
    expect(out).toContain('## Always-on Invariants')
    expect(out).toContain('## Optional Concerns')
    expect(out).toContain('§') // section references present
    expect(out).toContain('validation') // optional concern listed
    expect(out).toContain('Never read all playbooks eagerly')
  })
})
