# Laravel Session Authentication

Laravel owns the server session and sends only an HttpOnly, Secure cookie with a deployed
SameSite policy. Rotate the session after login and invalidate it plus its CSRF token on
logout. Keep CSRF protection on every cookie-authenticated mutation. Generate login,
logout, recovery, verification as selected, and test fixation resistance, expiry,
unauthenticated redirects/responses, forbidden resources, and logout invalidation.

