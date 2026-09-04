# Prisma Architecture

Create one server-only Prisma client and inject/use it behind Next-owned data access. Browser code
never imports Prisma. Services own business operations; repositories are optional boundaries for
complex owned persistence, not wrappers around every generated method.
