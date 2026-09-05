import { describe, expect, it } from 'vitest'
import { configurationDecisionChoices, lastEnabledIndex, promptWithBack } from '../../src/cli/navigation.js'
import { buildQuestions, exampleForShape } from '../../src/cli/questions.js'

function fakeInquirer(responses, seen = []) {
  return {
    Separator: class Separator {
      constructor(text) { this.text = text }
    },
    async prompt([question], answersState = {}) {
      // Simulate real inquirer: skip questions whose answer already exists
      // unless askAnswered is set (inquirer PromptUI.filterIfRunnable).
      // Skipped questions never reach the prompt UI, so only record prompted ones.
      if (question.askAnswered !== true && answersState[question.name] !== undefined) {
        return { [question.name]: answersState[question.name] }
      }
      seen.push(question)
      // Simulate real inquirer: run validate first, retry on error string.
      for (;;) {
        const value = responses.shift()
        const back = question.choices?.find((choice) => choice?.name === '← Back')
        const resolved = value === 'BACK' ? back.value : value === 'ENTER' ? question.default : value
        if (typeof question.validate === 'function') {
          const verdict = await question.validate(resolved, answersState)
          if (verdict !== true) continue
        }
        return { [question.name]: resolved }
      }
    },
  }
}

function recordingInquirer(responses, seen) {
  return fakeInquirer(responses, seen)
}

describe('navigable interview', () => {
  it('returns to an earlier prompt and replaces dependent answers', async () => {
    const inquirer = fakeInquirer(['fullstack', 'nextjs', 'BACK', 'BACK', 'frontend', 'react', 'none'])
    const answers = await promptWithBack(inquirer, [
      { type: 'list', name: 'shape', message: 'Shape?', choices: [{ name: 'Full', value: 'fullstack' }, { name: 'Front', value: 'frontend' }] },
      { type: 'list', name: 'frontend', message: 'Frontend?', choices: (state) => state.shape === 'fullstack' ? [{ name: 'Next', value: 'nextjs' }] : [{ name: 'React', value: 'react' }] },
      { type: 'list', name: 'backend', message: 'Backend?', choices: [{ name: 'None', value: 'none' }] },
    ])
    expect(answers).toMatchObject({ shape: 'frontend', frontend: 'react' })
  })

  it('lets :back pass input validation and return to the earlier prompt', async () => {
    const inquirer = fakeInquirer(['first', ':back', 'second', 'kept'])
    const answers = await promptWithBack(inquirer, [
      { type: 'list', name: 'shape', message: 'Shape?', choices: [{ name: 'A', value: 'a' }, { name: 'B', value: 'b' }] },
      {
        type: 'input', name: 'projectName', message: 'Project name?',
        validate: (value) => /^[a-z0-9-]+$/.test(value) ? true : 'Error: bad name.',
      },
    ])
    expect(answers).toMatchObject({ shape: 'second', projectName: 'kept' })
  })

  it('renders compact single-line rows with a shared footer and Back last', async () => {
    const seen = []
    const [shapeQuestion] = buildQuestions({ args: {}, catalog: { byId: {} } })
    await promptWithBack(recordingInquirer(['fullstack', 'x'], seen), [
      shapeQuestion,
      { type: 'list', name: 'next', message: 'Next?', choices: [{ name: 'X', value: 'x' }] },
    ])
    const firstChoices = seen[0].choices
    const rows = firstChoices.filter((choice) => choice && typeof choice.value !== 'undefined')
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(row.name).not.toContain('\n  ')
    expect(rows[0].name).toContain('(e.g. Next.js or Laravel)')
    expect(rows[0].name).toContain('Recommended')
    const footers = firstChoices.filter((choice) => choice?.constructor?.name === 'Separator')
    expect(footers.some((separator) => separator.text.includes('Choose the runtime layout'))).toBe(true)
    // No Back on the first prompt (nothing to return to); Back closes later lists.
    expect(firstChoices.some((choice) => choice?.name === '← Back')).toBe(false)
    expect(seen[1].choices.at(-1).name).toBe('← Back')
  })

  it('extracts only authored shape examples for compact rows', () => {
    expect(exampleForShape('fullstack')).toBe('Next.js or Laravel')
    expect(exampleForShape('separate')).toBe('React/Vite + Spring Boot or Laravel')
    expect(exampleForShape('mobile')).toBeUndefined()
  })

  it('resumes Back-and-edit at the last enabled question with Back available', async () => {
    const questions = [
      { type: 'list', name: 'a', message: 'A?', choices: [{ name: 'A1', value: 'a1' }] },
      { type: 'list', name: 'b', message: 'B?', choices: [{ name: 'B1', value: 'b1' }] },
      { type: 'list', name: 'c', message: 'C?', choices: [{ name: 'C1', value: 'c1' }] },
      { type: 'list', name: 'd', message: 'D?', choices: [{ name: 'D1', value: 'd1' }], when: () => false },
    ]
    const first = await promptWithBack(fakeInquirer(['a1', 'b1', 'c1']), questions)
    expect(lastEnabledIndex(questions, first)).toBe(2)
    const seen = []
    const second = await promptWithBack(
      recordingInquirer(['c1'], seen), questions, first, lastEnabledIndex(questions, first),
    )
    expect(seen[0].name).toBe('c')
    expect(seen[0].message).toContain('Step 3 of 4')
    expect(seen[0].message).toContain('editing previous answers')
    expect(seen[0].choices.some((choice) => choice?.name === '← Back')).toBe(true)
    expect(second).toMatchObject({ a: 'a1', b: 'b1', c: 'c1' })
  })

  it('asks Continue-or-Back after a re-entered checkbox so Enter never traps', async () => {
    const questions = [
      { type: 'list', name: 'a', message: 'A?', choices: [{ name: 'A1', value: 'a1' }] },
      { type: 'checkbox', name: 'b', message: 'B?', choices: [{ name: 'X', value: 'x' }] },
    ]
    const first = await promptWithBack(fakeInquirer(['a1', []]), questions)
    expect(first).toMatchObject({ a: 'a1', b: [] })
    // Resume at the checkbox, accept unchanged with plain Enter, then go Back
    // at the follow-up: must land back on A, not return to Ready.
    const seen = []
    const second = await promptWithBack(
      recordingInquirer(['ENTER', 'BACK', 'a1', [], 'continue'], seen),
      questions, first, lastEnabledIndex(questions, first),
    )
    expect(seen.map((question) => question.name)).toEqual(['b', '__continue', 'a', 'b', '__continue'])
    expect(second).toMatchObject({ a: 'a1', b: [] })
  })

  it('shows no resume hint on a fresh start', async () => {
    const seen = []
    await promptWithBack(recordingInquirer(['a1'], seen), [
      { type: 'list', name: 'a', message: 'A?', choices: [{ name: 'A1', value: 'a1' }] },
    ])
    expect(seen[0].message).not.toContain('editing previous answers')
  })

  it('offers create, edit, and cancel at confirmation', () => {
    expect(configurationDecisionChoices().map((choice) => choice.value)).toEqual(['create', 'back', 'cancel'])
  })

  it('shows numbered headings and keyboard help without relying on color', async () => {
    const seen = []
    await promptWithBack(recordingInquirer(['next'], seen), [
      { type: 'list', name: 'frontend', message: 'Framework', choices: [{ name: 'Next.js', value: 'next' }] },
    ])
    expect(seen[0].message).toContain('Step 1 of 1 - Framework')
    expect(seen[0].message).toContain('Arrow keys move')
    expect(seen[0].message).toContain('Enter selects')
  })
})
