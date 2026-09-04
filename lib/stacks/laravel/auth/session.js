export const laravelSessionAuthentication = Object.freeze({
  id: 'laravel-session',
  apiMiddleware: 'auth',
  environment: Object.freeze([
    'SESSION_DRIVER=database',
    'SESSION_DOMAIN=localhost',
    'SESSION_SECURE_COOKIE=false',
  ]),
})

export function usesLaravelSession(authentication) {
  return authentication === laravelSessionAuthentication.id || authentication === 'sanctum-spa'
}

export function sessionEnvironment(authentication) {
  return usesLaravelSession(authentication) ? laravelSessionAuthentication.environment : []
}
