import { describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import path from 'node:path'
import { generateProject as legacyGenerateProject } from '../../lib/generator.js'
import { generateProject } from '../../src/engine/create-project.js'
import * as legacyInterview from '../../lib/interview.js'
import * as questions from '../../src/cli/questions.js'
import { stackRegistry } from '../../lib/stacks/index.js'
import { availableStacks } from '../../src/stacks/available-stacks.js'
import { generateGoldenManifest, goldenCases } from '../architecture/golden-output.js'

const root = path.resolve(import.meta.dirname, '..', '..')

describe('architecture migration compatibility', () => {
  it('keeps legacy programmatic exports available through the new paths', () => {
    expect(generateProject).toBe(legacyGenerateProject)
    expect(questions.promptWithBack).toBe(legacyInterview.promptWithBack)
    expect(questions.configurationDecisionChoices).toBe(legacyInterview.configurationDecisionChoices)
    expect(availableStacks).toBe(stackRegistry)
  })

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
