import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.resolve(__dirname, '..')

describe('lean shipped playbooks', () => {
  it('nextjs stack playbook is lean — no compact dir, concerns extracted', () => {
    // No compact dir needed — concerns live in their own files
    const compactDir = path.join(root, 'playbooks-compact')
    expect(fs.existsSync(compactDir)).toBe(false)

    const nextjs  = path.join(root, 'playbooks', 'stack', 'nextjs.md')
    const content = fs.readFileSync(nextjs, 'utf-8')
    const lines   = content.split('\n').length

    // Lean: optional concerns stripped out into concerns/ folder
    expect(lines).toBeLessThan(1400)
    // Still has the server-side fetch helper (stack-specific, not shared)
    expect(content).toContain('# 74. Server-side Fetch Helper')
    // References concern files rather than embedding them
    expect(content).toContain('concerns/zod.md')
    expect(content).toContain('concerns/zustand.md')
  })

  it('concern files exist and are standalone', () => {
    const concerns = [
      'zustand.md', 'tanstack-query.md', 'zod.md',
      'axios.md', 't3-env.md', 'nuqs.md',
      'next-safe-action.md', 'next-themes.md', 'nativewind.md',
    ]
    for (const file of concerns) {
      const fullPath = path.join(root, 'playbooks', 'concerns', file)
      expect(fs.existsSync(fullPath), `Missing: concerns/${file}`).toBe(true)
      const content = fs.readFileSync(fullPath, 'utf-8')
      // Each concern file should have an agent quick reference
      expect(content, `${file} missing Agent Quick Reference`).toContain('Agent Quick Reference')
    }
  })

  it('t3-env concern file contains the snippet tag', () => {
    const content = fs.readFileSync(
      path.join(root, 'playbooks', 'concerns', 't3-env.md'), 'utf-8'
    )
    expect(content).toContain('snippet:nextjs-env')
  })

  it('react-native playbook references concern files not embedding them', () => {
    const content = fs.readFileSync(
      path.join(root, 'playbooks', 'stack', 'react-native.md'), 'utf-8'
    )
    // RN playbook should be lean — concerns live in concerns/
    const lines = content.split('\n').length
    expect(lines).toBeLessThan(1200)
  })
})
