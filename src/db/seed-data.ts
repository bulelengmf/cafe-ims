import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { itemCategories, items, outlets, roles, units } from "./schema";

/** Peran sesuai dokumen kebutuhan (bagian RACI). */
export const ROLE_SEED = [
  {
    code: "barista",
    name: "Barista / Requester",
    description: "Membuat PR, mencatat pemakaian dan waste.",
  },
  {
    code: "cost_controller",
    name: "Cost Controller / Admin Purchasing",
    description: "Master data, supplier, PO.",
  },
  { code: "receiving_staff", name: "Receiving Staff", description: "Penerimaan barang dan QC." },
  {
    code: "cafe_manager",
    name: "Cafe Manager / Owner",
    description: "Persetujuan dan pengawasan.",
  },
  {
    code: "finance",
    name: "Finance / Accounting",
    description: "Invoice, pembayaran, valuasi, aset.",
  },
] as const;

/** Klasifikasi CAT-A s/d CAT-G sesuai dokumen. */
export const CATEGORY_SEED = [
  { code: "CAT-A", name: "Bahan Baku Utama", treatment: "stock_ledger", sortOrder: 1 },
  { code: "CAT-B", name: "Bahan Pendukung dan Packaging", treatment: "stock_ledger", sortOrder: 2 },
  { code: "CAT-C", name: "Barang Habis Pakai Operasional", treatment: "consumable", sortOrder: 3 },
  { code: "CAT-D", name: "Barang Dagangan", treatment: "resale", sortOrder: 4 },
  {
    code: "CAT-E",
    name: "Barang Tahan Lama Non-Aset",
    treatment: "equipment_register",
    tracksStock: false,
    sortOrder: 5,
  },
  {
    code: "CAT-F",
    name: "Aset Tetap / CAPEX",
    treatment: "fixed_asset",
    tracksStock: false,
    sortOrder: 6,
  },
  { code: "CAT-G", name: "Karantina / Rusak / Kedaluwarsa", treatment: "quarantine", sortOrder: 7 },
] as const;

export const UNIT_SEED = [
  { code: "kg", name: "Kilogram", dimension: "mass" },
  { code: "g", name: "Gram", dimension: "mass" },
  { code: "l", name: "Liter", dimension: "volume" },
  { code: "ml", name: "Mililiter", dimension: "volume" },
  { code: "pcs", name: "Pieces", dimension: "count" },
  { code: "dus", name: "Dus", dimension: "count" },
  { code: "botol", name: "Botol", dimension: "count" },
  { code: "pack", name: "Pack", dimension: "count" },
] as const;

/** Barang contoh DEV. Bukan data bisnis nyata. */
const SAMPLE_ITEMS = [
  {
    sku: "DEV-COF-001",
    name: "Biji Kopi Arabica (contoh)",
    cat: "CAT-A",
    buy: "kg",
    use: "g",
    factor: "1000",
    min: "2000",
    reorder: "4000",
    expiry: true,
  },
  {
    sku: "DEV-MLK-001",
    name: "Susu UHT 1L (contoh)",
    cat: "CAT-A",
    buy: "dus",
    use: "ml",
    factor: "12000",
    min: "6000",
    reorder: "12000",
    expiry: true,
  },
  {
    sku: "DEV-CUP-001",
    name: "Cup Plastik 16oz (contoh)",
    cat: "CAT-B",
    buy: "pack",
    use: "pcs",
    factor: "50",
    min: "100",
    reorder: "200",
    expiry: false,
  },
] as const;

function mustGet(map: Map<string, string>, key: string, what: string): string {
  const value = map.get(key);
  if (!value) throw new Error(`Seed: ${what} "${key}" tidak ditemukan.`);
  return value;
}

/** Idempotent: aman dijalankan berulang kali. */
export async function seedReferenceData(db: Db) {
  await db
    .insert(roles)
    .values([...ROLE_SEED])
    .onConflictDoNothing({ target: roles.code });
  await db
    .insert(itemCategories)
    .values(CATEGORY_SEED.map((c) => ({ ...c })))
    .onConflictDoNothing({ target: itemCategories.code });
  await db
    .insert(units)
    .values(UNIT_SEED.map((u) => ({ ...u })))
    .onConflictDoNothing({ target: units.code });
  await db
    .insert(outlets)
    .values({ code: "MAIN", name: "Outlet Utama (DEV)", address: null })
    .onConflictDoNothing({ target: outlets.code });

  const cats = new Map((await db.select().from(itemCategories)).map((c) => [c.code, c.id]));
  const unitMap = new Map((await db.select().from(units)).map((u) => [u.code, u.id]));
  for (const s of SAMPLE_ITEMS) {
    const exists = await db.select({ id: items.id }).from(items).where(eq(items.sku, s.sku));
    if (exists.length) continue;
    await db.insert(items).values({
      sku: s.sku,
      name: s.name,
      categoryId: mustGet(cats, s.cat, "kategori"),
      purchaseUnitId: mustGet(unitMap, s.buy, "satuan"),
      usageUnitId: mustGet(unitMap, s.use, "satuan"),
      purchaseToUsageFactor: s.factor,
      minStockLevel: s.min,
      reorderPoint: s.reorder,
      tracksExpiry: s.expiry,
    });
  }
}
