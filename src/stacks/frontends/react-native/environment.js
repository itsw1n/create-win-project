import { partitionEnvironment, renderEnvironment } from '../../shared/environment.js'

export function buildEnvironmentFiles(answers, stack) {
  const { publicNames, serverNames } = partitionEnvironment(stack)
  const names = ['springboot', 'fastapi'].includes(stack.backendKey) ? [...publicNames, ...serverNames] : publicNames
  return { '.env.example': renderEnvironment(names, answers) }
}
