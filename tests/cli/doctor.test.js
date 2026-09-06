import { describe, expect, it, vi } from 'vitest'
import { printDoctor } from '../../src/cli/system-check.js'

describe('doctor', () => {
  it('prints both supported onboarding lanes without changing the machine', () => {
    const output = vi.fn()
    const diagnostics = [
      { name: 'Node.js', found: '24.20.0', expected: '24.20.0' },
      { name: 'Java', found: null, expected: '21' },
    ]
    printDoctor({ id: 'test', runtimes: { node: '24.20.0', java: '21' } }, output, diagnostics)
    const text = output.mock.calls.flat().join('\n')
    expect(text).toContain('npm ci && npm start')
    expect(text).toContain('docker compose build && docker compose run --rm app')
    expect(text).toContain('Java')
  })
})
