import { defineStackAdapter } from '../../../../lib/stacks/contract.js'

export const reactNativeAdapter = defineStackAdapter({
  id: 'react-native',
  kind: 'frontend',
  label: 'React Native (Expo)',
  compatibleWith: { backend: ['none', 'supabase', 'springboot', 'laravel'] },
  capabilities: {
    applicationShapes: ['mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'supabase', 'oidc', 'laravel-oidc'],
    runtime: 'node',
  },
  contributes: {
    environment: ({ backend }) => backend.id === 'none' ? [] : ['API_URL'],
    install: () => [{ cwd: '.', command: 'npm', args: ['install'] }],
    ci: () => [{ template: 'expo', path: '.github/workflows/ci-frontend.yml' }],
    verification: () => [
      { backend: 'none', architecture: 'small', authentication: 'public' },
      { backend: 'supabase', architecture: 'medium', authentication: 'supabase' },
      { backend: 'springboot', architecture: 'large', authentication: 'oidc' },
      { backend: 'laravel', architecture: 'medium', authentication: 'laravel-oidc' },
    ],
  },
})

