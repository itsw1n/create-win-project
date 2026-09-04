import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { generateProject as legacyGenerateProject } from '../lib/generator.js'
import { generateProject } from '../src/engine/create-project.js'
import * as legacyInterview from '../lib/interview.js'
import * as questions from '../src/cli/questions.js'
import { stackRegistry } from '../lib/stacks/index.js'
import { availableStacks } from '../src/stacks/available-stacks.js'

const root = path.resolve(import.meta.dirname, '..')
const temporaryDirectories = []

async function fileMap(directory, prefix = '') {
  const result = {}
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name)
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) Object.assign(result, await fileMap(target, relative))
    else result[relative] = await fs.readFile(target, 'utf8')
  }
  return result
}

async function generateWith(generate, parent, projectName) {
  const previous = process.cwd()
  process.chdir(parent)
  try {
    await generate({
      projectName,
      projectDescription: 'Architecture compatibility fixture',
      applicationShape: 'separate',
      frontend: 'react',
      backend: 'springboot',
      styling: 'css-modules',
      architecture: 'medium',
      authentication: 'not-yet',
      authAudience: 'website',
      testing: 'basic',
      docker: true,
      makefile: true,
      githubActions: true,
      packageName: 'com.example',
      expectedConcerns: [],
    }, root)
  } finally {
    process.chdir(previous)
  }
  return fileMap(path.join(parent, projectName))
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)))
})

describe('architecture migration compatibility', () => {
  it('keeps legacy programmatic exports available through the new paths', () => {
    expect(generateProject).toBe(legacyGenerateProject)
    expect(questions.promptWithBack).toBe(legacyInterview.promptWithBack)
    expect(questions.configurationDecisionChoices).toBe(legacyInterview.configurationDecisionChoices)
    expect(availableStacks).toBe(stackRegistry)
  })

  it('generates byte-identical representative output through old and new imports', async () => {
    const legacyRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cwp-legacy-'))
    const newRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cwp-new-'))
    temporaryDirectories.push(legacyRoot, newRoot)
    const legacy = await generateWith(legacyGenerateProject, legacyRoot, 'same-project')
    const current = await generateWith(generateProject, newRoot, 'same-project')
    expect(current).toEqual(legacy)
    expect(Object.keys(current)).toEqual(expect.arrayContaining([
      'frontend/package.json',
      'frontend/src/main.tsx',
      'backend/pom.xml',
      'docker-compose.yml',
      'RULES.md',
      'create-win-project.profile.json',
    ]))
  })
})
