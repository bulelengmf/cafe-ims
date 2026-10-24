import { expect } from "vitest";
import { pgCode, testDb } from "./helpers";

const { db, pool } = testDb();
export { db, pool };
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

class Rollback extends Error {}

/** Menjalankan tes di dalam transaksi yang SELALU dibatalkan: tidak ada data tersisa. */
export async function inRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

/** Menegaskan operasi gagal dengan kode PostgreSQL tertentu tanpa merusak transaksi luar (savepoint). */
export async function expectPg(
  tx: Tx,
  code: string,
  fn: (sp: Tx) => Promise<unknown>,
): Promise<void> {
  let err: unknown;
  try {
    await tx.transaction(async (sp) => {
      await fn(sp as unknown as Tx);
    });
  } catch (e) {
    err = e;
  }
  expect(pgCode(err), String(err)).toBe(code);
}
