import { and, asc, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { itemCategories, items, units } from "../../db/schema";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../pg-error";
import {
  type Executor,
  type FieldErrors,
  type RawInput,
  type SaveResult,
  type ToggleResult,
  PAGE_SIZE,
  likePattern,
} from "./types";
import { itemSchema, itemUpdateSchema, runSchema } from "./validation";

export type ItemStatusFilter = "all" | "active" | "inactive";

export interface ItemListFilter {
  q?: string;
  categoryId?: string;
  status?: ItemStatusFilter;
  page?: number;
}

export async function listItems(db: Executor, filter: ItemListFilter = {}) {
  const page = filter.page ?? 1;
  const conds: SQL[] = [];
  const q = filter.q?.trim();
  if (q) {
    const pattern = likePattern(q);
    const match = or(ilike(items.name, pattern), ilike(items.sku, pattern));
    if (match) conds.push(match);
  }
  if (filter.categoryId && z.uuid().safeParse(filter.categoryId).success) {
    conds.push(eq(items.categoryId, filter.categoryId));
  }
  const status = filter.status ?? "active";
  if (status === "active") conds.push(eq(items.isActive, true));
  if (status === "inactive") conds.push(eq(items.isActive, false));
  const where = conds.length ? and(...conds) : undefined;

  const purchaseUnit = alias(units, "purchase_unit");
  const usageUnit = alias(units, "usage_unit");
  const rows = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      isActive: items.isActive,
      categoryCode: itemCategories.code,
      categoryName: itemCategories.name,
      purchaseUnit: purchaseUnit.code,
      usageUnit: usageUnit.code,
      factor: items.purchaseToUsageFactor,
      minStockLevel: items.minStockLevel,
      reorderPoint: items.reorderPoint,
    })
    .from(items)
    .innerJoin(itemCategories, eq(itemCategories.id, items.categoryId))
    .innerJoin(purchaseUnit, eq(purchaseUnit.id, items.purchaseUnitId))
    .innerJoin(usageUnit, eq(usageUnit.id, items.usageUnitId))
    .where(where)
    .orderBy(asc(items.name), asc(items.sku))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const totalRow = (await db.select({ n: count() }).from(items).where(where))[0];
  const total = totalRow?.n ?? 0;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getItem(db: Executor, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (await db.select().from(items).where(eq(items.id, id)).limit(1))[0] ?? null;
}

interface RefIds {
  categoryId: string;
  purchaseUnitId: string;
  usageUnitId: string;
}

/** Kategori/satuan harus ada dan aktif (kecuali nilai yang sama dengan data barang saat ini). */
async function checkReferences(db: Executor, next: RefIds, current?: RefIds): Promise<FieldErrors> {
  const errors: FieldErrors = {};
  const cat = (
    await db.select().from(itemCategories).where(eq(itemCategories.id, next.categoryId)).limit(1)
  )[0];
  if (!cat) errors.categoryId = "Kategori tidak ditemukan.";
  else if (!cat.isActive && next.categoryId !== current?.categoryId)
    errors.categoryId = "Kategori tidak aktif.";

  for (const [field, id, was] of [
    ["purchaseUnitId", next.purchaseUnitId, current?.purchaseUnitId],
    ["usageUnitId", next.usageUnitId, current?.usageUnitId],
  ] as const) {
    const u = (await db.select().from(units).where(eq(units.id, id)).limit(1))[0];
    if (!u) errors[field] = "Satuan tidak ditemukan.";
    else if (!u.isActive && id !== was) errors[field] = "Satuan tidak aktif.";
  }
  return errors;
}

export async function createItem(db: Executor, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(itemSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const v = parsed.value;
  const sku = v.sku.toUpperCase();

  const errors = await checkReferences(db, v);
  const dup = await db.select({ id: items.id }).from(items).where(eq(items.sku, sku)).limit(1);
  if (dup.length) errors.sku = "SKU sudah dipakai.";
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  try {
    const row = (
      await db
        .insert(items)
        .values({ ...v, sku })
        .returning({ id: items.id })
    )[0];
    if (!row) throw new Error("Insert barang tidak mengembalikan baris.");
    return { ok: true, id: row.id };
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION)
      return { ok: false, fieldErrors: { sku: "SKU sudah dipakai." } };
    throw e;
  }
}

/** SKU tidak dapat diubah setelah dibuat (dipakai sebagai identitas di dokumen). */
export async function updateItem(db: Executor, id: string, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(itemUpdateSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const current = await getItem(db, id);
  if (!current) return { ok: false, fieldErrors: {}, formError: "Barang tidak ditemukan." };

  const errors = await checkReferences(db, parsed.value, current);
  if (Object.keys(errors).length) return { ok: false, fieldErrors: errors };

  await db.update(items).set(parsed.value).where(eq(items.id, id));
  return { ok: true, id };
}

export async function setItemActive(
  db: Executor,
  id: string,
  active: boolean,
): Promise<ToggleResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, code: "not_found" };
  const rows = await db
    .update(items)
    .set({ isActive: active })
    .where(eq(items.id, id))
    .returning({ id: items.id });
  return rows.length ? { ok: true } : { ok: false, code: "not_found" };
}
