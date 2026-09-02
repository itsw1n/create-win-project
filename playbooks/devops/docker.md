# Docker

Generated Docker files are executable configuration, not tutorial samples. Keep this playbook focused on decisions the files cannot express by themselves.

## Core Rules

- Pin major runtime versions and use small trusted base images.
- Copy dependency descriptors before application source so dependency layers remain cacheable.
- Use a non-root runtime user when the framework image and deployment permit it.
- Keep credentials out of images, build arguments, repository files, and Compose defaults. Inject them at runtime through the deployment platform.
- Add `.dockerignore` files for dependencies, build output, secrets, IDE files, and VCS metadata.
- Make health checks call a real application endpoint and distinguish readiness from liveness when the orchestrator supports both.
- Scan the final image and update deliberately; do not hide known findings by disabling scanners.

## Dev vs Prod Differences

| Concern | Development | Production |
|---|---|---|
| Source | bind-mounted for fast feedback | copied into an immutable image |
| Command | framework/Maven dev server | optimized server or executable JAR |
| Dependencies | development dependencies available | runtime-only stage where practical |
| Ports | exposed for local access | published by the deployment platform |
| Credentials | local uncommitted environment | managed secret store |
| Restart | developer-controlled | orchestrator policy |

Do not deploy the development Compose file. Production needs explicit TLS termination, secret delivery, persistence/backup, resource limits, logging, probes, and rollout policy.

## Dockerfiles

The generated templates use multi-stage production builds:

- Next.js builds standalone output, then copies only the standalone server, static assets, and public files.
- Vite builds static assets, then serves them behind nginx with SPA fallback.
- Spring Boot builds with Maven and runs the executable JAR on a JRE image.

When editing a Dockerfile, verify both the image build and the container's real health endpoint. A successful compile alone does not prove the runtime stage contains all required files.

## Compose Boundaries

- `depends_on` controls startup ordering, not application readiness; use health conditions where a dependency must be ready.
- Use named volumes only for data that must persist. Never mount source into a production container.
- Bind databases to localhost in local development unless another host genuinely needs access.
- Keep frontend-public values separate from backend secrets. Public framework prefixes remain public inside containers.
- For managed Supabase, Compose should run the application client; it should not pretend a full Supabase platform exists locally unless the Supabase CLI owns that environment.

## Verification

```bash
docker compose config
docker compose build
docker compose up
docker compose ps
```

Then call the application health endpoint and exercise one real request across service boundaries. Inspect logs for secret leakage before considering the container setup complete.
