import { createHash } from 'node:crypto'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { generateProject } from '../../src/engine/create-project.js'

const common = {
  projectDescription: 'Architecture golden fixture',
  compatibilityProfile: '2026.09',
  architecture: 'medium',
  authentication: 'not-yet',
  authAudience: 'website',
  testing: 'basic',
  docker: true,
  makefile: true,
  githubActions: true,
  expectedConcerns: [],
}

export const goldenCases = Object.freeze({
  'nextjs-none': { frontend: 'nextjs', backend: 'none', applicationShape: 'fullstack', styling: 'tailwind' },
  'nextjs-supabase': { frontend: 'nextjs', backend: 'supabase', applicationShape: 'fullstack', styling: 'tailwind', authentication: 'yes' },
  'react-springboot': { frontend: 'react', backend: 'springboot', applicationShape: 'separate', styling: 'css-modules', packageName: 'com.example' },
  'react-native-supabase': { frontend: 'react-native', backend: 'supabase', applicationShape: 'mobile', authentication: 'yes', authAudience: 'multi-client', docker: false },
  'laravel-inertia-react': { frontend: 'laravel-ui', backend: 'laravel', applicationShape: 'fullstack', laravelUi: 'inertia-react', styling: 'tailwind', authentication: 'yes' },
})

async function fileManifest(directory, prefix = '') {
  const result = {}
  const entries = await fs.readdir(directory, { withFileTypes: true })
  for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
    const relative = path.posix.join(prefix, entry.name)
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) Object.assign(result, await fileManifest(target, relative))
    else {
      const content = await fs.readFile(target)
      result[relative] = {
        bytes: content.length,
        sha256: createHash('sha256').update(content).digest('hex'),
      }
    }
  }
  return result
}

export async function generateGoldenManifest(caseName, repositoryRoot) {
  const selected = goldenCases[caseName]
  if (!selected) throw new Error(`Unknown golden case: ${caseName}`)
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'create-win-golden-'))
  const projectName = `golden-${caseName}`
  const previousDirectory = process.cwd()
  const NativeDate = globalThis.Date
  globalThis.Date = class extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-09-05T00:00:00.000Z'])) }
    static now() { return new NativeDate('2026-09-05T00:00:00.000Z').valueOf() }
  }
  try {
    process.chdir(temporaryRoot)
    await generateProject({ ...common, ...selected, projectName }, repositoryRoot)
    return await fileManifest(path.join(temporaryRoot, projectName))
  } finally {
    globalThis.Date = NativeDate
    process.chdir(previousDirectory)
    await fs.remove(temporaryRoot)
  }
}
