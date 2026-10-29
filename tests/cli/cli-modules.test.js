import { describe, expect, it, vi } from 'vitest'
import { parseArguments } from '../../src/cli/arguments.js'
import { buildQuestions, wrapText } from '../../src/cli/questions.js'
import { loadCatalog } from '../../src/engine/load-library.js'
import { printSummary, printNextSteps } from '../../src/cli/display.js'

describe('CLI modules', () => {
  it('parses aliases and noninteractive flags', () => {
    expect(parseArguments([
      '--shape=mobile', '--frontend=expo', '--backend=supabase', '--architecture=small',
      '--authentication=yes', '--auth-audience=multi-client', '--no-install',
      '--uploads=object-storage', '--background-jobs=queue', '--offline=sync',
    ])).toMatchObject({
      shape: 'mobile', frontend: 'react-native', backend: 'supabase', architecture: 'small',
      authentication: 'yes', authAudience: 'multi-client', noInstall: true,
      uploads: 'object-storage', backgroundJobs: 'queue', offline: 'sync',
    })
  })

  it.each([
    [['--shape=unknown'], '--shape'],
    [['--architecture=huge'], '--architecture'],
    [['--authentication=maybe'], '--authentication'],
    [['--uploads=public'], '--uploads'],
    [['--background-jobs=cron'], '--background-jobs'],
    [['--offline=always'], '--offline'],
    [['--install', '--no-install'], 'either --install or --no-install'],
  ])('rejects invalid arguments', (args, message) => {
    expect(() => parseArguments(args)).toThrow(message)
  })

  it('builds questions separately from CLI orchestration', () => {
    const catalog = { byId: {} }
    const questions = buildQuestions({ args: parseArguments([]), catalog })
    expect(questions.map((question) => question.name)).toEqual(expect.arrayContaining([
      'applicationShape', 'projectName', 'frontend', 'backend', 'installDependencies',
      'buildCi', 'securityChecks',
    ]))
    expect(questions.find((question) => question.name === 'docker').default).toBe(false)
    const install = questions.find((question) => question.name === 'installDependencies')
    expect(install.when({ mode: 'full', frontend: 'no-frontend', backend: 'springboot' })).toBe(false)
    const buildCi = questions.find((question) => question.name === 'buildCi')
    const securityChecks = questions.find((question) => question.name === 'securityChecks')
    expect(buildCi.message).toContain('build and test each change')
    expect(securityChecks.message).toContain('dependency and secret checks')
    expect(buildCi.when({ mode: 'architecture' })).toBe(false)
    expect(securityChecks.when({ mode: 'architecture' })).toBe(false)
    expect(buildCi.when({ mode: 'full' })).toBe(true)
    expect(securityChecks.when({ mode: 'full' })).toBe(true)
  })

  it('renders a readable summary through the display boundary', () => {
    const output = vi.fn()
    printSummary({
      answers: { projectName: 'demo', testing: 'basic', githubActions: true, installDependencies: false },
      stack: {
        label: 'Next.js', applicationShape: 'frontend', platform: 'web', styleId: null,
        architecture: 'small', authentication: 'public', constraints: [],
      },
      catalog: { byId: {} },
    }, output)
    expect(output.mock.calls.flat().join('\n')).toContain('demo')
    expect(output.mock.calls.flat().join('\n')).toContain('Install deps:')
  })

  it('explains authentication availability and optional planning notes in plain text', async () => {
    const catalog = await loadCatalog(`${process.cwd()}/library`)
    const questions = buildQuestions({ args: parseArguments([]), catalog })
    const authentication = questions.find((question) => question.name === 'authentication')
    const postgresOptions = authentication.choices({ backend: 'postgres' }).filter((choice) => typeof choice.value !== 'undefined')
    expect(postgresOptions.map((choice) => choice.value)).toEqual(['not-yet', 'none'])
    for (const row of postgresOptions) expect(row.name).not.toContain('\n  ')
    expect(authentication.message({ backend: 'postgres' })).toContain('unavailable')
    expect(authentication.choices({ backend: 'supabase' }).map((choice) => choice.value)).toContain('yes')
    expect(authentication.choices({ backend: 'supabase' }).find((choice) => choice.value === 'not-yet').name).toContain('No login yet')
    expect(authentication.choices({ backend: 'supabase' }).find((choice) => choice.value === 'none').name).toContain('No sign-in planned')
    const audience = questions.find((question) => question.name === 'authAudience')
    expect(audience.when({ frontend: 'react-native', backend: 'springboot', authentication: 'yes' })).toBe(false)
    expect(audience.when({ frontend: 'react', backend: 'fastapi', authentication: 'yes' })).toBe(false)
    expect(audience.when({ frontend: 'react', backend: 'springboot', authentication: 'yes' })).toBe(true)
    expect(questions.find((question) => question.name === 'expectedConcerns').message).toContain('Leave empty if unsure')
  })

  it('shows application shape outcomes and points to setup without inventing Docker commands', async () => {
    const catalog = await loadCatalog(`${process.cwd()}/library`)
    const questions = buildQuestions({ args: parseArguments([]), catalog })
    const shapes = questions.find((question) => question.name === 'applicationShape').choices
    expect(shapes.find((choice) => choice.value === 'separate').name).toContain('Two applications connected through an API')
    const lines = []
    printNextSteps({ projectName: 'demo', guidance: 'none', installDependencies: false, docker: false }, {}, (line) => lines.push(String(line)))
    const output = lines.join('\n')
    expect(output).toContain('docs/guides/setup.md')
    expect(output).not.toContain('docker compose')
    expect(output).not.toContain('RULES.md')
  })

  it('wraps descriptions for narrow terminals without losing words', () => {
    expect(wrapText('one two three four five', 9)).toBe('one two\n  three\n  four five')
  })
})

describe('generation modes', () => {
  it('parses architecture mode', () => {
    expect(parseArguments(['--mode=architecture'])).toMatchObject({ mode: 'architecture' })
  })

  it('rejects an unknown generation mode', () => {
    expect(() => parseArguments(['--mode=quick'])).toThrow('--mode must be architecture or full')
  })

  it('shows tooling only for full projects', () => {
    const catalog = { byId: {} }
    const questions = buildQuestions({ args: parseArguments([]), catalog })
    const docker = questions.find((q) => q.name === 'docker')
    expect(docker.when({ mode: 'architecture', frontend: 'nextjs', backend: 'none' })).toBe(false)
    expect(docker.when({ mode: 'full', frontend: 'nextjs', backend: 'none' })).toBe(true)
  })
})
