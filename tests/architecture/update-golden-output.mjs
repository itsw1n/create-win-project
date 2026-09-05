import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateGoldenManifest, goldenCases } from './golden-output.js'

const architectureDirectory = path.dirname(fileURLToPath(import.meta.url))
const repositoryRoot = path.resolve(architectureDirectory, '../..')
const fixtureDirectory = path.join(architectureDirectory, 'fixtures', 'generated-output')

await fs.ensureDir(fixtureDirectory)
for (const caseName of Object.keys(goldenCases)) {
  const manifest = await generateGoldenManifest(caseName, repositoryRoot)
  await fs.writeJson(path.join(fixtureDirectory, `${caseName}.json`), manifest, { spaces: 2 })
}
