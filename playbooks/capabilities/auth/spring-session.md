# Spring Server Session

## Session Ownership

Spring Security authenticates the website, rotates the session identifier, and sends only a Secure, HttpOnly, SameSite cookie. The server owns expiry and logout; the browser never stores or refreshes an access token.

Keep CSRF enabled for cookie-authenticated mutations. Replace the generated development user with the product identity store before production, configure HTTPS-only cookies, and use a shared Spring Session store before horizontally scaling stateful instances.

## Authorization

Authentication only proves who the caller is. Check roles and resource ownership beside each protected read or side effect. Deny by default and keep health endpoints as the only anonymous baseline unless a route is deliberately public.

## Required Tests

Test anonymous rejection, successful login, session-id rotation, authenticated access, CSRF rejection/acceptance, resource-level denial, expiry, logout invalidation, and safe redirect handling. Never assert only that a controller method was called.
