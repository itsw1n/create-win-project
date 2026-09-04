# Supabase Architecture

Supabase PostgreSQL, Auth, Storage, and Realtime are separate capabilities sharing an authorization
boundary. Normal clients use the publishable key plus user identity; RLS protects rows. Secret/service
operations run only in trusted server jobs and never share the normal client path.
