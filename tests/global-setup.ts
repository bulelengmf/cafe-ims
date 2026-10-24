import "dotenv/config";
import path from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createDb } from "../src/db/client";

/** Reset database TEST lalu terapkan semua migrasi dari nol. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL belum diatur (lihat .env.example).");
  if (url === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL tidak boleh sama dengan DATABASE_URL.");
  }
  const dbName = new URL(url).pathname.replace("/", "");
  if (!dbName.includes("test")) {
    throw new Error(`Nama database test harus mengandung "test" (sekarang: "${dbName}").`);
  }
  const { db, pool } = createDb(url);
  try {
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db, { migrationsFolder: path.resolve(__dirname, "../drizzle") });
  } finally {
    await pool.end();
  }
}
