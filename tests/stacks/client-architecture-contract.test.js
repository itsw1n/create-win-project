import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'
import { buildRulesIndex } from '../../src/engine/project-guidance.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

async function read(relativePath) {
  return fs.readFile(path.join(root, relativePath), 'utf8')
}

describe('client stack architecture contracts', () => {
  it.each(['react-vite', 'expo'])('%s provides progressive placement guidance', async (stackId) => {
    const structure = await read(`library/stacks/${stackId}/structure.md`)
    expect(structure).toContain('## Canonical Reference Tree')
    expect(structure).toContain('## Profile Differences')
    expect(structure).toContain('## File Placement')
    expect(structure).toContain('## Architecture Cleanup')
    expect(structure).toContain('components/layout')
    expect(structure).toContain('components/common')
  })

  it.each([
    ['react', 'none'],
    ['react-native', 'none'],
  ])('routes %s structure headings without gaps', async (frontend, backend) => {
    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack = resolveStack({ frontend, backend }, catalog)
    const rules = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(rules).toContain('Canonical Reference Tree')
    expect(rules).toContain('Architecture Cleanup')
    expect(rules).not.toContain('(section not found)')
  })

  it('keeps Vite application code under the paired frontend root', async () => {
    const fixture = JSON.parse(await read(
      'tests/architecture/fixtures/generated-output/react-springboot.json',
    ))
    expect(fixture).toHaveProperty('frontend/src/components/layout/Container/Container.tsx')
    expect(fixture).toHaveProperty('frontend/src/components/common/Button/Button.tsx')
    expect(fixture).toHaveProperty('frontend/src/features/status/api/getBackendStatus.ts')
  })

  it('keeps Expo navigation and feature code at established roots', async () => {
    const fixture = JSON.parse(await read(
      'tests/architecture/fixtures/generated-output/react-native-supabase.json',
    ))
    expect(fixture).toHaveProperty('app/_layout.tsx')
    expect(fixture).toHaveProperty('components/layout/Screen.tsx')
    expect(fixture).toHaveProperty('components/common/Button.tsx')
    expect(fixture).toHaveProperty('features/status/components/StarterStatus.tsx')
  })
})
