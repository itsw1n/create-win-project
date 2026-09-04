# Supabase Migrations

## Local and Hosted Flow

The pinned local CLI owns `supabase/config.toml`, ordered SQL migrations, generated types, and pgTAP
tests. Develop/reset only locally, review diffs, test from empty state, and use a reviewed linked
deployment command in CI/release. Production reset is forbidden; deployed history receives a forward fix.
