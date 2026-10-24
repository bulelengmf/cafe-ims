import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { itemCategories, items, outlets, roles, units, userRoles, users } from "../src/db/schema";
import { seedReferenceData } from "../src/db/seed-data";
import { pgCode, testDb } from "./helpers";

const { db, pool } = testDb();
afterAll(() => pool.end());

describe("seed referensi", () => {
  it("terisi sesuai dokumen dan idempotent (dijalankan 2x tanpa duplikasi)", async () => {
    await seedReferenceData(db);
    await seedReferenceData(db);
    expect((await db.select().from(roles)).length).toBe(5);
    expect((await db.select().from(itemCategories)).length).toBe(7);
    expect((await db.select().from(units)).length).toBe(8);
    expect((await db.select().from(outlets)).length).toBe(1);
    expect((await db.select().from(items)).length).toBe(3);
  });

  it("CAT-F dan CAT-E tidak masuk stock ledger", async () => {
    const rows = await db.select().from(itemCategories);
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(byCode["CAT-F"]?.tracksStock).toBe(false);
    expect(byCode["CAT-F"]?.treatment).toBe("fixed_asset");
    expect(byCode["CAT-A"]?.tracksStock).toBe(true);
  });
});

describe("constraint tabel items", () => {
  let categoryId = "";
  let kg = "";
  let g = "";
  beforeAll(async () => {
    categoryId = (
      await db.select().from(itemCategories).where(eq(itemCategories.code, "CAT-A"))
    )[0]!.id;
    kg = (await db.select().from(units).where(eq(units.code, "kg")))[0]!.id;
    g = (await db.select().from(units).where(eq(units.code, "g")))[0]!.id;
  });
  const base = () => ({ categoryId, purchaseUnitId: kg, usageUnitId: g });

  it("menolak SKU duplikat (23505)", async () => {
    await db.insert(items).values({ ...base(), sku: "T-DUP", name: "A" });
    const err = await db
      .insert(items)
      .values({ ...base(), sku: "T-DUP", name: "B" })
      .catch((e) => e);
    expect(pgCode(err)).toBe("23505");
  });

  it("menolak faktor konversi <= 0 (23514)", async () => {
    for (const f of ["0", "-1"]) {
      const err = await db
        .insert(items)
        .values({ ...base(), sku: `T-F${f}`, name: "x", purchaseToUsageFactor: f })
        .catch((e) => e);
      expect(pgCode(err)).toBe("23514");
    }
  });

  it("menolak stok minimum negatif (23514)", async () => {
    const err = await db
      .insert(items)
      .values({ ...base(), sku: "T-NEG", name: "x", minStockLevel: "-1" })
      .catch((e) => e);
    expect(pgCode(err)).toBe("23514");
  });

  it("menyimpan desimal tanpa pembulatan float", async () => {
    await db.insert(items).values({
      ...base(),
      sku: "T-DEC",
      name: "d",
      purchaseToUsageFactor: "0.333333",
      minStockLevel: "1.125",
    });
    const row = (await db.select().from(items).where(eq(items.sku, "T-DEC")))[0]!;
    expect(row.purchaseToUsageFactor).toBe("0.333333");
    expect(row.minStockLevel).toBe("1.125");
  });

  it("menolak FK tidak valid dan menolak hapus kategori/satuan yang dipakai (23503)", async () => {
    const bad = await db
      .insert(items)
      .values({
        ...base(),
        categoryId: "00000000-0000-0000-0000-000000000000",
        sku: "T-FK",
        name: "x",
      })
      .catch((e) => e);
    expect(pgCode(bad)).toBe("23503");
    const delCat = await db
      .delete(itemCategories)
      .where(eq(itemCategories.id, categoryId))
      .catch((e) => e);
    expect(pgCode(delCat)).toBe("23503");
    const delUnit = await db
      .delete(units)
      .where(eq(units.id, kg))
      .catch((e) => e);
    expect(pgCode(delUnit)).toBe("23503");
  });
});

describe("users & roles", () => {
  it("email unik tanpa membedakan huruf besar/kecil (23505)", async () => {
    await db.insert(users).values({ email: "Ani@Example.com", fullName: "Ani", passwordHash: "x" });
    const err = await db
      .insert(users)
      .values({ email: "ani@example.COM", fullName: "Ani 2", passwordHash: "x" })
      .catch((e) => e);
    expect(pgCode(err)).toBe("23505");
  });

  it("satu user dapat merangkap beberapa peran, tetapi tidak boleh peran ganda yang sama", async () => {
    const u = (
      await db
        .insert(users)
        .values({ email: "dua@example.com", fullName: "Dua Peran", passwordHash: "x" })
        .returning()
    )[0]!;
    const outlet = (await db.select().from(outlets))[0]!;
    const rs = await db.select().from(roles);
    const barista = rs.find((r) => r.code === "barista")!;
    const receiving = rs.find((r) => r.code === "receiving_staff")!;
    await db.insert(userRoles).values([
      { userId: u.id, roleId: barista.id, outletId: outlet.id },
      { userId: u.id, roleId: receiving.id, outletId: outlet.id },
    ]);
    const dup = await db
      .insert(userRoles)
      .values({ userId: u.id, roleId: barista.id, outletId: outlet.id })
      .catch((e) => e);
    expect(pgCode(dup)).toBe("23505");
    const del = await db
      .delete(users)
      .where(eq(users.id, u.id))
      .catch((e) => e);
    expect(pgCode(del)).toBe("23503"); // user yang punya peran tidak bisa dihapus
  });

  it("kode outlet unik", async () => {
    const err = await db
      .insert(outlets)
      .values({ code: "MAIN", name: "Dup" })
      .catch((e) => e);
    expect(pgCode(err)).toBe("23505");
  });
});

describe("migrasi", () => {
  it("memakai gen_random_uuid() bawaan (tanpa ekstensi)", async () => {
    const r = await db.execute(
      sql`select count(*)::int as n from pg_extension where extname not in ('plpgsql')`,
    );
    expect((r.rows[0] as { n: number }).n).toBe(0);
  });
});
