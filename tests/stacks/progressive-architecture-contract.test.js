import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const stacks = ['nextjs', 'react-vite', 'expo', 'fastapi', 'springboot', 'laravel']

describe('progressive stack architecture guidance', () => {
  it.each(stacks)('%s distinguishes reference structure from generated output', async (stackId) => {
    const structure = await fs.readFile(
      path.join(root, 'library', 'stacks', stackId, 'structure.md'),
      'utf8',
    )

    expect(structure).toContain('## Canonical Reference Tree')
    expect(structure).toContain('## Profile Differences')
    expect(structure).toContain('## File Placement')
    expect(structure).toMatch(/reference/i)
    expect(structure).toMatch(/create only|do not retain|never create empty/i)
    expect(structure).toContain('## Architecture Cleanup')
    expect(structure).toMatch(/ask\s+for approval/i)
  })
})
