import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

/**
 * Each e2e run gets its own throwaway Postgres schema, so tests never touch
 * existing data. Migrations are applied with the non-destructive
 * `migrate deploy`, then the shelf-life table is seeded (no demo account);
 * global-teardown drops the schema afterwards.
 */
export default function globalSetup() {
  const base = new URL(
    process.env.TEST_DATABASE_URL ?? 'postgresql://raf:raf@localhost:5433/raf',
  );
  const schema = `e2e_${Date.now()}`;
  base.searchParams.set('schema', schema);
  process.env.E2E_SCHEMA = schema;
  process.env.E2E_DATABASE_URL = base.toString();

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: base.toString() },
  });
  execSync('npx prisma db seed', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: base.toString(), SEED_DEMO: 'false' },
  });
  rmSync('./uploads-test', { recursive: true, force: true });
}
