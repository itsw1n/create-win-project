import { partitionEnvironment, renderEnvironment } from '../../shared/environment.js'

export function buildEnvironmentFiles(answers, stack) {
  const { publicNames, serverNames } = partitionEnvironment(stack)
  const names = stack.backendKey === 'springboot' ? [...publicNames, ...serverNames] : publicNames
  return { '.env.example': renderEnvironment(names, answers) }
}
