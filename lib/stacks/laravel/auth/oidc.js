export const laravelOidcAuthentication = Object.freeze({
  id: 'laravel-oidc',
  provider: 'auth0',
  composerPackage: 'auth0/login',
  guard: 'auth0-api',
  apiMiddleware: 'auth',
  environment: Object.freeze(['AUTH0_DOMAIN=', 'AUTH0_AUDIENCE=']),
  acceptsRefreshTokens: false,
})

export function isLaravelOidc(authentication) {
  return authentication === laravelOidcAuthentication.id
}
