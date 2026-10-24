import "dotenv/config";
import { createDb } from "../src/db/client";

export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL belum diatur.");
  return createDb(url);
}

/** Ambil kode error PostgreSQL dari error Drizzle/pg (di dalam `cause`). */
export function pgCode(err: unknown): string | undefined {
  let e: unknown = err;
  while (e && typeof e === "object") {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}
