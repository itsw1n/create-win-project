export function dockerContributions() {
  return [{ template: 'fastapi', developmentPath: 'backend/Dockerfile.dev', productionPath: 'backend/Dockerfile' }]
}

export function fastapiCompose(answers, stack, vars) {
  const apiDir = stack.frontendKey === 'no-frontend' ? '.' : './backend'
  const projectName = vars.PROJECT_NAME
  const frontend = stack.frontendKey === 'react'
    ? `  frontend:\n    container_name: ${projectName}-frontend\n    build:\n      context: ./frontend\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-5173}:5173"\n    volumes:\n      - ./frontend:/app\n      - frontend-node-modules:/app/node_modules\n    environment:\n      VITE_API_URL: http://backend:8000\n    depends_on:\n      - backend\n    networks:\n      - app-network\n\n`
    : stack.frontendKey === 'nextjs'
      ? `  frontend:\n    container_name: ${projectName}-frontend\n    build:\n      context: .\n      dockerfile: Dockerfile.dev\n    ports:\n      - "\${FRONTEND_HOST_PORT:-3000}:3000"\n    volumes:\n      - .:/app\n      - /app/backend\n      - frontend-node-modules:/app/node_modules\n    environment:\n      NEXT_PUBLIC_API_URL: http://backend:8000\n    depends_on:\n      - backend\n    networks:\n      - app-network\n\n`
      : ''
  const frontendVolume = frontend ? '  frontend-node-modules:\n' : ''
  return `# docker-compose.yml — ${projectName} (${vars.STACK}) — Dev
services:
${frontend}  backend:
    container_name: ${projectName}-backend
    build:
      context: ${apiDir}
      dockerfile: Dockerfile.dev
    ports:
      - "\${BACKEND_HOST_PORT:-8000}:8000"
    volumes:
      - ${apiDir}:/app
      - uv-cache:/root/.cache/uv
    environment:
      - DATABASE_URL=postgresql+asyncpg://db:5432/\${POSTGRES_DB}
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - OIDC_ISSUER=\${OIDC_ISSUER}
      - OIDC_AUDIENCE=\${OIDC_AUDIENCE}
      - CORS_ALLOWED_ORIGINS=\${CORS_ALLOWED_ORIGINS}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "python -c \\"import urllib.request; urllib.request.urlopen('http://localhost:8000/health')\\""]
      interval: 10s
      timeout: 5s
      retries: 5

  db:
    container_name: ${projectName}-db
    image: ${vars.POSTGRES_IMAGE}
    ports:
      - "\${POSTGRES_HOST_PORT:-5432}:5432"
    environment:
      - POSTGRES_USER=\${POSTGRES_USER}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=\${POSTGRES_DB}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER} -d \${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
${frontendVolume}  postgres-data:
    name: ${projectName}-postgres-data
  uv-cache:
    name: ${projectName}-uv-cache

networks:
  app-network:
    name: ${projectName}-network
`
}
