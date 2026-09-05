import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { ciContributions } from './ci.js'
import { dockerContributions } from './docker.js'
import { buildNextjsFiles } from './create-files.js'

const verificationCases = Object.freeze([
  Object.freeze({ backend: 'none', styling: 'tailwind', architecture: 'small', authentication: 'public' }),
  Object.freeze({ backend: 'postgres', styling: 'tailwind', architecture: 'medium', authentication: 'undecided' }),
  Object.freeze({ backend: 'supabase', styling: 'tailwind', architecture: 'large', authentication: 'supabase' }),
  Object.freeze({ backend: 'springboot', styling: 'css-modules', architecture: 'medium', authentication: 'session' }),
  Object.freeze({ backend: 'laravel', styling: 'tailwind', architecture: 'medium', authentication: 'sanctum-spa' }),
])

export const nextjsAdapter = defineStackAdapter({
  id: 'nextjs',
  kind: 'frontend',
  label: 'Next.js',
  compatibleWith: {
    backend: ['none', 'postgres', 'supabase', 'springboot', 'laravel'],
  },
  capabilities: {
    applicationShapes: ['fullstack', 'separate'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'supabase', 'session', 'oidc', 'sanctum-spa', 'laravel-oidc'],
    runtime: 'node',
  },
  contributes: {
    files: ({ answers, stack, shared }) => Object.entries(buildNextjsFiles(answers, stack, shared)),
    environment: ({ backend }) => backend.id === 'none' ? [] : ['API_URL'],
    install: () => [{ cwd: '.', command: 'npm', args: ['install'] }],
    docker: dockerContributions,
    ci: ciContributions,
    verification: () => verificationCases,
  },
})
