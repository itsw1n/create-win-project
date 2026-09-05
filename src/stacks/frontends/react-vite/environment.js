import { partitionEnvironment, renderEnvironment } from '../../shared/environment.js'

export function buildEnvironmentFiles(answers, stack) {
  const { publicNames, serverNames } = partitionEnvironment(stack)
  const files = { 'frontend/.env.example': renderEnvironment(publicNames, answers) }
  if (stack.backendKey === 'springboot') files['.env.example'] = renderEnvironment(serverNames, answers)
  return files
}
