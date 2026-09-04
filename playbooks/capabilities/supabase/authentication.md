# Supabase Authentication

Supabase owns access/refresh issuance, persistence, rotation, and revocation. Next.js synchronizes SSR
cookies through Proxy and verifies claims; Vite uses browser SDK refresh; Expo stores sessions in
SecureStore and binds refresh to app lifecycle. Allowlist web callbacks and native deep links exactly.
