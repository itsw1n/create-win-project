# Spring Boot Security

## Authentication Models

The generated authentication choice is authoritative:

- `public`: no user accounts; generated application endpoints are intentionally public.
- `undecided`: health is public and every other endpoint is denied until auth is designed.
- `session`: Spring owns a secure browser session; credential cookies require CSRF.
- `oidc`: an external identity provider owns login, refresh, rotation, and revocation;
  Spring Resource Server validates access-token signature, issuer, audience, time, and
  maps scopes/claims to authorities.

Never turn the API into a home-grown authorization server from a short JWT example.

## Authorization

Route rules provide a broad baseline. Enforce feature permissions and resource ownership
at the application operation or protected data boundary with method security or an
equivalent policy. Test unauthenticated, authenticated-but-forbidden, and allowed cases.

- Keep CSRF enabled for cookie/browser credentials; disable it only for a documented API
  that accepts bearer headers and no ambient browser credentials.
- Configure exact-origin credentialed CORS. Never combine credentials with wildcard origin.
- Rotate the session ID after login and invalidate server sessions on logout.
- Hash passwords with a maintained adaptive encoder if the product owns credentials.
- Rate limit login, recovery, and other abuse-sensitive operations.
- Treat role claims as inputs to server policy, not proof of resource ownership.
