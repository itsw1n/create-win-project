# Sanctum Stateful SPA Authentication

Use this only for a first-party browser frontend sharing the Laravel application's parent
domain. Sanctum authenticates with Laravel's session cookie, not a browser bearer token.
Initialize CSRF protection, send credentials deliberately, configure exact stateful
domains/CORS origins, and authorize every resource server-side. Test CSRF rejection,
credentialed CORS, login/logout, expiry, and forbidden ownership.

