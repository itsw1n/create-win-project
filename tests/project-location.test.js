import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { isInsideDirectory, projectLocationNotice } from '../lib/project-location.js'

describe('generated project location notice', () => {
  const repository = path.resolve('/work/create-win-project')

  it('warns when generation runs from the cloned generator repository', () => {
    const notice = projectLocationNotice({ cwd: repository, cliRoot: repository, projectName: 'my-app' })
    expect(notice?.generatedPath).toBe(path.join(repository, 'my-app'))
    expect(notice?.suggestedPath).toBe(path.resolve('/work/my-app'))
    expect(notice?.message).toContain('outside this repository')
  })

  it('also detects a working directory nested inside the generator repository', () => {
    expect(isInsideDirectory(path.join(repository, 'examples'), repository)).toBe(true)
  })

  it('does not warn for normal npx or global usage outside the generator repository', () => {
    expect(projectLocationNotice({ cwd: '/projects', cliRoot: repository, projectName: 'my-app' })).toBeNull()
  })
})
