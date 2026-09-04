import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { runDependencySteps } from '../src/engine/install-dependencies.js'
import {
  projectDestinations,
  writeFile,
  writeProjectAtomically,
} from '../src/engine/write-files.js'
import { writeRenderedFile } from '../src/engine/render-templates.js'

const temporaryDirectories = []

async function temporaryDirectory() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'cwp-engine-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.remove(directory)))
})

describe('engine modules', () => {
  it('refuses every existing destination before staging writes', async () => {
    const cwd = await temporaryDirectory()
    await fs.ensureDir(path.join(cwd, 'occupied'))
    await expect(projectDestinations(cwd, 'occupied')).rejects.toThrow(/already exists/)
  })

  it('publishes a completed staging tree atomically', async () => {
    const cwd = await temporaryDirectory()
    const destinations = await projectDestinations(cwd, 'example')
    await writeProjectAtomically({
      ...destinations,
      generate: (staging) => writeFile(staging, 'nested/file.txt', 'complete'),
    })
    await expect(fs.readFile(path.join(destinations.finalDestination, 'nested/file.txt'), 'utf8'))
      .resolves.toBe('complete')
    expect(await fs.pathExists(destinations.stagingDestination)).toBe(false)
  })

  it('cleans staging output and preserves the destination on generation failure', async () => {
    const cwd = await temporaryDirectory()
    const destinations = await projectDestinations(cwd, 'example')
    await expect(writeProjectAtomically({
      ...destinations,
      generate: async (staging) => {
        await writeFile(staging, 'partial.txt', 'partial')
        throw new Error('generation failed')
      },
    })).rejects.toThrow('generation failed')
    expect(await fs.pathExists(destinations.stagingDestination)).toBe(false)
    expect(await fs.pathExists(destinations.finalDestination)).toBe(false)
  })

  it('renders templates through the write boundary', async () => {
    const cwd = await temporaryDirectory()
    await writeRenderedFile(cwd, 'message.txt', 'Hello {{NAME}}', { NAME: 'Win' })
    await expect(fs.readFile(path.join(cwd, 'message.txt'), 'utf8')).resolves.toBe('Hello Win')
  })

  it('stops dependency execution at the first failed step', () => {
    const run = vi.fn()
      .mockReturnValueOnce({ status: 0 })
      .mockReturnValueOnce({ status: 1 })
      .mockReturnValueOnce({ status: 0 })
    const steps = [
      { command: 'first', args: [], cwd: '/tmp' },
      { command: 'second', args: [], cwd: '/tmp' },
      { command: 'third', args: [], cwd: '/tmp' },
    ]
    expect(runDependencySteps(steps, run)).toMatchObject({ ok: false, failed: steps[1] })
    expect(run).toHaveBeenCalledTimes(2)
  })
})
