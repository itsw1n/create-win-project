export function dockerContributions() {
  return [{ template: 'vite', root: 'frontend', developmentPath: 'Dockerfile.dev', productionPath: 'Dockerfile' }]
}
