import chalk from 'chalk'

const BACK = Symbol('back')

export function wrapText(text, width = Math.max(28, Math.min(72, (process.stdout.columns || 80) - 8))) {
  const lines = []
  for (const word of text.split(/\s+/)) {
    const last = lines.at(-1)
    if (!last || `${last} ${word}`.length > width) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
  }
  return lines.join('\n  ')
}

function enabled(question, answers) {
  return typeof question.when === 'function' ? question.when(answers) : question.when !== false
}

async function resolved(value, answers) {
  return typeof value === 'function' ? value(answers) : value
}

function clearFrom(questions, answers, index) {
  for (let cursor = index; cursor < questions.length; cursor += 1) {
    delete answers[questions[cursor].name]
  }
}

/**
 * Runs Inquirer questions one at a time so users can safely revisit earlier answers.
 * List/checkbox/confirm prompts expose a visible Back choice; text prompts accept `:back`.
 */
export function lastEnabledIndex(questions, answers) {
  let last = 0
  questions.forEach((question, index) => {
    if (enabled(question, answers)) last = index
  })
  return last
}

export async function promptWithBack(inquirer, questions, initialAnswers = {}, startIndex = 0) {
  const answers = { ...initialAnswers }
  // Seed history with previously asked prompts so Back navigation,
  // step numbering, and clearFrom targets mirror a natural pass.
  // Skipped (when:false) prompts are never seeded, exactly as a pass never pushes them.
  const history = []
  for (let seed = 0; seed < startIndex; seed += 1) {
    if (enabled(questions[seed], answers)) history.push(seed)
  }
  let index = startIndex
  let resumeHintShown = startIndex === 0

  while (index < questions.length) {
    const source = questions[index]
    if (!enabled(source, answers)) { index += 1; continue }

    const canGoBack = history.length > 0
    const question = { ...source, when: undefined }
    const title = await resolved(question.message, answers)
    const controls = question.type === 'checkbox'
      ? 'Arrow keys move • Space selects • Enter continues • Back returns'
      : question.type === 'input'
        ? 'Type an answer • Enter continues • :back returns'
        : 'Arrow keys move • Enter selects • Back returns'
    question.message = `${chalk.cyan.bold(`Step ${history.length + 1} of ${questions.length} - ${title}`)}\n${chalk.dim(controls)}\n`
    if (!resumeHintShown) {
      question.message = `${question.message}${chalk.dim('(editing previous answers — choose ← Back to revisit earlier steps, Enter keeps values and returns)\n')}`
      resumeHintShown = true
    }
    if (answers[source.name] !== undefined && question.default === undefined) {
      question.default = answers[source.name]
    }
    if (question.type === 'input' && canGoBack) {
      question.message = `${question.message} (type :back to return)`
    }
    if (question.type === 'input') {
      // Let the :back sentinel through validation so promptWithBack can
      // handle it; inquirer validates before returning the value.
      const originalValidate = question.validate
      question.validate = (value, answersState) =>
        value === ':back' ? true : (originalValidate?.(value, answersState) ?? true)
    }
    if (question.type === 'confirm') {
      const defaultValue = await resolved(question.default, answers)
      question.type = 'list'
      question.choices = [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
        ...(canGoBack ? [{ name: '← Back', value: BACK }] : []),
      ]
      question.default = defaultValue ? 0 : 1
    } else if (['list', 'checkbox'].includes(question.type)) {
      const raw = await resolved(question.choices, answers)
      const rest = raw.filter((choice) => choice?.type !== 'description-footer')
      const footers = raw
        .filter((choice) => choice?.type === 'description-footer')
        .map((footer) => new inquirer.Separator(chalk.dim(wrapText(footer.text))))
      question.choices = canGoBack
        ? [...rest, ...footers, new inquirer.Separator(), { name: '← Back', value: BACK }]
        : [...rest, ...footers]
    }

    if (typeof question.default === 'function') question.default = await question.default(answers)
    const result = await inquirer.prompt([question], answers)
    const value = result[source.name]
    const requestedBack = value === BACK || value === ':back' || (Array.isArray(value) && value.includes(BACK))
    if (requestedBack) {
      const target = history.pop()
      if (target === undefined) continue
      clearFrom(questions, answers, target)
      index = target
      continue
    }

    answers[source.name] = value
    history.push(index)
    index += 1
  }

  return answers
}

export function configurationDecisionChoices() {
  return [
    { name: 'Create project\n  Write the reviewed files and selected configuration.\n', value: 'create' },
    { name: 'Back and edit\n  Return to the interview without creating files.\n', value: 'back' },
    { name: 'Cancel\n  Exit without creating files.\n', value: 'cancel' },
  ]
}
