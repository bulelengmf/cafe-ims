import "dotenv/config";
import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "./client";
import { parseEnv } from "../lib/env";

async function main() {
  const { DATABASE_URL } = parseEnv();
  const { db, pool } = createDb(DATABASE_URL);
  try {
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    console.log("Migrasi selesai.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
