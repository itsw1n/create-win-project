import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('resolveStack descriptor shape', () => {
  it('nextjs + supabase produces expected descriptor', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const answers = { frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'medium', docker: false, makefile: true, githubActions: true }
    const stack = resolveStack(answers, catalog)
    expect(stack.label).toBe('Next.js + Supabase')
    expect(stack.isNextjs).toBe(true)
    expect(stack.isSupabase).toBe(true)
    expect(stack.folders).toContain('src/app')
    expect(stack.playbooks).toContain('stack/nextjs.md')
  })

  it('rejects invalid frontend/backend pairing', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    expect(() => resolveStack({ frontend: 'nextjs', backend: 'postgres', styling: 'tailwind' }, catalog))
      .not.toThrow() // postgres is allowed for nextjs
    // react does not allow postgres in current model
    expect(() => resolveStack({ frontend: 'react', backend: 'postgres', styling: 'tailwind' }, catalog))
      .toThrow(/cannot pair/)
  })
})
