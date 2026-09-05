import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..', '..')

describe('lean shipped playbooks', () => {
  it('nextjs stack guidance is split into five lean facets', () => {
    const compactDir = path.join(root, 'playbooks-compact')
    expect(fs.existsSync(compactDir)).toBe(false)
    for (const facet of ['architecture', 'structure', 'runtime', 'security', 'testing']) {
      const file = path.join(root, 'library', 'stacks', 'nextjs', `${facet}.md`)
      expect(fs.existsSync(file), `Missing Next.js ${facet} facet`).toBe(true)
      expect(fs.readFileSync(file, 'utf-8').split('\n').length).toBeLessThan(250)
    }
  })

  it('concern files exist and are standalone', () => {
    const concerns = [
      'zustand.md', 'tanstack-query.md', 'zod.md',
      'axios.md', 't3-env.md', 'nuqs.md',
      'next-safe-action.md', 'next-themes.md',
    ]
    for (const file of concerns) {
      const fullPath = path.join(root, 'library', 'optional-features', 'concerns', file)
      expect(fs.existsSync(fullPath), `Missing: concerns/${file}`).toBe(true)
      const content = fs.readFileSync(fullPath, 'utf-8')
      // Each concern file should have an agent quick reference
      expect(content, `${file} missing Agent Quick Reference`).toContain('Agent Quick Reference')
    }
  })

  it('Expo guidance is split into five lean facets', () => {
    for (const facet of ['architecture', 'structure', 'runtime', 'security', 'testing']) {
      const file = path.join(root, 'library', 'stacks', 'expo', `${facet}.md`)
      expect(fs.existsSync(file), `Missing Expo ${facet} facet`).toBe(true)
      expect(fs.readFileSync(file, 'utf-8').split('\n').length).toBeLessThan(250)
    }
  })
})
