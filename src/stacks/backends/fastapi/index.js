import { defineStackAdapter } from '../../rules.js'
import { buildFastApiFiles } from './create-files.js'
import { ciContributions } from './ci.js'
import { dockerContributions } from './docker.js'
import { environmentContributions } from './environment.js'

export const fastapiAdapter = defineStackAdapter({
  id: 'fastapi',
  kind: 'backend',
  label: 'FastAPI',
  compatibleWith: { frontend: ['nextjs', 'react', 'react-native', 'no-frontend'] },
  capabilities: {
    applicationShapes: ['separate', 'api', 'mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'oidc'],
    runtime: 'python',
  },
  contributes: {
    files: ({ answers, stack, vars }) => Object.entries(buildFastApiFiles(answers, vars, stack)),
    environment: environmentContributions,
    install: (context = {}) => [{ cwd: context.stack?.frontendKey === 'no-frontend' ? '.' : 'backend', command: 'uv', args: ['sync'] }],
    docker: dockerContributions,
    ci: ciContributions,
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'nextjs', architecture: 'medium', authentication: 'oidc' },
      { frontend: 'react', architecture: 'medium', authentication: 'oidc' },
      { frontend: 'react-native', architecture: 'large', authentication: 'oidc' },
      { frontend: 'no-frontend', architecture: 'medium', authentication: 'undecided' },
    ],
  },
})
