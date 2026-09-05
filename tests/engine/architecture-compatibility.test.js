import { describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import path from 'node:path'
import { generateGoldenManifest, goldenCases } from '../architecture/golden-output.js'

const root = path.resolve(import.meta.dirname, '..', '..')

describe('architecture migration compatibility', () => {
  it.each([
    ['web stacks', ['nextjs-none', 'nextjs-supabase', 'react-springboot']],
    ['mobile stacks', ['react-native-supabase']],
    ['Laravel stacks', ['laravel-inertia-react']],
  ])('matches committed generated-output golden fixtures for %s', async (_group, caseNames) => {
    for (const caseName of caseNames) {
      expect(goldenCases).toHaveProperty(caseName)
      const expected = await fs.readJson(path.join(root, 'tests/architecture/fixtures/generated-output', `${caseName}.json`))
      expect(await generateGoldenManifest(caseName, root), caseName).toEqual(expected)
    }
  })
})
