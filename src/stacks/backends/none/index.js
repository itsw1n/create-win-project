import { defineStackAdapter } from '../../rules.js'

export const noBackendAdapter = defineStackAdapter({
  id: 'none',
  kind: 'backend',
  label: 'None / frontend only',
  compatibleWith: { frontend: ['nextjs', 'react', 'react-native'] },
  capabilities: {
    applicationShapes: ['fullstack', 'frontend', 'mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided'],
    runtime: 'none',
  },
  contributes: {
    environment: () => [],
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'react', architecture: 'medium', authentication: 'undecided' },
      { frontend: 'react-native', architecture: 'large', authentication: 'public' },
    ],
  },
})

