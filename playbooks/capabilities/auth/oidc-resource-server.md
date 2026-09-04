# OIDC Resource Server

## Provider and API Responsibilities

The external OpenID Connect provider owns login, access-token and refresh-token issuance, rotation, revocation, recovery, and MFA. Spring is a resource server: it validates issuer, audience, signature, expiry, and claims on every protected API request. This generator does not mint custom JWTs.

Public clients use Authorization Code with PKCE through the provider SDK. Store native refresh material only in platform-protected secure storage. A browser application should prefer a backend-for-frontend or provider-supported secure session when long-lived credentials would otherwise be exposed to JavaScript.

## Authorization

Map only documented provider claims to application authorities. Never trust a client-supplied user ID or role, and enforce resource ownership beside data access. Keep CORS on an explicit origin allowlist; bearer-token APIs do not use cookie CSRF as their request-integrity mechanism.

## Required Tests

Test missing bearer tokens and invalid issuer, audience, signature, expiry, and required claims. Also test valid access, resource-level denial, logout/revocation expectations at the provider boundary, and CORS behavior. Stub the decoder in MVC slices; use provider-compatible signed fixtures at the security integration boundary.
