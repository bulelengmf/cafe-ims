import "dotenv/config";
import { createDb } from "./client";
import { seedReferenceData } from "./seed-data";
import { parseEnv } from "../lib/env";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed data demo dilarang dijalankan di production.");
  }
  const { DATABASE_URL } = parseEnv();
  const { db, pool } = createDb(DATABASE_URL);
  try {
    await seedReferenceData(db);
    console.log("Seed referensi (peran, kategori, satuan, outlet, 3 barang contoh) selesai.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
