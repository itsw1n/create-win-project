import chalk from 'chalk'

const BACK = Symbol('back')

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
export async function promptWithBack(inquirer, questions, initialAnswers = {}) {
  const answers = { ...initialAnswers }
  const history = []
  let index = 0

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
    if (answers[source.name] !== undefined && question.default === undefined) {
      question.default = answers[source.name]
    }
    if (question.type === 'input' && canGoBack) {
      question.message = `${question.message} (type :back to return)`
    } else if (question.type === 'confirm') {
      const defaultValue = await resolved(question.default, answers)
      question.type = 'list'
      question.choices = [
        { name: 'Yes', value: true },
        { name: 'No', value: false },
        ...(canGoBack ? [{ name: '← Back', value: BACK }] : []),
      ]
      question.default = defaultValue ? 0 : 1
    } else if (['list', 'checkbox'].includes(question.type) && canGoBack) {
      const choices = await resolved(question.choices, answers)
      question.choices = [...choices, new inquirer.Separator(), { name: '← Back', value: BACK }]
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
