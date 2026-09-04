export function buildPostgresFiles() {
  return {
    'prisma.config.ts': `import 'dotenv/config'\nimport { defineConfig, env } from 'prisma/config'\n\nexport default defineConfig({\n  schema: 'prisma/schema.prisma',\n  migrations: { path: 'prisma/migrations' },\n  datasource: { url: env('DATABASE_URL') },\n})\n`,
    'prisma/schema.prisma': `generator client {\n  provider = "prisma-client"\n  output   = "../src/generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel Example {\n  id        String   @id @default(uuid())\n  createdAt DateTime @default(now()) @map("created_at")\n  updatedAt DateTime @updatedAt @map("updated_at")\n\n  @@map("examples")\n}\n`,
    'src/lib/prisma.ts': `import { PrismaPg } from '@prisma/adapter-pg'\nimport { PrismaClient } from '@/generated/prisma/client'\n\nconst connectionString = process.env.DATABASE_URL\nif (!connectionString) throw new Error('DATABASE_URL is required')\nconst globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }\nexport const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })\nif (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma\n`,
  }
}

export function addPostgresScripts(scripts) {
  Object.assign(scripts, {
    'prisma:generate': 'prisma generate',
    'db:migrate': 'prisma migrate dev',
    'db:deploy': 'prisma migrate deploy',
    'db:reset': 'prisma migrate reset --force',
    'db:studio': 'prisma studio',
    dev: 'prisma generate && next dev',
    build: 'prisma generate && next build',
    typecheck: 'prisma generate && tsc --noEmit',
  })
}

