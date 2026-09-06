import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const root = path.resolve(import.meta.dirname, '..', '..')

function matrix(scope) {
  const output = execFileSync(process.execPath, ['checks/check-compatibility.js', `--scope=${scope}`], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(output).flatMap((shard) => shard.cases)
}

function shards(scope) {
  const output = execFileSync(process.execPath, ['checks/check-compatibility.js', `--scope=${scope}`], {
    cwd: root,
    encoding: 'utf8',
  })
  return JSON.parse(output)
}

describe('compatibility matrix cost model', () => {
  it('keeps exhaustive contracts but limits repeated native work', () => {
    const cases = matrix('full')
    const native = cases.filter((entry) => entry.native)
    const containers = cases.filter((entry) => entry.containers)

    expect(cases.length).toBeGreaterThan(200)
    expect(native.length).toBeLessThan(cases.length / 2)
    expect(containers).toHaveLength(4)
    expect(containers.every((entry) => entry.native)).toBe(true)

    for (const architecture of ['small', 'medium', 'large']) {
      expect(native.some((entry) => entry.case.includes('fastapi') && entry.architecture === architecture)).toBe(true)
    }


    const fullShards = shards('full')
    expect(fullShards.map((shard) => shard.cases.filter((entry) => entry.native).length)).toEqual([7, 7, 7, 7])
    expect(fullShards.map((shard) => shard.cases.filter((entry) => entry.containers).length)).toEqual([1, 1, 1, 1])
  })

  it('runs every smoke entry through native verification', () => {
    expect(matrix('smoke').every((entry) => entry.native)).toBe(true)
  })
})
