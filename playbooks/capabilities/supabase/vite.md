# Supabase with Vite

## Browser Session

The browser SDK owns session persistence and refresh. Do not create a second refresh-token
interceptor or copy credentials into an application store. UI route guards prevent visual
confusion; grants and RLS authorize every database operation.

Only `VITE_SUPABASE_URL` and the publishable key enter browser code. A secret/service-role
key, database password, or OAuth client secret is never a Vite environment value.

Place Supabase queries in feature `data.ts` functions, validate data crossing external
boundaries, and clean up Realtime channels. Handle signed-out, expired, revoked, loading,
and retry states without refresh loops.
