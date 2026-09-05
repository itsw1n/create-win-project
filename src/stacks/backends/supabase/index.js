import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { buildSupabaseProjectFiles } from './create-files.js'

export const supabaseAdapter = defineStackAdapter({
  id: 'supabase',
  kind: 'backend',
  label: 'Supabase',
  compatibleWith: { frontend: ['nextjs', 'react', 'react-native'] },
  capabilities: {
    applicationShapes: ['fullstack', 'separate', 'mobile'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided', 'supabase'],
    runtime: 'docker',
  },
  contributes: {
    files: ({ stack }) => Object.entries(buildSupabaseProjectFiles(stack)),
    environment: () => ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'],
    install: () => [{ cwd: '.', command: 'npm', args: ['run', 'supabase:start'] }],
    docker: () => [{ template: 'supabase', path: 'docker-compose.yml' }],
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'nextjs', architecture: 'large', authentication: 'supabase' },
      { frontend: 'react', architecture: 'medium', authentication: 'supabase' },
      { frontend: 'react-native', architecture: 'medium', authentication: 'supabase' },
    ],
  },
})
