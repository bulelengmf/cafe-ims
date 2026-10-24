import { timestamp } from "drizzle-orm/pg-core";

/** Kolom waktu standar. updated_at diisi aplikasi lewat $onUpdate (bukan trigger DB). */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
