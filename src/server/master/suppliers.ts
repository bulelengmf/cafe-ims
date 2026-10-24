import { and, asc, count, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { suppliers } from "../../db/schema";
import { PG_UNIQUE_VIOLATION, pgErrorCode } from "../pg-error";
import {
  type Executor,
  type RawInput,
  type SaveResult,
  type ToggleResult,
  PAGE_SIZE,
  likePattern,
} from "./types";
import { runSchema, supplierSchema } from "./validation";

export interface SupplierListFilter {
  q?: string;
  type?: "formal" | "market";
  status?: "all" | "active" | "inactive";
  page?: number;
}

export async function listSuppliers(db: Executor, filter: SupplierListFilter = {}) {
  const page = filter.page ?? 1;
  const conds: SQL[] = [];
  const q = filter.q?.trim();
  if (q) {
    const pattern = likePattern(q);
    const match = or(
      ilike(suppliers.name, pattern),
      ilike(suppliers.contactPerson, pattern),
      ilike(suppliers.phone, pattern),
    );
    if (match) conds.push(match);
  }
  if (filter.type) conds.push(eq(suppliers.type, filter.type));
  const status = filter.status ?? "active";
  if (status === "active") conds.push(eq(suppliers.isActive, true));
  if (status === "inactive") conds.push(eq(suppliers.isActive, false));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await db
    .select()
    .from(suppliers)
    .where(where)
    .orderBy(asc(suppliers.name))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  const totalRow = (await db.select({ n: count() }).from(suppliers).where(where))[0];
  const total = totalRow?.n ?? 0;
  return { rows, total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getSupplier(db: Executor, id: string) {
  if (!z.uuid().safeParse(id).success) return null;
  return (await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1))[0] ?? null;
}

async function nameTaken(db: Executor, name: string, exceptId?: string): Promise<boolean> {
  const conds = [sql`lower(${suppliers.name}) = lower(${name})`];
  if (exceptId) conds.push(ne(suppliers.id, exceptId));
  return (
    (
      await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(...conds))
        .limit(1)
    ).length > 0
  );
}

const DUP = { name: "Nama pemasok sudah dipakai." };

export async function createSupplier(db: Executor, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(supplierSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  if (await nameTaken(db, parsed.value.name)) return { ok: false, fieldErrors: DUP };
  try {
    const row = (
      await db.insert(suppliers).values(parsed.value).returning({ id: suppliers.id })
    )[0];
    if (!row) throw new Error("Insert pemasok tidak mengembalikan baris.");
    return { ok: true, id: row.id };
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) return { ok: false, fieldErrors: DUP };
    throw e;
  }
}

export async function updateSupplier(db: Executor, id: string, raw: RawInput): Promise<SaveResult> {
  const parsed = runSchema(supplierSchema, raw);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  if (!(await getSupplier(db, id)))
    return { ok: false, fieldErrors: {}, formError: "Pemasok tidak ditemukan." };
  if (await nameTaken(db, parsed.value.name, id)) return { ok: false, fieldErrors: DUP };
  try {
    await db.update(suppliers).set(parsed.value).where(eq(suppliers.id, id));
    return { ok: true, id };
  } catch (e) {
    if (pgErrorCode(e) === PG_UNIQUE_VIOLATION) return { ok: false, fieldErrors: DUP };
    throw e;
  }
}

export async function setSupplierActive(
  db: Executor,
  id: string,
  active: boolean,
): Promise<ToggleResult> {
  if (!z.uuid().safeParse(id).success) return { ok: false, code: "not_found" };
  const rows = await db
    .update(suppliers)
    .set({ isActive: active })
    .where(eq(suppliers.id, id))
    .returning({ id: suppliers.id });
  return rows.length ? { ok: true } : { ok: false, code: "not_found" };
}
