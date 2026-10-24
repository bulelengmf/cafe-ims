import { boolean, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";
import { timestamps } from "./_common";

export const outlets = pgTable("outlets", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
