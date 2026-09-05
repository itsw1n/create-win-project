import { describe, expect, it } from 'vitest'
import { configurationDecisionChoices, promptWithBack } from '../../src/cli/navigation.js'
import { buildQuestions } from '../../src/cli/questions.js'

function fakeInquirer(responses) {
  return {
    Separator: class Separator {
      constructor(text) { this.text = text }
    },
    async prompt([question]) {
      // Simulate real inquirer: run validate first, retry on error string.
      for (;;) {
        const value = responses.shift()
        const back = question.choices?.find((choice) => choice?.name === '← Back')
        const resolved = value === 'BACK' ? back.value : value
        if (typeof question.validate === 'function') {
          const verdict = await question.validate(resolved, {})
          if (verdict !== true) continue
        }
        return { [question.name]: resolved }
      }
    },
  }
}

function recordingInquirer(responses, seen) {
  const fake = fakeInquirer(responses)
  return { ...fake, async prompt([question]) { seen.push(question); return fake.prompt([question]) } }
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
