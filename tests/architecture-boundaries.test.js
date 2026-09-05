import { describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')

async function sourceFiles(directory) {
  const files = []
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFiles(target))
    else if (entry.name.endsWith('.js')) files.push(target)
  }
  return files
}

function imports(source) {
  return [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"]+)['"]/g)].map((match) => match[1])
}

describe('source ownership boundaries', () => {
  it('keeps the engine independent from terminal code and concrete stack folders', async () => {
    const files = await sourceFiles(path.join(root, 'src/engine'))
    const violations = []
    for (const file of files) {
      const specifiers = imports(await fs.readFile(file, 'utf8'))
      for (const specifier of specifiers) {
        if (/\/(?:cli|stacks\/(?:frontends|backends))\//.test(specifier)) {
          violations.push(`${path.relative(root, file)} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])
  })

  it('keeps stacks independent from CLI and engine implementation modules', async () => {
    const files = await sourceFiles(path.join(root, 'src/stacks'))
    const violations = []
    for (const file of files) {
      // Transitional composition root: PR3-PR5 replace this dispatcher with
      // adapter-owned contributions and remove this exception.
      if (path.relative(root, file) === 'src/stacks/create-project.js') continue
      const specifiers = imports(await fs.readFile(file, 'utf8'))
      for (const specifier of specifiers) {
        if (/\/(?:cli|engine)\//.test(specifier)) {
          violations.push(`${path.relative(root, file)} -> ${specifier}`)
        }
      }
    }
    expect(violations).toEqual([])
  })
})
