import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { buildLaravelFiles } from './create-files.js'

export const laravelAdapter = defineStackAdapter({
  id: 'laravel',
  kind: 'backend',
  label: 'Laravel (PHP)',
  compatibleWith: {
    frontend: ['nextjs', 'react', 'react-native', 'no-frontend', 'laravel-ui'],
  },
  capabilities: {
    applicationShapes: ['fullstack', 'separate', 'api', 'mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'laravel-session', 'sanctum-spa', 'laravel-oidc'],
    runtime: 'php',
  },
  contributes: {
    files: ({ answers, stack, vars }) => Object.entries(buildLaravelFiles(answers, stack, vars)),
  },
})
