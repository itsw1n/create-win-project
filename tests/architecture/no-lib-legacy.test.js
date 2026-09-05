import { describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../..')

async function sourceFiles(directory) {
  const files = []
  if (!await fs.pathExists(directory)) return files
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFiles(target))
    else if (entry.name.endsWith('.js')) files.push(target)
  }
  return files
}

function imports(source) {
  return [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)].map((m) => m[1])
}

describe('no legacy lib wrappers', () => {
  it('bans src/** importing lib/** (src is canonical)', async () => {
    const allowed = new Set([])
    const files = await sourceFiles(path.join(root, 'src'))
    const violations = []
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      // only check top-level static import/export lines, not generated file content strings (which contain "@/lib/")
      const lines = content.split('\n').filter(l => /^\s*(import|export)\s.*from\s+['"]/.test(l))
      for (const line of lines) {
        const m = line.match(/from\s+['"]([^'"]+)['"]/)
        if (!m) continue
        const s = m[1]
        if (s.startsWith('@/')) continue // generated template alias, not real import
        if (s.includes('/lib/') || s.startsWith('../../lib/') || s.includes('../lib/')) {
          const key = `${path.relative(root, file)} -> ${s}`
          if (!allowed.has(key)) violations.push(key)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('bans one-line export wrappers to lib in src', async () => {
    const files = await sourceFiles(path.join(root, 'src'))
    const wrappers = []
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8')
      const lines = content.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('//'))
      if (lines.length <= 2 && /export\s+.*from\s+['"].*\/lib\//.test(content)) {
        wrappers.push(path.relative(root, file))
      }
    }
    expect(wrappers).toEqual([])
  })
})
