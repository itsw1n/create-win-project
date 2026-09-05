import { describe, expect, it, vi } from 'vitest'
import { printDoctor } from '../../src/cli/system-check.js'

describe('doctor', () => {
  it('prints both supported onboarding lanes without changing the machine', () => {
    const output = vi.fn()
    printDoctor({ id: 'test', runtimes: { node: '24.20.0', java: '21' } }, output)
    const text = output.mock.calls.flat().join('\n')
    expect(text).toContain('npm ci && npm start')
    expect(text).toContain('docker compose build && docker compose run --rm app')
    expect(text).toContain('Java')
  })
})
