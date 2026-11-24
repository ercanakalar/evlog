import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Migrations take a lock that a connection pooler would lose, so with Neon
 * they connect to the database itself (the same host without "-pooler").
 */
const direct = (url: string) => url.replace(/-pooler(?=\.[^/@]*\.neon\.tech)/, '');

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Read lazily so `prisma generate` works without a database (e.g. in CI).
    url: direct(process.env.DATABASE_URL ?? ''),
  },
});
