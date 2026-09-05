import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { ciContributions } from './ci.js'
import { dockerContributions } from './docker.js'
import { buildReactNativeFiles } from './create-files.js'

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
    files: ({ answers, stack, shared }) => Object.entries(buildReactNativeFiles(answers, stack, shared)),
    environment: ({ backend }) => backend.id === 'none' ? [] : ['API_URL'],
    install: () => [{ cwd: '.', command: 'npm', args: ['install'] }],
    docker: dockerContributions,
    ci: ciContributions,
    verification: () => [
      { backend: 'none', architecture: 'small', authentication: 'public' },
      { backend: 'supabase', architecture: 'medium', authentication: 'supabase' },
      { backend: 'springboot', architecture: 'large', authentication: 'oidc' },
      { backend: 'laravel', architecture: 'medium', authentication: 'laravel-oidc' },
    ],
  },
})
