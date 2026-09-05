export function laravelCompose(_answers, stack, vars) {
  const laravelDir = stack.frontendKey === 'laravel-ui' || stack.frontendKey === 'no-frontend' ? '.' : './backend'
  const frontend = stack.frontendKey === 'react'
    ? `  frontend:\n    build:\n      context: ./frontend\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-5173}:5173"\n    volumes:\n      - ./frontend:/app\n      - frontend-node-modules:/app/node_modules\n    environment:\n      VITE_API_URL: http://backend:8000\n    depends_on:\n      - backend\n\n`
    : stack.frontendKey === 'nextjs'
      ? `  frontend:\n    build:\n      context: .\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-3000}:3000"\n    volumes:\n      - .:/app\n      - /app/backend\n      - frontend-node-modules:/app/node_modules\n    environment:\n      NEXT_PUBLIC_API_URL: http://backend:8000\n    depends_on:\n      - backend\n\n`
      : ''
  const frontendVolume = frontend ? '  frontend-node-modules:\n' : ''
  return `services:\n${frontend}  backend:\n    build:\n      context: ${laravelDir}\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${BACKEND_HOST_PORT:-8000}:8000"\n    volumes:\n      - ${laravelDir}:/app\n      - laravel-vendor:/app/vendor\n    environment:\n      APP_ENV: local\n      APP_DEBUG: "true"\n      APP_KEY: \${APP_KEY:-}\n      DB_CONNECTION: pgsql\n      DB_HOST: db\n      DB_PORT: 5432\n      DB_DATABASE: \${POSTGRES_DB}\n      DB_USERNAME: \${POSTGRES_USER}\n      DB_PASSWORD: \${POSTGRES_PASSWORD}\n    depends_on:\n      db:\n        condition: service_healthy\n\n  db:\n    image: ${vars.POSTGRES_IMAGE}\n    ports:\n      - "\${POSTGRES_HOST_PORT:-5432}:5432"\n    environment:\n      POSTGRES_DB: \${POSTGRES_DB}\n      POSTGRES_USER: \${POSTGRES_USER}\n      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}\n    volumes:\n      - postgres-data:/var/lib/postgresql/data\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]\n      interval: 5s\n      timeout: 5s\n      retries: 10\n\nvolumes:\n${frontendVolume}  laravel-vendor:\n  postgres-data:\n`
}

export function dockerContributions() {
  return [{ template: 'laravel', path: 'docker-compose.yml' }]
}
