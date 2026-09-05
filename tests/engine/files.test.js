import { describe, it, expect } from 'vitest'
import path from 'path'
import { readTemplate, render, buildVars } from '../../src/engine/render-templates.js'
import { loadCatalog, resolveStack } from '../../src/engine/load-library.js'

const templatesDir = path.join(process.cwd(), 'templates')

describe('template rendering', () => {
  it('reads and renders correctly for nextjs + springboot', async () => {
    const catalog = await loadCatalog(path.join(process.cwd(), 'library'))
    const stack = resolveStack({ frontend: 'nextjs', backend: 'springboot', styling: 'tailwind', architecture: 'medium' }, catalog)
    const vars = buildVars({ projectName: 'myapp', projectDescription: 'test', packageName: 'com.example' }, stack)

    // makefile template
    const tpl = await readTemplate(templatesDir, 'makefile', stack.makefileTemplate, '.mk')
    expect(tpl).not.toBeNull()
    expect(tpl).toContain('{{PROJECT_NAME}}')
    const rendered = render(tpl, vars)
    expect(rendered).toContain('myapp')
    expect(rendered).not.toContain('{{PROJECT_NAME}}')

    // agents template
    const agentsTpl = await readTemplate(templatesDir, 'agents', stack.agentsTemplate, '.md')
    expect(agentsTpl).not.toBeNull()
    expect(render(agentsTpl, vars)).toContain('myapp')

    // docker compose for springboot
    const compose = await readTemplate(templatesDir, 'docker/compose', 'springboot', '.yml')
    expect(compose).not.toBeNull()
    expect(render(compose, vars)).toContain('myapp')
  })

  it('reads and renders correctly for react-native (no Makefile, no docker)', async () => {
    const catalog = await loadCatalog(path.join(process.cwd(), 'library'))
    const stack = resolveStack({ frontend: 'react-native', backend: 'none' }, catalog)
    expect(stack.isMobile).toBe(true)
    expect(stack.makefileTemplate).toBeNull() // mobile has no makefile
    // react-native should have agents/readme/gitignore but no makefile/docker
    const agentsTpl = await readTemplate(templatesDir, 'agents', stack.agentsTemplate, '.md')
    expect(agentsTpl).not.toBeNull()
    const vars = buildVars({ projectName: 'rnapp', projectDescription: 'mobile' }, stack)
    expect(render(agentsTpl, vars)).toContain('rnapp')

    // ensure no docker template is expected for mobile
    // generator skips docker when isMobile true, so we just verify no crash
    const makeTpl = await readTemplate(templatesDir, 'makefile', stack.makefileTemplate, '.mk')
    expect(makeTpl).toBeNull()
  })

  it('missing template file returns null without throwing', async () => {
    const missing = await readTemplate(templatesDir, 'makefile', 'nonexistent-template-xyz', '.mk')
    expect(missing).toBeNull()
    const missing2 = await readTemplate(templatesDir, 'agents', null, '.md')
    expect(missing2).toBeNull()
    // render with missing vars should keep token
    expect(render('hello {{MISSING}} world', {})).toBe('hello {{MISSING}} world')
  })
})
