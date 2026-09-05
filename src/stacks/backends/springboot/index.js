import { defineStackAdapter } from '../../../../lib/stacks/contract.js'

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
    environment: () => ['API_URL', 'DATABASE_URL', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'SPRING_PROFILES_ACTIVE'],
    install: () => [{ cwd: 'backend', command: './mvnw', args: ['dependency:go-offline'] }],
    docker: () => [{ template: 'springboot', developmentPath: 'backend/Dockerfile.dev', productionPath: 'backend/Dockerfile' }],
    ci: () => [{ template: 'springboot', path: '.github/workflows/ci-backend.yml' }],
    verification: () => [
      { frontend: 'nextjs', architecture: 'small', authentication: 'public' },
      { frontend: 'react', architecture: 'medium', authentication: 'session' },
      { frontend: 'react-native', architecture: 'large', authentication: 'oidc' },
      { frontend: 'no-frontend', architecture: 'medium', authentication: 'undecided' },
    ],
  },
})

