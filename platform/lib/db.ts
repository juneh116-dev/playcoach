import { Pool } from "pg";
import {postgresOptions} from './postgres-options.mjs';
const globalDb = globalThis as unknown as { playcoachPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  return (globalDb.playcoachPool ??= new Pool({
    ...postgresOptions(process.env.DATABASE_URL),
    max: 5,
    connectionTimeoutMillis: 10000,
  }));
}
