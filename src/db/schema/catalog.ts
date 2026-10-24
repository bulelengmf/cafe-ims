import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./_common";
import { inventoryTreatment, unitDimension, valuationMethod } from "./enums";
import { users } from "./auth";

export const itemCategories = pgTable("item_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).notNull().unique(), // mis. CAT-A
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  treatment: inventoryTreatment("treatment").notNull(),
  /** Apakah barang kategori ini tercatat di stock ledger. */
  tracksStock: boolean("tracks_stock").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const units = pgTable("units", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 16 }).notNull().unique(), // mis. "kg", "ml", "dus"
  name: varchar("name", { length: 60 }).notNull(),
  dimension: unitDimension("dimension").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/**
 * Master barang (global; stok per outlet ada di ledger tahap berikutnya).
 * Item yang sudah punya transaksi tidak boleh dihapus: FK dari tabel transaksi
 * memakai RESTRICT, dan item hanya dinonaktifkan lewat is_active.
 */
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: varchar("sku", { length: 40 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => itemCategories.id, { onDelete: "restrict" }),
    purchaseUnitId: uuid("purchase_unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    usageUnitId: uuid("usage_unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "restrict" }),
    /** 1 satuan beli = N satuan pakai. Tiap transaksi kelak menyimpan salinan faktor ini. */
    purchaseToUsageFactor: numeric("purchase_to_usage_factor", { precision: 18, scale: 6 })
      .notNull()
      .default("1"),
    /** Dalam satuan pakai. */
    minStockLevel: numeric("min_stock_level", { precision: 18, scale: 3 }).notNull().default("0"),
    reorderPoint: numeric("reorder_point", { precision: 18, scale: 3 }).notNull().default("0"),
    valuationMethod: valuationMethod("valuation_method").notNull().default("weighted_average"),
    tracksExpiry: boolean("tracks_expiry").notNull().default(false),
    storageLocation: varchar("storage_location", { length: 80 }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (t) => [
    index("items_category_idx").on(t.categoryId),
    index("items_name_idx").on(t.name),
    check("items_factor_positive", sql`${t.purchaseToUsageFactor} > 0`),
    check("items_min_stock_nonneg", sql`${t.minStockLevel} >= 0`),
    check("items_reorder_nonneg", sql`${t.reorderPoint} >= 0`),
  ],
);
