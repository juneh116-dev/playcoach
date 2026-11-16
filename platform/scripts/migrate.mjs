import {readFile} from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({connectionString: process.env.DATABASE_URL});
try {
  await client.connect();
  // Run only the standalone app schema, preserving the legacy tables.
  for (const file of ['002-platform.sql', '003-local-auth.sql']) {
    await client.query(await readFile(new URL('../db/' + file, import.meta.url), 'utf8'));
    console.log(`Applied ${file}`);
  }
} catch {
  // Do not print errors that could include database credentials or connection details.
  console.error('Migration failed. Check database connectivity and migration permissions.');
  process.exitCode = 1;
} finally {
  await client.end();
}
