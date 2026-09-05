import { describe, expect, it, vi } from 'vitest'
import {
  decideInstallation,
  installationIssues,
  versionAtLeast,
} from '../../src/cli/system-check.js'

const profile = {
  runtimes: {
    nodeMinimum: '22.14.0', npmMinimum: '11.19.0', php: '8.5.10', composer: '2.10.3',
  },
}
const nextStack = { frontendKey: 'nextjs', backendKey: 'none' }

describe('installation system check', () => {
  it('accepts supported Node and npm versions', () => {
    expect(versionAtLeast('v22.23.2', '22.14.0')).toBe(true)
    expect(installationIssues(nextStack, profile, {
      node: '22.23.2', npm: '11.19.0', php: null, composer: null,
    })).toEqual([])
  })

  it('reports every unsupported or missing runtime before installation', () => {
    const issues = installationIssues(
      { frontendKey: 'laravel-ui', backendKey: 'laravel', laravelUi: 'inertia-react' },
      profile,
      { node: '22.23.1', npm: '10.9.8', php: null, composer: null },
    )
    expect(issues.map((issue) => issue.tool)).toEqual(['npm', 'PHP', 'Composer'])
    expect(issues[0]).toMatchObject({ found: '10.9.8', required: '11.19.0' })
  })

  it('skips installation safely in a noninteractive terminal', async () => {
    const choose = vi.fn()
    await expect(decideInstallation({
      requested: true, issues: [{ tool: 'npm' }], interactive: false, choose,
    })).resolves.toEqual({ install: false, reason: 'runtime-mismatch' })
    expect(choose).not.toHaveBeenCalled()
  })

  it('preserves an explicit skipped-install choice without probing the user', async () => {
    const choose = vi.fn()
    await expect(decideInstallation({
      requested: false, issues: [{ tool: 'npm' }], interactive: true, choose,
    })).resolves.toEqual({ install: false, reason: 'not-requested' })
    expect(choose).not.toHaveBeenCalled()
  })

  it.each([
    ['skip', { install: false, reason: 'runtime-mismatch' }],
    ['cancel', { install: false, reason: 'cancelled' }],
    ['instructions', { install: false, reason: 'show-instructions' }],
  ])('honors the interactive %s decision', async (answer, expected) => {
    await expect(decideInstallation({
      requested: true,
      issues: [{ tool: 'npm' }],
      interactive: true,
      choose: vi.fn().mockResolvedValue(answer),
    })).resolves.toEqual(expected)
  })
})
