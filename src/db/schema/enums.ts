import { pgEnum } from "drizzle-orm/pg-core";

/** Dimensi satuan; dipakai nanti untuk validasi kompatibilitas konversi. */
export const unitDimension = pgEnum("unit_dimension", ["mass", "volume", "count", "length"]);

/**
 * Perlakuan pencatatan kategori (dari dokumen: CAT-A s/d CAT-G).
 * Kategori sendiri tetap data (bisa ditambah), hanya "perlakuan"-nya yang enum.
 */
export const inventoryTreatment = pgEnum("inventory_treatment", [
  "stock_ledger", // CAT-A, CAT-B: stock ledger + pemakaian
  "consumable", // CAT-C: habis pakai operasional
  "resale", // CAT-D: barang dagangan
  "equipment_register", // CAT-E: tahan lama non-aset
  "fixed_asset", // CAT-F: aset tetap / CAPEX
  "quarantine", // CAT-G: karantina / rusak / kedaluwarsa
]);

export const valuationMethod = pgEnum("valuation_method", ["weighted_average", "fifo"]);
