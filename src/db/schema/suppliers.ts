import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./_common";

/** formal = punya invoice/PO; market = pembelian langsung di pasar (nota sederhana). */
export const supplierType = pgEnum("supplier_type", ["formal", "market"]);

export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    type: supplierType("type").notNull().default("formal"),
    contactPerson: varchar("contact_person", { length: 120 }),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    /** Teks bebas, mis. "Tempo 14 hari". Belum dipakai untuk perhitungan. */
    paymentTerms: varchar("payment_terms", { length: 120 }),
    leadTimeDays: integer("lead_time_days"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("suppliers_name_lower_uq").on(sql`lower(${t.name})`),
    check(
      "suppliers_lead_time_range",
      sql`${t.leadTimeDays} IS NULL OR (${t.leadTimeDays} >= 0 AND ${t.leadTimeDays} <= 365)`,
    ),
  ],
);
