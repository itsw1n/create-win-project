export const sanctumSpaAuthentication = Object.freeze({
  id: 'sanctum-spa',
  apiMiddleware: 'auth:sanctum',
  composerPackage: 'laravel/sanctum',
  middleware: '        $middleware->statefulApi();',
  environment: Object.freeze([
    'SANCTUM_STATEFUL_DOMAINS=localhost:5173',
    'CORS_ALLOWED_ORIGINS=http://localhost:5173',
  ]),
})

export function isSanctumSpa(authentication) {
  return authentication === sanctumSpaAuthentication.id
}

