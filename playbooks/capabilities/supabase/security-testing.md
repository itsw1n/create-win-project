# Supabase Security and Testing

## Grants and RLS

Enable RLS and explicitly set grants in the same migration. Name the role on every policy
and create separate policies for operations whose permissions differ.

```sql
alter table public.examples enable row level security;
revoke all on table public.examples from anon, authenticated;
grant select, insert, update, delete on table public.examples to authenticated;

create policy "owners read examples"
on public.examples for select
to authenticated
using ((select auth.uid()) = user_id);

create index examples_user_id_idx on public.examples (user_id);
```

Insert uses `with check`; update normally needs both `using` and `with check`; delete uses
`using`. Remember that update also requires a compatible select policy. Review views,
functions, storage objects, and Realtime exposure as separate security boundaries.

## Policy Tests

Put pgTAP tests under `supabase/tests/` and run `supabase test db`. For each exposed table,
assert allowed and denied select/insert/update/delete behavior for anonymous, owner,
non-owner, and privileged roles that exist in the product. Tests must also assert RLS is
enabled and must not depend on production data.

Do not rely only on happy-path SDK tests. Verify grants, constraints, migrations, indexes,
views, storage policies, and attempts to change ownership fields.
