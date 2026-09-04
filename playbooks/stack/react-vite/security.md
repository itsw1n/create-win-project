# React + Vite Security

## Browser Trust Boundary

Everything shipped from `frontend/src` is observable and modifiable. Never place database
passwords, service keys, OAuth client secrets, or authorization rules in the SPA.

Route guards improve navigation only. The backend or RLS must reject unauthorized direct
requests and enforce resource ownership. Validate external responses before trusting
them. Prefer relative validated return paths and redact credentials and personal data
from logs.

For Supabase, the SDK owns browser session refresh; do not add an Axios refresh system.
For a Spring browser session, send credentials only to the exact allowed origin and use
the server-issued CSRF token. For OIDC, use Authorization Code with PKCE through a
maintained client; never implement token rotation by hand.
