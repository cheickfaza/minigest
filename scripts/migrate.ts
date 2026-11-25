/**
 * Applies pending SQL migrations from ./drizzle.
 * Runs automatically before `next build` (see package.json), so every Vercel
 * deployment brings the Neon schema up to date.
 */
import "dotenv/config";

import { mkdirSync } from "node:fs";

import { LOCAL_DB_DIR, MIGRATIONS_FOLDER } from "../src/server/db/factory";

async function main() {
  const url = process.env.DATABASE_URL;

  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { migrate } = await import("drizzle-orm/neon-http/migrator");
    await migrate(drizzle(neon(url)), { migrationsFolder: MIGRATIONS_FOLDER });
    console.log("✓ Migrations applied (Neon Postgres)");
    return;
  }

  mkdirSync(LOCAL_DB_DIR, { recursive: true });
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(LOCAL_DB_DIR);
  await migrate(drizzle(client), { migrationsFolder: MIGRATIONS_FOLDER });
  await client.close();
  console.log(`✓ Migrations applied (local PGlite: ${LOCAL_DB_DIR})`);
}

main().catch((error: unknown) => {
  console.error("✗ Migration failed:", error);
  process.exit(1);
});
