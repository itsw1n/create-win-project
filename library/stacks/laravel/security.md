# Laravel Security

## Trust Boundaries

Form Request validation is not authorization. Enforce Gates/Policies beside every
protected read or side effect, including resource ownership; hiding UI is never enough.
Guard mass assignment and return intentional Resources/props/view data.

## Authentication Models

- Laravel-owned Blade, Livewire, and Inertia sites use secure server sessions and CSRF.
- A separate first-party SPA on the same parent domain uses Sanctum stateful cookies.
- Independent mobile/multi-client APIs validate access tokens from an external OIDC
  provider; that provider owns issuance, refresh, rotation, and revocation.
- Sanctum personal access tokens are credentials, not a refresh-token system.
- Passport is opt-in only when the product truly operates an OAuth2 server.

Cookie settings, CORS origins, redirect destinations, and callback URLs are explicit
allowlists. Throttle login, recovery, uploads, and abuse-sensitive mutations. Uploaded
files are untrusted and require type, size, ownership, storage, and download controls.

Never log passwords, cookies, bearer tokens, reset links, secrets, or unnecessary PII.

