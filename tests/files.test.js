import { describe, it, expect } from 'vitest'
import { agentsMd } from '../lib/files.js'

describe('agentsMd', () => {
  it('is lean and instructs lazy loading', () => {
    const stack = { label: 'Next.js + Supabase', constraints: ['Server Components default'], isNextjs: true, architecture: 'medium', isSupabase: true, isSpringBoot: false, isPrisma: false, frontendDir: '' }
    const out = agentsMd({ PROJECT_NAME: 'x', PROJECT_DESCRIPTION: 'y' }, stack)
    expect(out).toContain('always loaded')
    expect(out).toContain('Never read all playbooks eagerly')
    expect(out).not.toContain('src/components/ui/       → Dumb primitives') // no full folder tree dump
  })
})
