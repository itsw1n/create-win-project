# Agent Instructions

## General dependency security

Treat all third-party dependencies as untrusted code.

When installing dependencies:

- Do not assume a package is safe because it is popular or commonly used.
- Be aware that dependencies may execute lifecycle or install scripts.
- Do not automatically approve blocked scripts or weaken package-manager security controls.
- Prefer known, reviewed dependencies and compatibility profiles.
- Avoid unnecessary dependencies.
- Never execute arbitrary commands derived from package metadata or user input.
- Report security warnings clearly instead of silently bypassing them.
- Keep dependency installation optional when possible.
- Preserve the generated project if installation fails.
