import { describe, expect, it, vi } from 'vitest'
import { parseArguments } from '../../src/cli/arguments.js'
import { buildQuestions } from '../../src/cli/questions.js'
import { printSummary } from '../../src/cli/display.js'

describe('CLI modules', () => {
  it('parses aliases and noninteractive flags', () => {
    expect(parseArguments([
      '--shape=mobile', '--frontend=expo', '--backend=supabase', '--architecture=small',
      '--authentication=yes', '--auth-audience=multi-client', '--no-install',
    ])).toMatchObject({
      shape: 'mobile', frontend: 'react-native', backend: 'supabase', architecture: 'small',
      authentication: 'yes', authAudience: 'multi-client', noInstall: true,
    })
  })

  it.each([
    [['--shape=unknown'], '--shape'],
    [['--architecture=huge'], '--architecture'],
    [['--authentication=maybe'], '--authentication'],
    [['--install', '--no-install'], 'either --install or --no-install'],
  ])('rejects invalid arguments', (args, message) => {
    expect(() => parseArguments(args)).toThrow(message)
  })

  it('builds questions separately from CLI orchestration', () => {
    const catalog = { byId: {} }
    const questions = buildQuestions({ args: parseArguments([]), catalog })
    expect(questions.map((question) => question.name)).toEqual(expect.arrayContaining([
      'applicationShape', 'projectName', 'frontend', 'backend', 'installDependencies',
    ]))
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
})
