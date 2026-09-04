# Spring Boot Structure

## Package by Feature

Place the application class in the root package. Organize business code below it by
feature, never in one global controller/service/repository layer.

```text
com.example.app/
├── Application.java
├── users/
│   ├── api/              controllers and transport DTOs (Medium/Large)
│   ├── service/          application operations
│   ├── repository/       persistence boundary
│   └── entity/           persistence/domain model
├── orders/
└── shared/               small technical foundations, not shared business dumping ground
```

Small may keep the few feature classes directly under `users/`. Medium uses the named
subpackages when multiple files make ownership clearer. Large exposes types in the module
base/API package and places implementation below `internal/` as required by the generated
Spring Modulith verification.

- Use constructor injection.
- Prefer Java records for immutable transport DTOs; classes remain valid when framework
  or modeling needs require them.
- Do not use Lombok `@Data` on JPA entities. Define equality from stable identity and keep
  secrets/relationships out of `toString`.
- Use database-native identity types and constraints deliberately.
