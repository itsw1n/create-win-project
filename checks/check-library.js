import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, resolveStack } from '../src/engine/load-library.js'
import { buildRulesIndex, resolvePlaybook } from '../src/engine/project-guidance.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playbooksDir = path.join(root, 'library')
const catalog = await loadCatalog(playbooksDir)
const errors = []

for (const manifest of catalog.manifests) {
  for (const entry of manifest._playbooks || []) {
    const relative = typeof entry === 'string' ? entry : entry.file
    if (!await fs.pathExists(await resolvePlaybook(playbooksDir, relative))) {
      errors.push(`${manifest.id}: missing playbook ${relative}`)
    }
  }
}

const architectures = ['small', 'medium', 'large']
const authIntents = ['not-yet', 'none']
for (const frontend of catalog.frontends) {
  for (const backend of frontend.appliesTo?.backend || []) {
    const authCases = [...authIntents]
    if (['supabase', 'springboot'].includes(backend)) authCases.push('yes')
    for (const architecture of architectures) {
      for (const authentication of authCases) {
        const audiences = authentication === 'yes' && backend === 'springboot'
          ? ['website', 'multi-client']
          : [frontend.platform === 'mobile' ? 'multi-client' : 'website']
        for (const authAudience of audiences) {
          const stack = resolveStack({
            frontend: frontend.id, backend, architecture, authentication, authAudience,
            styling: frontend.stylingOptions?.[0], testing: 'basic', githubActions: true,
          }, catalog)
          try { await buildRulesIndex(stack, catalog, playbooksDir) }
          catch (error) { errors.push(`${frontend.id}/${backend}/${architecture}/${authentication}/${authAudience}: ${error.message}`) }
        }
      }
    }
  }
}

const markdownFiles = (await fs.readdir(playbooksDir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
  .map((entry) => path.join(entry.parentPath, entry.name))
for (const file of markdownFiles) {
  const content = await fs.readFile(file, 'utf8')
  const relative = path.relative(playbooksDir, file)
  const limit = relative.startsWith('stacks/') || relative.startsWith('platforms/') || relative.startsWith('features/') ? 250 : 650
  if (content.split('\n').length > limit) errors.push(`${relative}: exceeds ${limit} lines`)
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0]
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue
    if (!await fs.pathExists(path.resolve(path.dirname(file), target))) errors.push(`${relative}: broken link ${match[1]}`)
  }
}

const staleClaims = ['stack/nextjs.md', 'stack/react-vite.md', 'stack/react-native.md', 'stack/springboot.md', 'database/supabase.md', 'folder-structure.md']
for (const directory of [path.join(root, 'README.md'), path.join(root, 'docs'), playbooksDir]) {
  const stats = await fs.stat(directory)
  const files = stats.isDirectory()
    ? (await fs.readdir(directory, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith('.md')).map((entry) => path.join(entry.parentPath, entry.name))
    : [directory]
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    for (const stale of staleClaims) if (content.includes(stale)) errors.push(`${path.relative(root, file)}: stale reference ${stale}`)
  }
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`Validated ${catalog.manifests.length} manifests and ${markdownFiles.length} playbooks across the architecture/authentication matrix.`)
