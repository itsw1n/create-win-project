import { afterEach, describe, expect, it } from 'vitest'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { createUpgradeReport } from '../../src/engine/upgrade-report.js'

const temporary = []
afterEach(async () => Promise.all(temporary.splice(0).map((entry) => fs.remove(entry))))

describe('upgrade report', () => {
  it('reports profile, runtime, security, and migration differences without writing', async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), 'cwp-upgrade-'))
    temporary.push(project)
    const profilePath = path.join(project, 'create-win-project.profile.json')
    await fs.writeJson(profilePath, { schemaVersion: 1, stack: 'nextjs-none', compatibilityProfile: { id: '2026.08' }, runtimes: {}, productionBaseline: {} })
    const before = await fs.readFile(profilePath, 'utf8')
    const report = await createUpgradeReport(project, path.resolve('library/tested-versions.json'))
    expect(report.readOnly).toBe(true)
    expect(report.differences.map(({ area }) => area)).toEqual(expect.arrayContaining([
      'migration', 'compatibility-profile', 'runtime.node', 'security-contract.tests',
    ]))
    expect(await fs.readFile(profilePath, 'utf8')).toBe(before)
  })
})
