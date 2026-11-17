import { rmSync } from 'node:fs';
import { Client } from 'pg';

/** Drops only the schema this run created. */
export default async function globalTeardown() {
  const schema = process.env.E2E_SCHEMA;
  const url = process.env.E2E_DATABASE_URL;
  if (!schema?.startsWith('e2e_') || !url) return;
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
  rmSync('./uploads-test', { recursive: true, force: true });
}
