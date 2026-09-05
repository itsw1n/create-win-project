export const environmentHeader = '# Copy to .env or .env.local. Never commit real credentials.\n\n'

export function environmentLine(name, answers) {
  const defaults = {
    NEXT_PUBLIC_API_URL: 'http://localhost:8080',
    VITE_API_URL: 'http://localhost:8080',
    EXPO_PUBLIC_API_URL: 'http://localhost:8080',
    DATABASE_URL: `jdbc:postgresql://localhost:5432/${answers.projectName.replaceAll('-', '_')}`,
    POSTGRES_USER: 'postgres',
    POSTGRES_PASSWORD: 'change-me',
    POSTGRES_DB: answers.projectName.replaceAll('-', '_'),
    SPRING_PROFILES_ACTIVE: 'dev',
    SPRING_SECURITY_USER_NAME: 'developer',
    SPRING_SECURITY_USER_PASSWORD: 'change-me-before-production',
    OIDC_ISSUER_URI: 'http://localhost:9090/realms/app',
    OIDC_AUDIENCE: 'api',
  }
  return `${name}=${defaults[name] || ''}`
}

export function renderEnvironment(names, answers) {
  return `${environmentHeader}${names.map((name) => environmentLine(name, answers)).join('\n')}\n`
}

export function partitionEnvironment(stack) {
  return {
    publicNames: stack.env.filter((name) => name.startsWith(stack.envPrefix)),
    serverNames: stack.env.filter((name) => !name.startsWith(stack.envPrefix)),
  }
}
