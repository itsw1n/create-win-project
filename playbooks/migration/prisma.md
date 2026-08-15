# Migration: Prisma

Used with: Next.js + PostgreSQL (no Spring Boot backend).

---

## Core Rules
- Schema lives in prisma/schema.prisma — single source of truth
- NEVER edit migration files after they are applied
- To change schema: edit schema.prisma → run prisma migrate dev
- Prisma Client is the ORM — no raw SQL for standard queries
- Raw SQL only when Prisma query is insufficient
- One Prisma Client instance — never instantiate in multiple files

---

## Setup
```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

## Environment Variable
```bash
# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/projectdb"
```

---

## prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  refreshTokens RefreshToken[]
  posts         Post[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

enum Role {
  USER
  ADMIN
  MODERATOR
}
```

## Schema Conventions
- Model names: PascalCase singular (`User`, `Post`, `RefreshToken`)
- Field names: camelCase (`createdAt`, `userId`)
- Table names: snake_case plural via `@@map` (`@@map("users")`)
- Always include `id`, `createdAt`, `updatedAt` on every model
- Always define `onDelete` behavior on every relation
- Use `@default(uuid())` for IDs
- Use `@updatedAt` for updatedAt — Prisma handles it automatically

---

## Singleton Prisma Client
```typescript
// lib/prisma.ts — ONLY place PrismaClient is instantiated
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Import everywhere as:
```typescript
import { prisma } from '@/lib/prisma'
```

---

## Migration Commands
```bash
# Dev: create migration + apply + regenerate client
npx prisma migrate dev --name create_users_table

# Dev: reset DB (drop + migrate + seed)
npx prisma migrate reset

# Prod: apply pending migrations (no prompt, no reset)
npx prisma migrate deploy

# Regenerate Prisma Client after schema change
npx prisma generate

# Open Prisma Studio (DB GUI)
npx prisma studio

# Pull schema from existing DB
npx prisma db pull

# Push schema without migration (prototyping only)
npx prisma db push
```

## When to Use Each Command
| Command                      | When                                      |
|------------------------------|-------------------------------------------|
| `migrate dev`                | Local development — schema changes        |
| `migrate deploy`             | Production — apply pending migrations     |
| `migrate reset`              | Local only — full DB reset                |
| `generate`                   | After any schema change                   |
| `db push`                    | Prototyping only — no migration file      |
| `studio`                     | Visual DB inspection                      |

---

## Query Patterns

### Basic CRUD
```typescript
// Create
const user = await prisma.user.create({
  data: { email, password: hashedPassword, name },
})

// Read one
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true, role: true },  // never return password
})

// Read many with filter
const users = await prisma.user.findMany({
  where: { role: 'USER' },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: page * 20,
})

// Update
const user = await prisma.user.update({
  where: { id },
  data: { name },
})

// Delete
await prisma.user.delete({ where: { id } })

// Upsert
const user = await prisma.user.upsert({
  where: { email },
  update: { name },
  create: { email, password, name },
})
```

### Relations
```typescript
// Include related data
const userWithPosts = await prisma.user.findUnique({
  where: { id },
  include: { posts: { orderBy: { createdAt: 'desc' } } },
})

// Nested create
const post = await prisma.post.create({
  data: {
    title,
    content,
    author: { connect: { id: userId } },
  },
})
```

### Transactions
```typescript
// Use transactions for multi-step operations
const [user, profile] = await prisma.$transaction([
  prisma.user.create({ data: userData }),
  prisma.profile.create({ data: profileData }),
])

// Interactive transaction for complex logic
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id } })
  if (!user) throw new Error('USER_NOT_FOUND')
  return tx.order.create({ data: { userId: user.id, ...orderData } })
})
```

---

## Seeding
```typescript
// prisma/seed.ts
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

```bash
npx prisma db seed
```

---

## Select — Never Return Sensitive Fields
```typescript
// ❌ returns password
const user = await prisma.user.findUnique({ where: { id } })

// ✅ explicit select
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true, role: true, createdAt: true },
})
```

---

## Error Handling
```typescript
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

try {
  await prisma.user.create({ data })
} catch (error) {
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new AppError('EMAIL_TAKEN', 409)
    }
  }
  throw error
}
```

## Common Prisma Error Codes
| Code   | Meaning                              |
|--------|--------------------------------------|
| P2002  | Unique constraint violation          |
| P2025  | Record not found                     |
| P2003  | Foreign key constraint violation     |
| P2014  | Relation violation                   |

---

## Agent Rules
```
Schema change needed?
  → Edit prisma/schema.prisma
  → Run: npx prisma migrate dev --name [description]
  → Run: npx prisma generate
  → NEVER edit migration files in prisma/migrations/

New model?
  → Always include id, createdAt, updatedAt
  → Always add @@map("table_name") for snake_case table name
  → Always define onDelete on relations

Query needs password field?
  → NEVER include it — always explicit select without password

Multiple DB operations together?
  → Use prisma.$transaction()

Unique constraint error?
  → Catch PrismaClientKnownRequestError code P2002
  → Throw AppError with appropriate code

Prisma Client import?
  → Always from @/lib/prisma — never new PrismaClient() elsewhere
```
