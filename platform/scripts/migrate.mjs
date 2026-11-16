import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {postgresOptions} from '../lib/postgres-options.mjs';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({...postgresOptions(process.env.DATABASE_URL), connectionTimeoutMillis: 10000});
try {
  await client.connect();
  // Run only the standalone app schema, preserving the legacy tables.
  for (const file of ['002-platform.sql', '003-local-auth.sql', '004-private-platform.sql']) {
    await client.query(await readFile(new URL('../db/' + file, import.meta.url), 'utf8'));
    console.log(`Applied ${file}`);
  }
} catch (error) {
  // Do not print errors that could include database credentials or connection details.
  console.error('Migration failed. Check database connectivity and migration permissions.');
  const code = typeof error?.code === 'string' ? error.code : 'UNKNOWN';
  if (/^[A-Z0-9_]+$/.test(code)) console.error('Error code:', code);
  process.exitCode = 1;
} finally {
  await client.end();
}
