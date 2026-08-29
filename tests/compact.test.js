import { describe, it, expect } from 'vitest'
import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const playbooksDir = path.join(root, 'playbooks')
const compactDir = path.join(root, 'playbooks-compact')

const SECTION_RE = /^## (?!#)(.+)$/gm

async function walk(dir) {
  const out = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (entry.name.endsWith('.md')) out.push(full)
  }
  return out
}

function rel(file) {
  return path.relative(compactDir, file).split(path.sep).join('/')
}

function snippetMarkers(content) {
  return [...content.matchAll(/<!--\s*snippet:([\w-]+)\s*-->/g)].map((m) => m[1])
}

function h2Headings(content) {
  return [...content.matchAll(SECTION_RE)].map((m) => m[1].trim())
}

describe('compact playbooks stay consistent with full playbooks', () => {
  it('every compact .md has a corresponding full counterpart (valid fallback)', async () => {
    const compactFiles = await walk(compactDir)
    expect(compactFiles.length).toBeGreaterThan(0)
    for (const file of compactFiles) {
      const fullPath = path.join(playbooksDir, rel(file))
      expect(await fs.pathExists(fullPath), `missing full counterpart for ${rel(file)}`).toBe(true)
    }
  })

  it('every snippet marker present in the full playbook also appears in its compact counterpart', async () => {
    for (const file of await walk(compactDir)) {
      const fullPath = path.join(playbooksDir, rel(file))
      const fullMarkers = snippetMarkers(await fs.readFile(fullPath, 'utf-8'))
      if (!fullMarkers.length) continue
      const compactMarkers = snippetMarkers(await fs.readFile(file, 'utf-8'))
      for (const tag of fullMarkers) {
        expect(compactMarkers.includes(tag), `snippet:${tag} missing in compact ${rel(file)}`).toBe(true)
      }
    }
  })

  it('every ## heading in a compact file also appears in the full file (no phantom sections)', async () => {
    for (const file of await walk(compactDir)) {
      const fullPath = path.join(playbooksDir, rel(file))
      const compactHeadings = h2Headings(await fs.readFile(file, 'utf-8'))
      const fullHeadings = new Set(h2Headings(await fs.readFile(fullPath, 'utf-8')))
      for (const h of compactHeadings) {
        expect(fullHeadings.has(h), `phantom heading "## ${h}" in compact ${rel(file)}`).toBe(true)
      }
    }
  })
})
