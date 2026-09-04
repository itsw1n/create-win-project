# Expo Security

## Mobile Trust Boundary

The installed application is an untrusted client. Never embed database passwords,
service-role keys, OAuth client secrets, or signing keys. UI role checks do not authorize
API or Supabase requests.

## Session Storage

Use a maintained provider with Authorization Code + PKCE. Store persistent session
material in SecureStore, never AsyncStorage. The provider owns refresh-token rotation;
the app handles expiry, revocation, logout, foreground resume, and retry without refresh
loops. Validate registered deep-link callback schemes and reject arbitrary return URLs.

Supabase projects use the generated SecureStore adapter. Spring multi-client projects use
the chosen OIDC provider; Spring validates access tokens and never receives refresh tokens.
Redact tokens, recovery links, authorization headers, and personal data from diagnostics.
