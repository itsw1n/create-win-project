# Laravel External OIDC Resource Server

The identity provider owns login, Authorization Code with PKCE, access/refresh issuance,
rotation, recovery, and revocation. Laravel accepts access tokens only and validates the
signature against trusted keys plus issuer, audience, expiry/not-before, and required
permissions. Cache key discovery with safe rotation and fail closed. Never send refresh
tokens to this API. Test invalid signature, issuer, audience, time, permission, and owner.

