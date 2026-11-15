import { Pool } from "pg";
const globalDb = globalThis as unknown as { playcoachPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  return (globalDb.playcoachPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  }));
}
