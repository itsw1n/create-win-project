import { defineStackAdapter } from '../../../../lib/stacks/contract.js'
import { buildPostgresFiles } from './create-files.js'

export const postgresAdapter = defineStackAdapter({
  id: 'postgres',
  kind: 'backend',
  label: 'PostgreSQL + Prisma',
  compatibleWith: { frontend: ['nextjs'] },
  capabilities: {
    applicationShapes: ['fullstack'],
    architectureProfiles: ['small', 'medium', 'large'],
    authenticationModels: ['public', 'undecided'],
    runtime: 'postgres',
  },
  contributes: {
    files: () => Object.entries(buildPostgresFiles()),
    environment: () => ['DATABASE_URL'],
    install: () => [{ cwd: '.', command: 'npm', args: ['run', 'prisma:generate'] }],
    docker: () => [{ template: 'postgres', path: 'docker-compose.yml' }],
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'nextjs', architecture: 'medium', authentication: 'undecided' },
      { frontend: 'nextjs', architecture: 'large', authentication: 'public' },
    ],
  },
})
