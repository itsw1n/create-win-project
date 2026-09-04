function frozenCopy(value = {}) {
  return Object.freeze({ ...value })
}

/**
 * Builds the read-only input shared by adapter contribution hooks.
 * Filesystem destinations and writer functions are intentionally excluded.
 */
export function createStackContext({ answers, profile, catalog, frontend, backend, data = [] }) {
  if (!answers || typeof answers !== 'object') throw new Error('Stack context answers are required')
  if (!profile || typeof profile !== 'object') throw new Error('Stack context compatibility profile is required')
  if (!frontend || frontend.kind !== 'frontend') throw new Error('Stack context requires a frontend adapter')
  if (!backend || backend.kind !== 'backend') throw new Error('Stack context requires a backend adapter')
  if (!Array.isArray(data) || data.some((adapter) => adapter.kind !== 'data')) {
    throw new Error('Stack context data must contain data adapters')
  }

  return Object.freeze({
    answers: frozenCopy(answers),
    profile,
    catalog,
    frontend,
    backend,
    data: Object.freeze([...data]),
  })
}

