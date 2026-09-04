const IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const STACK_KINDS = Object.freeze(['frontend', 'backend', 'data'])
export const ARCHITECTURE_PROFILES = Object.freeze(['small', 'medium', 'large'])
export const APPLICATION_SHAPES = Object.freeze(['fullstack', 'separate', 'api', 'mobile', 'frontend'])
export const PROMPT_SLOTS = Object.freeze([
  'frontend-options',
  'backend-options',
  'stack-options',
  'authentication-options',
  'tooling-options',
])

export const CONTRIBUTION_HOOKS = Object.freeze([
  'prompts',
  'authentication',
  'files',
  'environment',
  'install',
  'docker',
  'ci',
  'verification',
])

const emptyContribution = () => []

function requireNonEmptyString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Stack adapter ${field} must be a non-empty string`)
  }
}

function validateStringList(values, field, allowedValues) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new Error(`Stack adapter ${field} must be an array of strings`)
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`Stack adapter ${field} must not contain duplicates`)
  }
  if (allowedValues) {
    const unknown = values.find((value) => !allowedValues.includes(value))
    if (unknown) throw new Error(`Stack adapter ${field} contains unsupported value: ${unknown}`)
  }
}

function normalizeCompatibility(compatibleWith = {}) {
  if (!compatibleWith || typeof compatibleWith !== 'object' || Array.isArray(compatibleWith)) {
    throw new Error('Stack adapter compatibleWith must be an object')
  }
  const normalized = {}
  for (const [kind, ids] of Object.entries(compatibleWith)) {
    if (!STACK_KINDS.includes(kind)) {
      throw new Error(`Stack adapter compatibleWith has unsupported kind: ${kind}`)
    }
    validateStringList(ids, `compatibleWith.${kind}`)
    normalized[kind] = Object.freeze([...ids])
  }
  return Object.freeze(normalized)
}

function normalizeCapabilities(capabilities) {
  if (!capabilities || typeof capabilities !== 'object' || Array.isArray(capabilities)) {
    throw new Error('Stack adapter capabilities must be an object')
  }
  const {
    applicationShapes = [],
    architectureProfiles = ARCHITECTURE_PROFILES,
    authenticationModels = [],
    ...custom
  } = capabilities
  validateStringList(applicationShapes, 'capabilities.applicationShapes', APPLICATION_SHAPES)
  validateStringList(architectureProfiles, 'capabilities.architectureProfiles', ARCHITECTURE_PROFILES)
  validateStringList(authenticationModels, 'capabilities.authenticationModels')
  if (architectureProfiles.length === 0) {
    throw new Error('Stack adapter must support at least one architecture profile')
  }
  return Object.freeze({
    ...custom,
    applicationShapes: Object.freeze([...applicationShapes]),
    architectureProfiles: Object.freeze([...architectureProfiles]),
    authenticationModels: Object.freeze([...authenticationModels]),
  })
}

function normalizeContributions(contributes = {}) {
  if (!contributes || typeof contributes !== 'object' || Array.isArray(contributes)) {
    throw new Error('Stack adapter contributes must be an object')
  }
  const unknown = Object.keys(contributes).find((name) => !CONTRIBUTION_HOOKS.includes(name))
  if (unknown) throw new Error(`Unknown stack adapter contribution hook: ${unknown}`)

  return Object.freeze(Object.fromEntries(CONTRIBUTION_HOOKS.map((name) => {
    const contribution = contributes[name] || emptyContribution
    if (typeof contribution !== 'function') {
      throw new Error(`Stack adapter contribution ${name} must be a function`)
    }
    return [name, contribution]
  })))
}

/**
 * Defines the stable boundary between core orchestration and a stack.
 *
 * Adapters describe capabilities and return contributions. They do not write
 * files, install tools, or own dependency versions; core code retains those
 * side effects and compatibility profiles remain the only version source.
 */
export function defineStackAdapter(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    throw new Error('Stack adapter definition must be an object')
  }
  requireNonEmptyString(definition.id, 'id')
  if (!IDENTIFIER.test(definition.id)) {
    throw new Error(`Invalid stack adapter id: ${definition.id}`)
  }
  if (!STACK_KINDS.includes(definition.kind)) {
    throw new Error(`Invalid stack adapter kind for ${definition.id}: ${definition.kind}`)
  }
  requireNonEmptyString(definition.label, `${definition.id}.label`)

  return Object.freeze({
    id: definition.id,
    kind: definition.kind,
    label: definition.label,
    compatibleWith: normalizeCompatibility(definition.compatibleWith),
    capabilities: normalizeCapabilities(definition.capabilities),
    contributes: normalizeContributions(definition.contributes),
  })
}

export function isStackAdapter(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    IDENTIFIER.test(value.id || '') &&
    STACK_KINDS.includes(value.kind) &&
    CONTRIBUTION_HOOKS.every((name) => typeof value.contributes?.[name] === 'function'),
  )
}
