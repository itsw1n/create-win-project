# Spring Boot Structure

## Canonical Reference Tree

Place the application class in the root package. Organize business code below it by
feature, never in one global controller/service/repository layer.

```text
com.example.app/
├── Application.java
├── users/
│   ├── api/                        controllers and transport DTOs
│   ├── service/                    application operations
│   ├── repository/                 persistence boundary
│   ├── entity/                     persistence/domain model
│   └── internal/                   Large implementation details
├── orders/
└── shared/               small technical foundations, not shared business dumping ground
```

The complete tree is a reference, not a requirement to create every package.

## Profile Differences

| Profile | Shape |
|---|---|
| Small | A few conventional classes directly under the feature package |
| Medium | Named API, service, repository, and entity packages only when populated |
| Large | Public API plus internal implementation enforced through Spring Modulith verification |

## File Placement

| Responsibility | Location |
|---|---|
| HTTP translation and transport DTOs | Feature `api/` |
| Application operation and transaction | Feature `service/` |
| Persistence boundary and queries | Feature `repository/` |
| Persistence or domain model | Feature `entity/` |
| Non-public Large implementation | Feature `internal/` |
| Small shared technical foundation | Root `shared/` |

- Use constructor injection.
- Prefer Java records for immutable transport DTOs; classes remain valid when framework
  or modeling needs require them.
- Do not use Lombok `@Data` on JPA entities. Define equality from stable identity and keep
  secrets/relationships out of `toString`.
- Use database-native identity types and constraints deliberately.

## Architecture Cleanup

Do not retain empty packages merely to imitate the reference tree. Before removing or reorganizing
user-created structure, explain the change, current and future ownership, and how to restore the
documented pattern; then ask for approval.
