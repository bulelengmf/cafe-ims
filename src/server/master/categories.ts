import { and, asc, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { itemCategories, items } from "../../db/schema";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../pg-error";
import type { Executor, RawInput, SaveResult, ToggleResult } from "./types";
import { categoryCreateSchema, categoryUpdateSchema, runSchema } from "./validation";

export async function listCategories(db: Executor) {
  // LEFT JOIN + GROUP BY: kolom selalu bertanda tabel (subquery korelasi di query satu tabel salah menghitung).
  return db
    .select({
      id: itemCategories.id,
      code: itemCategories.code,
      name: itemCategories.name,
      treatment: itemCategories.treatment,
      tracksStock: itemCategories.tracksStock,
      sortOrder: itemCategories.sortOrder,
      isActive: itemCategories.isActive,
      activeItemCount: sql<number>`count(${items.id}) filter (where ${items.isActive})`.mapWith(
        Number,
      ),
    })
    .from(itemCategories)
    .leftJoin(items, eq(items.categoryId, itemCategories.id))
    .groupBy(itemCategories.id)
    .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.code));
}

/** Untuk dropdown: kategori aktif, ditambah kategori yang sedang dipakai bila sudah nonaktif. */
export async function categoryOptions(db: Executor, includeId?: string) {
  const active = eq(itemCategories.isActive, true);
  const where =
    includeId && z.uuid().safeParse(includeId).success
      ? or(active, eq(itemCategories.id, includeId))
      : active;
  return db
    .select({ id: itemCategories.id, code: itemCategories.code, name: itemCategories.name })
    .from(itemCategories)
    .where(where)
    .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.code));
}

export async function getCategory(db: Executor, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (
    (await db.select().from(itemCategories).where(eq(itemCategories.id, id)).limit(1))[0] ?? null
  );
}

const DUP = { code: "Kode kategori sudah dipakai." };

export async function createCategory(db: Executor, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(categoryCreateSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const code = parsed.value.code.toUpperCase();
  const dup = await db
    .select({ id: itemCategories.id })
    .from(itemCategories)
    .where(eq(itemCategories.code, code))
    .limit(1);
  if (dup.length) return { ok: false, fieldErrors: DUP };
  try {
    const row = (
      await db
        .insert(itemCategories)
        .values({ ...parsed.value, code })
        .returning({ id: itemCategories.id })
    )[0];
    if (!row) throw new Error("Insert kategori tidak mengembalikan baris.");
    return { ok: true, id: row.id };
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) return { ok: false, fieldErrors: DUP };
    throw e;
  }
}

/** Kode kategori tidak dapat diubah setelah dibuat. */
export async function updateCategory(db: Executor, id: string, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(categoryUpdateSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  if (!(await getCategory(db, id)))
    return { ok: false, fieldErrors: {}, formError: "Kategori tidak ditemukan." };
  await db.update(itemCategories).set(parsed.value).where(eq(itemCategories.id, id));
  return { ok: true, id };
}

/** Kategori tidak dapat dinonaktifkan selama masih dipakai barang aktif. */
export async function setCategoryActive(
  db: Executor,
  id: string,
  active: boolean,
): Promise<ToggleResult> {
  const current = await getCategory(db, id);
  if (!current) return { ok: false, code: "not_found" };
  if (!active) {
    const used = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.categoryId, id), eq(items.isActive, true)))
      .limit(1);
    if (used.length) return { ok: false, code: "has_active_items" };
  }
  await db.update(itemCategories).set({ isActive: active }).where(eq(itemCategories.id, id));
  return { ok: true };
}
