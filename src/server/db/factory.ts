import path from "node:path";

import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

import * as schema from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
export const LOCAL_DB_DIR = path.join(process.cwd(), ".data", "pglite");

interface CreateDatabaseOptions {
  /** Postgres connection string. When empty, an embedded PGlite database is used. */
  url?: string;
  /** PGlite data directory; `memory://` for an ephemeral in-memory database (tests). */
  localDir?: string;
  /** Apply pending migrations automatically (local PGlite only). */
  migrateLocal?: boolean;
}

/**
 * Builds a Drizzle instance for the current environment:
 * - production / preview: Neon serverless Postgres over HTTP;
 * - development / tests: embedded PGlite (real Postgres compiled to WASM).
 * Both expose the same `PgDatabase` API, so the domain layer is driver-agnostic.
 */
export async function createDatabase(options: CreateDatabaseOptions = {}): Promise<Database> {
  if (options.url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    return drizzle(neon(options.url), { schema }) as unknown as Database;
  }

  const dataDir = options.localDir ?? LOCAL_DB_DIR;
  if (!dataDir.startsWith("memory://")) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dataDir, { recursive: true });
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });

  if (options.migrateLocal) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  }

  return db as unknown as Database;
}
