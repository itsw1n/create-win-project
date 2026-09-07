# Laravel Structure

## Canonical Reference Tree

Keep Laravel's conventional entry points and group meaningful application behavior by
feature when the codebase grows.

```text
app/
├── Http/Controllers/       # HTTP coordination
├── Http/Requests/          # trust-boundary validation
├── Http/Resources/         # intentional API shapes
├── Models/                 # Eloquent models
├── Policies/               # resource authorization
├── Actions/                # real named use cases only
├── Services/               # shared capabilities only
└── Jobs/                   # real background work only
database/{migrations,factories,seeders}/
routes/{web,api}.php
tests/{Feature,Unit}/
```

This is the complete convention-first reference, not a requirement to generate every directory.
Small and Medium do not get a forced `app/Features` tree.

## Profile Differences

| Profile | Shape |
|---|---|
| Small | Route → optional Form Request → Controller → Eloquent → Resource/View |
| Medium | Conventional entry points plus an Action or Service for a real workflow |
| Large | Medium vocabulary inside explicit modules when genuine domain boundaries exist |

Repositories, Queries, DTOs, Events, and Jobs remain demand-driven in every profile.

## File Placement

| Responsibility | Location |
|---|---|
| Route declaration | `routes/web.php` or `routes/api.php` |
| HTTP coordination | `app/Http/Controllers/` |
| Boundary validation | `app/Http/Requests/` |
| Intentional API representation | `app/Http/Resources/` |
| Resource authorization | `app/Policies/` |
| One meaningful use case | `app/Actions/` |
| Reusable capability | `app/Services/` |
| Default persistence abstraction | `app/Models/` with Eloquent |
| Real background work | `app/Jobs/` |

Never create empty placeholder trees. Use normal Laravel and PSR naming conventions.

## Architecture Cleanup

Before removing or reorganizing user-created structure, explain what changes, why the folder is
unnecessary now, where future code belongs, and how to restore the documented pattern; then ask
for approval.
