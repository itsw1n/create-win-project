import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadCatalog, resolveStack } from '../lib/catalog.js'
import { composeStack } from '../lib/constants.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('resolveStack parity with composeStack', () => {
  it('nextjs + supabase matches folders/playbooks/constraints shape', async () => {
    const catalog = await loadCatalog(path.join(root, 'playbooks'))
    const answers = { frontend: 'nextjs', backend: 'supabase', styling: 'tailwind', architecture: 'medium', docker: false, makefile: true, githubActions: true }
    const stack = resolveStack(answers, catalog)
    const old = composeStack(answers.frontend, answers.backend, answers)
    expect(stack.folders.sort()).toEqual(old.folders.sort())
    expect(stack.playbooks.sort()).toEqual(old.playbooks.sort())
    expect(stack.label).toBe(old.label)
    expect(stack.isNextjs).toBe(true)
    expect(stack.isSupabase).toBe(true)
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
