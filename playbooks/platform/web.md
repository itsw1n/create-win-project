# Web Platform

## Browser Boundary

Anything shipped to the browser is observable and modifiable. Public environment prefixes are configuration, never secret storage. Enforce authentication, resource authorization, validation, and trusted side effects on a server or at the data policy boundary.

Use secure, HttpOnly cookies for server-managed sessions. Keep CSRF protection for cookie-authenticated mutations. Token refresh belongs to the selected identity SDK or server session implementation; do not add a competing generic interceptor.

## Navigation and Accessibility

Use links for navigation and buttons for actions. Preserve focus, keyboard operation, semantic landmarks, labels, loading feedback, and actionable errors. Prefer platform behavior over custom keyboard or history handling.

Validate redirect targets against explicit same-origin allowlists. Do not accept arbitrary callback or `next` URLs.

## Runtime Failures

Model loading, empty, error, offline, unauthorized, and forbidden states explicitly. Cancel obsolete requests where the framework supports it, and do not display success before a trusted boundary confirms the mutation.
