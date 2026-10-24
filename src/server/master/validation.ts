import { z } from "zod";
import { dec, round, toDb } from "../../domain/decimal";
import type { FieldErrors, RawInput } from "./types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors };

/** Menjalankan skema dan mengubah error zod menjadi satu pesan per field. */
export function runSchema<S extends z.ZodType>(schema: S, raw: RawInput): Parsed<z.output<S>> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, value: result.data };
  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!(key in fieldErrors)) fieldErrors[key] = issue.message;
  }
  return { ok: false, fieldErrors };
}

/**
 * Angka desimal dari formulir. Menerima titik ATAU koma sebagai pemisah desimal,
 * tanpa pemisah ribuan. Menolak presisi berlebih (tidak membulatkan diam-diam).
 */
export function parseDecimalInput(
  raw: string,
  opts: { scale: number; min?: number; positive?: boolean },
): { ok: true; value: string } | { ok: false; message: string } {
  const text = raw.trim();
  if (text === "") return { ok: false, message: "Wajib diisi." };
  if (text.includes(",") && text.includes(".")) {
    return {
      ok: false,
      message: "Gunakan satu pemisah desimal saja (titik atau koma), tanpa pemisah ribuan.",
    };
  }
  const normalized = text.replace(",", ".");
  if (!/^\d{1,12}(\.\d+)?$/.test(normalized)) {
    return {
      ok: false,
      message: "Harus berupa angka tidak negatif (maksimal 12 digit sebelum desimal).",
    };
  }
  const value = dec(normalized);
  if (!round(value, opts.scale).eq(value)) {
    return { ok: false, message: `Maksimal ${opts.scale} angka di belakang koma.` };
  }
  if (opts.positive && !value.gt(0)) return { ok: false, message: "Harus lebih besar dari nol." };
  if (opts.min !== undefined && value.lt(opts.min)) {
    return { ok: false, message: `Tidak boleh kurang dari ${opts.min}.` };
  }
  return { ok: true, value: toDb(value, opts.scale) };
}

const name = (label: string, max: number) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(2, `${label} minimal 2 karakter.`)
    .max(max, `${label} maksimal ${max} karakter.`);

const optionalText = (label: string, max: number) =>
  z
    .preprocess(
      (v) => (typeof v === "string" ? v.trim() : ""),
      z.string().max(max, `${label} maksimal ${max} karakter.`),
    )
    .transform((v) => (v === "" ? null : v));

const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());

const uuid = (label: string) => z.uuid({ error: `${label} wajib dipilih.` });

const decimalField = (opts: { scale: number; min?: number; positive?: boolean }) =>
  z.string({ error: "Wajib diisi." }).transform((v, ctx) => {
    const r = parseDecimalInput(v, opts);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.message });
      return z.NEVER;
    }
    return r.value;
  });

const code = (label: string, pattern: RegExp, hint: string, max: number) =>
  z
    .string({ error: `${label} wajib diisi.` })
    .trim()
    .min(2, `${label} minimal 2 karakter.`)
    .max(max, `${label} maksimal ${max} karakter.`)
    .regex(pattern, hint);

export const itemSchema = z.object({
  sku: code(
    "SKU",
    /^[A-Za-z0-9._-]+$/,
    "SKU hanya boleh huruf, angka, titik, garis bawah, dan strip.",
    40,
  ),
  name: name("Nama barang", 160),
  description: optionalText("Deskripsi", 1000),
  categoryId: uuid("Kategori"),
  purchaseUnitId: uuid("Satuan beli"),
  usageUnitId: uuid("Satuan pakai"),
  purchaseToUsageFactor: decimalField({ scale: 6, positive: true }),
  minStockLevel: decimalField({ scale: 3, min: 0 }),
  reorderPoint: decimalField({ scale: 3, min: 0 }),
  tracksExpiry: checkbox,
  storageLocation: optionalText("Lokasi simpan", 80),
});
export const itemUpdateSchema = itemSchema.omit({ sku: true });
export type ItemInput = z.output<typeof itemSchema>;

export const supplierSchema = z.object({
  name: name("Nama pemasok", 160),
  type: z.enum(["formal", "market"], { error: "Jenis pemasok tidak valid." }),
  contactPerson: optionalText("Kontak", 120),
  phone: optionalText("Telepon", 30).refine((v) => v === null || /^[0-9+()\s-]{6,30}$/.test(v), {
    message: "Telepon hanya boleh angka, spasi, +, -, dan tanda kurung (6-30 karakter).",
  }),
  address: optionalText("Alamat", 500),
  paymentTerms: optionalText("Termin pembayaran", 120),
  leadTimeDays: optionalText("Lead time", 5)
    .refine((v) => v === null || /^\d{1,3}$/.test(v), {
      message: "Lead time harus bilangan bulat hari (0-365).",
    })
    .transform((v) => (v === null ? null : Number(v)))
    .refine((v) => v === null || v <= 365, { message: "Lead time maksimal 365 hari." }),
  notes: optionalText("Catatan", 1000),
});
export type SupplierInput = z.output<typeof supplierSchema>;

const treatments = [
  "stock_ledger",
  "consumable",
  "resale",
  "equipment_register",
  "fixed_asset",
  "quarantine",
] as const;

const categoryFields = {
  name: name("Nama kategori", 120),
  description: optionalText("Deskripsi", 500),
  treatment: z.enum(treatments, { error: "Perlakuan tidak valid." }),
  tracksStock: checkbox,
  sortOrder: z
    .string({ error: "Urutan wajib diisi." })
    .trim()
    .regex(/^\d{1,4}$/, "Urutan harus bilangan bulat 0-9999.")
    .transform(Number),
};
export const categoryCreateSchema = z.object({
  code: code(
    "Kode",
    /^[A-Za-z0-9-]+$/,
    "Kode hanya boleh huruf, angka, dan strip (mis. CAT-H).",
    20,
  ),
  ...categoryFields,
});
export const categoryUpdateSchema = z.object(categoryFields);
export type CategoryCreateInput = z.output<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.output<typeof categoryUpdateSchema>;

export const unitCreateSchema = z.object({
  code: code(
    "Kode satuan",
    /^[A-Za-z0-9._-]+$/,
    "Kode hanya boleh huruf, angka, titik, garis bawah, dan strip.",
    16,
  ),
  name: name("Nama satuan", 60),
  dimension: z.enum(["mass", "volume", "count", "length"], { error: "Dimensi tidak valid." }),
});
export const unitUpdateSchema = z.object({ name: name("Nama satuan", 60) });
export type UnitCreateInput = z.output<typeof unitCreateSchema>;
