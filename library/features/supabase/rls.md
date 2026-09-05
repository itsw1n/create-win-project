# Supabase Row-Level Security

## Grants and Policies

Enable RLS, grant only required table operations to explicit roles, and write separate policies for
select/insert/update/delete with both `using` and `with check` where applicable. Use `(select auth.uid())`,
index policy columns, enforce ownership beside API operations, and test owner/non-owner/anonymous paths.
