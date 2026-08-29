import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

describe('lean shipped playbooks', () => {
  it('nextjs stack playbook is the lean copy (no compact dir)', () => {
    const compactDir = path.join(root, 'playbooks-compact')
    expect(fs.existsSync(compactDir)).toBe(false)

    const nextjs = path.join(root, 'playbooks', 'stack', 'nextjs.md')
    const content = fs.readFileSync(nextjs, 'utf-8')
    const lines = content.split('\n').length

    // Lean enough to avoid token burn, but still holds every rule section.
    expect(lines).toBeLessThan(2000)
    expect(content).toContain('snippet:nextjs-env')
    expect(content).toContain('# 80. Server-side Fetch Helper')
  })
})
