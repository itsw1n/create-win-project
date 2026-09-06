# Make and Docker

## Docker Targets

- Keep image building separate from container startup.
- `build` may run `docker compose build`; `run` must not rebuild implicitly.
- Use the generated Compose file as the source of service names and profiles.
- Never interpolate secrets into command output.
- Destructive volume or database targets require explicit names and confirmation.
