import { defineStackAdapter } from '../../rules.js'
import { buildLaravelFiles } from './create-files.js'
import { dockerContributions } from './docker.js'
import { ciContributions } from './ci.js'
import { environmentContributions } from './environment.js'

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
    environment: environmentContributions,
    architecture: ({ stack }) => { const root = ['no-frontend', 'laravel-ui'].includes(stack.frontendKey) ? '' : 'backend/'; return [`${root}app/Http/Controllers`, `${root}app/Http/Requests`, `${root}app/Http/Resources`, `${root}app/Models`, `${root}app/Policies`, `${root}app/Actions`, `${root}app/Services`, `${root}database/migrations`, `${root}database/factories`, `${root}database/seeders`, `${root}routes`, `${root}tests/Feature`, `${root}tests/Unit`] },
    docker: dockerContributions,
    ci: ciContributions,
  },
})
