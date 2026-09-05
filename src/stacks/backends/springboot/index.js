import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { buildSpringBootFiles } from './create-files.js'
import { ciContributions } from './ci.js'
import { dockerContributions } from './docker.js'
import { environmentContributions } from './environment.js'

export const springbootAdapter = defineStackAdapter({
  id: 'springboot',
  kind: 'backend',
  label: 'Spring Boot',
  compatibleWith: { frontend: ['nextjs', 'react', 'react-native', 'no-frontend'] },
  capabilities: {
    applicationShapes: ['separate', 'api', 'mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'session', 'oidc'],
    runtime: 'java',
  },
  contributes: {
    files: ({ answers, stack, vars }) => Object.entries(buildSpringBootFiles(answers, vars, stack)),
    environment: environmentContributions,
    install: () => [{ cwd: 'backend', command: './mvnw', args: ['dependency:go-offline'] }],
    docker: dockerContributions,
    ci: ciContributions,
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'react', architecture: 'medium', authentication: 'session' },
      { frontend: 'react-native', architecture: 'large', authentication: 'oidc' },
      { frontend: 'no-frontend', architecture: 'medium', authentication: 'undecided' },
    ],
  },
})
