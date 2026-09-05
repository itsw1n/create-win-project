import { describe, expect, it } from 'vitest'
import { configurationDecisionChoices, promptWithBack } from '../../lib/interview.js'

function fakeInquirer(responses) {
  return {
    Separator: class Separator {},
    async prompt([question]) {
      const value = responses.shift()
      const back = question.choices?.find((choice) => choice?.name === '← Back')
      return { [question.name]: value === 'BACK' ? back.value : value }
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
