import { defineStackAdapter } from '../../../../lib/stacks/contract.js'

const verificationCases = Object.freeze([
  Object.freeze({ backend: 'none', styling: 'css-modules', architecture: 'small', authentication: 'public' }),
  Object.freeze({ backend: 'supabase', styling: 'tailwind', architecture: 'medium', authentication: 'supabase' }),
  Object.freeze({ backend: 'springboot', styling: 'css-modules', architecture: 'large', authentication: 'session' }),
  Object.freeze({ backend: 'laravel', styling: 'tailwind', architecture: 'medium', authentication: 'sanctum-spa' }),
])

export const reactViteAdapter = defineStackAdapter({
  id: 'react',
  kind: 'frontend',
  label: 'React + Vite',
  compatibleWith: { backend: ['none', 'supabase', 'springboot', 'laravel'] },
  capabilities: {
    applicationShapes: ['separate', 'frontend'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'supabase', 'session', 'oidc', 'sanctum-spa', 'laravel-oidc'],
    runtime: 'node',
  },
  contributes: {
    environment: ({ backend }) => backend.id === 'none' ? [] : ['API_URL'],
    install: () => [{ cwd: 'frontend', command: 'npm', args: ['install'] }],
    docker: () => [{ template: 'vite', root: 'frontend', developmentPath: 'Dockerfile.dev', productionPath: 'Dockerfile' }],
    ci: () => [{ template: 'vite', path: '.github/workflows/ci-frontend.yml' }],
    verification: () => verificationCases,
  },
})

