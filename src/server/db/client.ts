import "server-only";

import { createDatabase, type Database } from "./factory";

/**
 * Process-wide database singleton. Cached on globalThis so that Next.js hot
 * reloading in development does not open a new connection / PGlite instance
 * on every change.
 */
const globalForDb = globalThis as unknown as { __minigestDb?: Promise<Database> };

export function getDb(): Promise<Database> {
  globalForDb.__minigestDb ??= createDatabase({
    url: process.env.DATABASE_URL,
    migrateLocal: true,
  });
  return globalForDb.__minigestDb;
}
