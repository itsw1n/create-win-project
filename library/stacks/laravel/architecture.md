# Laravel Architecture

## Profiles

### Small

`Route → Form Request when needed → Controller → Eloquent → Resource/View`.
Use Laravel conventions directly. Do not add Actions, Services, repositories, or DTO
folders for trivial CRUD.

### Medium (Recommended)

`Route → Form Request → Controller/UI adapter → Action or Service → Eloquent`.
An Action owns one meaningful use case. A Service owns a reusable capability shared by
several use cases. The coordinating operation owns multi-write transactions.

### Large

Keep the Medium vocabulary inside a modular monolith. Modules expose small public APIs
and keep application, domain, persistence, jobs, and UI adapters private. Enforce module
dependencies automatically. Large does not mean repository-per-model or microservices.

## Dependency Direction

HTTP, CLI, jobs, and UI components call application behavior. Application behavior may
use Eloquent or an explicit external adapter; it never depends on controllers, requests,
Blade, Livewire, or Inertia.

## Escalation

Eloquent is the default persistence abstraction. Add a repository or query object only
for complex repeated queries, multiple data sources, or a boundary with measurable value.
Create a directory only with its first real file.

| Add | When |
|---|---|
| Action | A meaningful use case deserves a name or more than one entry point invokes it |
| Service | A capability is reused across multiple use cases |
| Repository/Query | Eloquent access is complex, repeated, spans sources, or needs a stable boundary |
| Module | Large domain boundaries need explicit public APIs and dependency enforcement |

Do not introduce a second vocabulary for an existing responsibility. Before removing or
reorganizing a user-created layer, explain the reason and recovery path and ask for approval.
