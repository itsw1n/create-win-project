# Laravel Auth0 OIDC Resource Server

The generated adapter uses the pinned `auth0/login` package. Auth0 owns login,
Authorization Code with PKCE, access/refresh issuance,
rotation, recovery, and revocation. Laravel accepts access tokens only and validates the
signature against trusted keys plus issuer, audience, expiry/not-before, and required
permissions. Cache key discovery with safe rotation and fail closed. Never send refresh
tokens to this API. Configure the exact tenant domain and API audience; never accept an ID
token as an API access token. Test invalid signature, issuer, audience, time, permission,
and owner.
