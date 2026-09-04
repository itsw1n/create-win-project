# Laravel Structure

## Package by Feature

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

Small generates only conventional files required by its example. Medium adds an Action
or Service only for a real workflow. Large aligns namespaces with modules and exposes an
explicit public module API. Repositories, Queries, DTOs, Events, and Jobs remain
demand-driven in every profile.

Never create empty placeholder trees. Use normal Laravel and PSR naming conventions.

