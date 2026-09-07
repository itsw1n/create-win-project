import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'
import { buildRulesIndex } from '../../src/engine/project-guidance.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('Next.js architecture contract', () => {
  it('provides routed structure and boundary decisions', async () => {
    const [structure, architecture] = await Promise.all([
      fs.readFile(path.join(root, 'library/stacks/nextjs/structure.md'), 'utf8'),
      fs.readFile(path.join(root, 'library/stacks/nextjs/architecture.md'), 'utf8'),
    ])

    expect(structure).toContain('## Canonical Reference Tree')
    expect(structure).toContain('## Profile Differences')
    expect(structure).toContain('## File Placement')
    expect(structure).toContain('## API and Data Ownership')
    expect(structure).toContain('## Architecture Cleanup')
    expect(architecture).toContain('## Server and Client Boundaries')
    expect(architecture).toContain('## Read and Write Decisions')

    const catalog = await loadCatalog(path.join(root, 'library'))
    const stack = resolveStack({ frontend: 'nextjs', backend: 'none' }, catalog)
    const rules = await buildRulesIndex(stack, catalog, path.join(root, 'library'))
    expect(rules).toContain('Canonical Reference Tree')
    expect(rules).toContain('API and Data Ownership')
    expect(rules).not.toContain('(section not found)')
  })

  it('agrees with representative generated Next.js paths', async () => {
    const fixture = JSON.parse(await fs.readFile(
      path.join(root, 'tests/architecture/fixtures/generated-output/nextjs-none.json'),
      'utf8',
    ))

    expect(fixture).toHaveProperty('src/app/api/health/route.ts')
    expect(fixture).toHaveProperty('src/components/layout/Container.tsx')
    expect(fixture).toHaveProperty('src/components/common/Button.tsx')
    expect(fixture).toHaveProperty('src/features/status/components/StarterStatus.tsx')
    expect(fixture).toHaveProperty('src/features/status/services/getStarterStatus.ts')
  })
})
