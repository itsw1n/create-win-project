export function dockerContributions() {
  return [{ template: 'fastapi', developmentPath: 'backend/Dockerfile.dev', productionPath: 'backend/Dockerfile' }]
}
