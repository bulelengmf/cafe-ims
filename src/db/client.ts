import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString, max: 10 });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export type Db = ReturnType<typeof createDb>["db"];

// Singleton untuk aplikasi Next.js (aman terhadap hot-reload saat dev).
const globalForDb = globalThis as unknown as { __cafeDb?: ReturnType<typeof createDb> };

export function getDb(): Db {
  if (!globalForDb.__cafeDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL belum diatur.");
    globalForDb.__cafeDb = createDb(url);
  }
  return globalForDb.__cafeDb.db;
}
