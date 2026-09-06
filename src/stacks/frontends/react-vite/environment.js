import { partitionEnvironment, renderEnvironment } from '../../shared/environment.js'

export function buildEnvironmentFiles(answers, stack) {
  const { publicNames, serverNames } = partitionEnvironment(stack)
  const files = { 'frontend/.env.example': renderEnvironment(publicNames, answers) }
  if (['springboot', 'fastapi'].includes(stack.backendKey)) files['.env.example'] = renderEnvironment(serverNames, answers)
  return files
}
