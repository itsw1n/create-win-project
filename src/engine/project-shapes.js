export const APPLICATION_SHAPES = Object.freeze({
  fullstack: {
    label: 'Full-stack web application',
    description: 'One project owns the website and server logic. Example: Next.js or Laravel.',
  },
  separate: {
    label: 'Separate frontend and backend API',
    description: 'Two applications connected through an API. Example: React/Vite + Spring Boot or Laravel.',
  },
  api: {
    label: 'Backend API only',
    description: 'An API without a generated website. Example: Spring Boot or Laravel.',
  },
  mobile: {
    label: 'Mobile application',
    description: 'An Expo app using Supabase or a separate Spring Boot or Laravel API.',
  },
  frontend: {
    label: 'Frontend-only website',
    description: 'A browser application without a generated server. Example: React with Vite.',
  },
})

const VALID_COMBINATIONS = Object.freeze({
  fullstack: [
    ['nextjs', 'none'],
    ['nextjs', 'postgres'],
    ['nextjs', 'supabase'],
    ['laravel-ui', 'laravel'],
  ],
  separate: [
    ['nextjs', 'springboot'], ['nextjs', 'laravel'],
    ['react', 'springboot'], ['react', 'laravel'], ['react', 'supabase'],
  ],
  api: [['no-frontend', 'springboot'], ['no-frontend', 'laravel']],
  mobile: [
    ['react-native', 'none'], ['react-native', 'supabase'],
    ['react-native', 'springboot'], ['react-native', 'laravel'],
  ],
  frontend: [['react', 'none']],
})

export function applicationShapeChoices() {
  return Object.entries(APPLICATION_SHAPES).map(([value, shape], index) => ({
    name: `${shape.label}${index === 0 ? ' (Recommended)' : ''}\n  ${shape.description}`,
    short: shape.label,
    value,
  }))
}

export function exampleForShape(shape) {
  const match = APPLICATION_SHAPES[shape]?.description.match(/Example:\s*(.+?)\.?$/)
  return match ? match[1] : undefined
}

export function combinationsForShape(shape) {
  if (!APPLICATION_SHAPES[shape]) throw new Error(`Unknown application shape: ${shape}`)
  return VALID_COMBINATIONS[shape].map(([frontend, backend]) => ({ frontend, backend }))
}

export function inferApplicationShape({ frontend, backend }) {
  const matches = Object.entries(VALID_COMBINATIONS).filter(([, combinations]) =>
    combinations.some(([candidateFrontend, candidateBackend]) =>
      candidateFrontend === frontend && candidateBackend === backend))
  if (matches.length === 1) return matches[0][0]
  if (matches.length === 0) {
    throw new Error(`No application shape supports ${frontend} + ${backend}`)
  }
  throw new Error(`Specify --shape because ${frontend} + ${backend} is ambiguous`)
}

export function validateApplicationShape(shape, frontend, backend) {
  const combinations = combinationsForShape(shape)
  if (!combinations.some((entry) => entry.frontend === frontend && entry.backend === backend)) {
    const allowed = combinations.map((entry) => `${entry.frontend} + ${entry.backend}`).join(', ')
    throw new Error(`${frontend} + ${backend} is not valid for ${shape}; choose one of: ${allowed}`)
  }
  return shape
}

export function availableCombinationsForShape(shape, catalog) {
  return combinationsForShape(shape).filter(({ frontend, backend }) =>
    catalog.byId[frontend] && catalog.byId[backend])
}

export function frontendChoicesForShape(shape, catalog) {
  const seen = new Set()
  return availableCombinationsForShape(shape, catalog).flatMap(({ frontend }) => {
    if (seen.has(frontend)) return []
    seen.add(frontend)
    const manifest = catalog.byId[frontend]
    return [{ name: manifest.label, value: frontend }]
  })
}

export function backendChoicesForShape(shape, frontend, catalog) {
  return availableCombinationsForShape(shape, catalog)
    .filter((entry) => entry.frontend === frontend)
    .map(({ backend }) => ({ name: catalog.byId[backend].label, value: backend }))
}
