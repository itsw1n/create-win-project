import { CONTRIBUTION_HOOKS, PROMPT_SLOTS } from '../contract.js'

export function collectContributions(adapters, hook, context) {
  if (!CONTRIBUTION_HOOKS.includes(hook)) throw new Error(`Unknown contribution hook: ${hook}`)
  return adapters.flatMap((adapter) => {
    const result = adapter.contributes[hook](context)
    if (!Array.isArray(result)) {
      throw new Error(`${adapter.id} contribution ${hook} must return an array`)
    }
    return result
  })
}

export function collectPromptContributions(adapters, context) {
  const prompts = collectContributions(adapters, 'prompts', context)
  for (const prompt of prompts) {
    if (!prompt || !PROMPT_SLOTS.includes(prompt.slot) || !Array.isArray(prompt.questions)) {
      throw new Error('Prompt contributions require a supported slot and a questions array')
    }
  }
  return Object.freeze(Object.fromEntries(PROMPT_SLOTS.map((slot) => [
    slot,
    prompts.filter((prompt) => prompt.slot === slot).flatMap((prompt) => prompt.questions),
  ])))
}
