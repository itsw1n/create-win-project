# FastAPI Security

## Authentication Models

The generated authentication choice is authoritative:

- `public`: no user accounts; generated application endpoints are intentionally public.
- `undecided`: health is public and every other endpoint is denied until auth is designed.
- `oidc`: an external identity provider owns login, refresh, rotation, and revocation;
  FastAPI validates bearer issuer, audience, algorithm, JWKS signature, expiry, and claims
  on every protected API request. Session authentication is not offered.

Never turn the API into a home-grown authorization server from a short JWT example.

## Authorization

Route dependencies provide a broad baseline. Enforce feature permissions and resource
ownership at the application operation or protected data boundary with explicit
dependencies. Test unauthenticated, authenticated-but-forbidden, and allowed cases.

- Keep public health endpoints separate from protected API routes.
- Configure OIDC issuer, audience, allowed algorithms, JWKS retrieval, and claim
  validation from environment; deny by default.
- Configure exact-origin CORS. Never combine credentials with wildcard origin.
- Rate limit login, recovery, and other abuse-sensitive operations.
- Treat role claims as inputs to server policy, not proof of resource ownership.
