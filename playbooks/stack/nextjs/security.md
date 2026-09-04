# Next.js Security

## Authorization

Proxy and layouts may make optimistic navigation decisions, but secure authorization is
performed again in every Server Function, Route Handler, DAL/Repository, or protected
side effect. Check both the authenticated principal and access to the requested resource.

Treat Server Functions as public endpoints. Validate runtime input and return DTOs with
only fields the caller may receive. Never pass whole database entities into Client
Components.

## Sessions

Session behavior is selected by the authentication capability:

- Supabase SSR uses cookie-aware clients and Proxy-driven refresh with `getClaims()`.
- A Spring-backed browser session is owned by Spring; Next acts as UI/BFF and does not
  invent a second refresh-token protocol.
- OIDC access tokens come from the identity provider; the resource API validates them.
- `not-yet` means no login exists. Do not add fake role flags or trusted client state.

Cookies carrying credentials must be `HttpOnly`, `Secure` in production, and use an
appropriate `SameSite` policy. Cookie-authenticated writes require CSRF protection.
Validate every redirect/return path as an application-relative destination.

## Server Boundaries

- Use `server-only` for repositories, admin clients, and secret configuration.
- Never expose a service-role key, database URL, refresh token, or private API key.
- Rate limit expensive and abuse-sensitive public operations at a trusted boundary.
- Add security headers deliberately; CSP must match the assets and scripts actually used.
