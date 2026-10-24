import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { items, units } from "../../db/schema";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../pg-error";
import type { Executor, RawInput, SaveResult, ToggleResult } from "./types";
import { runSchema, unitCreateSchema, unitUpdateSchema } from "./validation";

export async function listUnits(db: Executor) {
  return db
    .select({
      id: units.id,
      code: units.code,
      name: units.name,
      dimension: units.dimension,
      isActive: units.isActive,
      activeItemCount:
        sql<number>`count(distinct ${items.id}) filter (where ${items.isActive})`.mapWith(Number),
    })
    .from(units)
    .leftJoin(items, or(eq(items.purchaseUnitId, units.id), eq(items.usageUnitId, units.id)))
    .groupBy(units.id)
    .orderBy(asc(units.dimension), asc(units.code));
}

/** Untuk dropdown: satuan aktif, ditambah satuan yang sedang dipakai bila sudah nonaktif. */
export async function unitOptions(db: Executor, includeIds: string[] = []) {
  const valid = includeIds.filter((id) => z.uuid().safeParse(id).success);
  const active = eq(units.isActive, true);
  const where = valid.length ? or(active, inArray(units.id, valid)) : active;
  return db
    .select({ id: units.id, code: units.code, name: units.name })
    .from(units)
    .where(where)
    .orderBy(asc(units.dimension), asc(units.code));
}

export async function getUnit(db: Executor, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (await db.select().from(units).where(eq(units.id, id)).limit(1))[0] ?? null;
}

const DUP = { code: "Kode satuan sudah dipakai." };

export async function createUnit(db: Executor, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(unitCreateSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const code = parsed.value.code.toLowerCase();
  const dup = await db.select({ id: units.id }).from(units).where(eq(units.code, code)).limit(1);
  if (dup.length) return { ok: false, fieldErrors: DUP };
  try {
    const row = (
      await db
        .insert(units)
        .values({ ...parsed.value, code })
        .returning({ id: units.id })
    )[0];
    if (!row) throw new Error("Insert satuan tidak mengembalikan baris.");
    return { ok: true, id: row.id };
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) return { ok: false, fieldErrors: DUP };
    throw e;
  }
}

/** Hanya nama yang dapat diubah; kode dan dimensi tetap agar konversi yang ada tidak berubah makna. */
export async function updateUnit(db: Executor, id: string, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(unitUpdateSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  if (!(await getUnit(db, id)))
    return { ok: false, fieldErrors: {}, formError: "Satuan tidak ditemukan." };
  await db.update(units).set(parsed.value).where(eq(units.id, id));
  return { ok: true, id };
}

/** Satuan tidak dapat dinonaktifkan selama masih dipakai barang aktif. */
export async function setUnitActive(
  db: Executor,
  id: string,
  active: boolean,
): Promise<ToggleResult> {
  const current = await getUnit(db, id);
  if (!current) return { ok: false, code: "not_found" };
  if (!active) {
    const used = await db
      .select({ id: items.id })
      .from(items)
      .where(
        and(eq(items.isActive, true), or(eq(items.purchaseUnitId, id), eq(items.usageUnitId, id))),
      )
      .limit(1);
    if (used.length) return { ok: false, code: "has_active_items" };
  }
  await db.update(units).set({ isActive: active }).where(eq(units.id, id));
  return { ok: true };
}
