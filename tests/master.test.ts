import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { itemCategories, items, suppliers, units } from "../src/db/schema";
import { seedReferenceData } from "../src/db/seed-data";
import {
  categoryOptions,
  createCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from "../src/server/master/categories";
import {
  createItem,
  getItem,
  listItems,
  setItemActive,
  updateItem,
} from "../src/server/master/items";
import {
  createSupplier,
  getSupplier,
  listSuppliers,
  setSupplierActive,
  updateSupplier,
} from "../src/server/master/suppliers";
import {
  createUnit,
  listUnits,
  setUnitActive,
  unitOptions,
  updateUnit,
} from "../src/server/master/units";
import { db, expectPg, inRollback, pool, type Tx } from "./rollback";

afterAll(() => pool.end());
beforeAll(async () => {
  await seedReferenceData(db); // idempoten; satu-satunya data yang di-commit
});

async function refs(tx: Tx) {
  const cat = (await tx.select().from(itemCategories).where(eq(itemCategories.code, "CAT-A")))[0];
  const kg = (await tx.select().from(units).where(eq(units.code, "kg")))[0];
  const g = (await tx.select().from(units).where(eq(units.code, "g")))[0];
  if (!cat || !kg || !g) throw new Error("seed referensi tidak lengkap");
  return { cat, kg, g };
}

function itemInput(r: Awaited<ReturnType<typeof refs>>, over: Record<string, string> = {}) {
  return {
    sku: `t-${randomUUID().slice(0, 8)}`,
    name: "Barang Tes",
    categoryId: r.cat.id,
    purchaseUnitId: r.kg.id,
    usageUnitId: r.g.id,
    purchaseToUsageFactor: "1000",
    minStockLevel: "500",
    reorderPoint: "1000",
    ...over,
  };
}

describe("barang", () => {
  it("membuat barang, menyimpan ke database, dan dapat dibaca kembali dengan angka yang tepat", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const res = await createItem(
        tx,
        itemInput(r, {
          sku: "kopi-x1",
          purchaseToUsageFactor: "0,5",
          tracksExpiry: "on",
          storageLocation: " Rak A ",
        }),
      );
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const row = await getItem(tx, res.id);
      expect(row?.sku).toBe("KOPI-X1"); // dinormalkan huruf besar
      expect(row?.purchaseToUsageFactor).toBe("0.500000");
      expect(row?.minStockLevel).toBe("500.000");
      expect(row?.tracksExpiry).toBe(true);
      expect(row?.storageLocation).toBe("Rak A");
      expect(row?.isActive).toBe(true);
    });
  });

  it("menolak SKU ganda (tanpa membedakan huruf besar/kecil) dan referensi tidak valid", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      expect((await createItem(tx, itemInput(r, { sku: "dup-1" }))).ok).toBe(true);
      const dup = await createItem(tx, itemInput(r, { sku: "DUP-1" }));
      expect(dup).toMatchObject({ ok: false, fieldErrors: { sku: "SKU sudah dipakai." } });
      const missing = await createItem(tx, itemInput(r, { categoryId: randomUUID() }));
      expect(missing).toMatchObject({
        ok: false,
        fieldErrors: { categoryId: "Kategori tidak ditemukan." },
      });
      const bad = await createItem(
        tx,
        itemInput(r, { purchaseToUsageFactor: "0", minStockLevel: "-2" }),
      );
      expect(bad.ok).toBe(false);
    });
  });

  it("menolak kategori/satuan nonaktif untuk barang baru", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const newCat = await createCategory(tx, {
        code: "cat-z",
        name: "Kategori Z",
        treatment: "consumable",
        sortOrder: "9",
      });
      expect(newCat.ok).toBe(true);
      if (!newCat.ok) return;
      expect((await setCategoryActive(tx, newCat.id, false)).ok).toBe(true);
      const res = await createItem(tx, itemInput(r, { categoryId: newCat.id }));
      expect(res).toMatchObject({
        ok: false,
        fieldErrors: { categoryId: "Kategori tidak aktif." },
      });
    });
  });

  it("mengubah barang; SKU tetap; boleh mempertahankan kategori yang kini nonaktif, tidak boleh pindah ke yang nonaktif", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const created = await createItem(tx, itemInput(r, { sku: "upd-1" }));
      if (!created.ok) throw new Error("gagal membuat");
      const upd = await updateItem(tx, created.id, {
        ...itemInput(r),
        sku: "IGNORED",
        name: "Nama Baru",
        minStockLevel: "750,5",
      });
      expect(upd.ok).toBe(true);
      const row = await getItem(tx, created.id);
      expect(row).toMatchObject({ sku: "UPD-1", name: "Nama Baru", minStockLevel: "750.500" });

      // kategori lama dinonaktifkan paksa lewat SQL: barang yang sudah memakainya tetap bisa diedit
      await tx
        .update(itemCategories)
        .set({ isActive: false })
        .where(eq(itemCategories.id, r.cat.id));
      expect(
        (await updateItem(tx, created.id, { ...itemInput(r), name: "Masih bisa diedit" })).ok,
      ).toBe(true);

      const other = await createCategory(tx, {
        code: "cat-y",
        name: "Kategori Y",
        treatment: "consumable",
        sortOrder: "9",
      });
      if (!other.ok) throw new Error("gagal");
      await tx
        .update(itemCategories)
        .set({ isActive: false })
        .where(eq(itemCategories.id, other.id));
      const move = await updateItem(tx, created.id, { ...itemInput(r), categoryId: other.id });
      expect(move).toMatchObject({
        ok: false,
        fieldErrors: { categoryId: "Kategori tidak aktif." },
      });
    });
  });

  it("update barang yang tidak ada: pesan jelas, tidak membuat data", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const res = await updateItem(tx, randomUUID(), itemInput(r));
      expect(res).toMatchObject({ ok: false, formError: "Barang tidak ditemukan." });
      expect(await getItem(tx, "bukan-uuid")).toBeNull();
    });
  });

  it("menonaktifkan barang (tanpa hapus): hilang dari daftar aktif, muncul di nonaktif, data tetap ada", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const created = await createItem(tx, itemInput(r, { sku: "off-1", name: "Barang Nonaktif" }));
      if (!created.ok) throw new Error("gagal");
      expect((await setItemActive(tx, created.id, false)).ok).toBe(true);
      const active = await listItems(tx, { q: "Barang Nonaktif" });
      const inactive = await listItems(tx, { q: "Barang Nonaktif", status: "inactive" });
      const all = await listItems(tx, { q: "Barang Nonaktif", status: "all" });
      expect([active.total, inactive.total, all.total]).toEqual([0, 1, 1]);
      expect((await setItemActive(tx, created.id, true)).ok).toBe(true);
      expect((await listItems(tx, { q: "Barang Nonaktif" })).total).toBe(1);
      expect(await setItemActive(tx, randomUUID(), false)).toEqual({
        ok: false,
        code: "not_found",
      });
    });
  });

  it("pencarian: nama/SKU sebagian, tidak peka huruf besar, wildcard LIKE diperlakukan literal", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      for (const [sku, name] of [
        ["s-1", "Gula Pasir 50% Premium"],
        ["s-2", "Susu Segar"],
        ["s-3", "Teh_Hijau"],
      ]) {
        const res = await createItem(tx, itemInput(r, { sku: sku ?? "", name: name ?? "" }));
        expect(res.ok).toBe(true);
      }
      const names = async (q: string) => (await listItems(tx, { q })).rows.map((x) => x.name);
      expect(await names("gula")).toEqual(["Gula Pasir 50% Premium"]);
      expect(await names("S-2")).toEqual(["Susu Segar"]);
      expect(await names("50%")).toEqual(["Gula Pasir 50% Premium"]);
      expect(await names("%")).toEqual(["Gula Pasir 50% Premium"]); // bukan "cocok semua"
      expect(await names("_")).toEqual(["Teh_Hijau"]);
      expect(await names("tidak-ada-xyz")).toEqual([]);
    });
  });

  it("filter kategori dan paginasi (25 per halaman)", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const other = await createCategory(tx, {
        code: "cat-p",
        name: "Paging",
        treatment: "consumable",
        sortOrder: "9",
      });
      if (!other.ok) throw new Error("gagal");
      for (let i = 0; i < 27; i++) {
        const res = await createItem(
          tx,
          itemInput(r, {
            sku: `pg-${String(i).padStart(2, "0")}`,
            name: `Paging ${String(i).padStart(2, "0")}`,
            categoryId: other.id,
          }),
        );
        expect(res.ok).toBe(true);
      }
      const p1 = await listItems(tx, { categoryId: other.id, page: 1 });
      const p2 = await listItems(tx, { categoryId: other.id, page: 2 });
      expect([p1.rows.length, p2.rows.length, p1.total, p1.pageCount]).toEqual([25, 2, 27, 2]);
      expect(p1.rows[0]?.name).toBe("Paging 00");
      expect(p2.rows[0]?.name).toBe("Paging 25");
      expect((await listItems(tx, { categoryId: "bukan-uuid", q: "Paging" })).total).toBe(27); // filter tidak valid diabaikan
    });
  });

  it("database tetap menolak data tidak valid walau validasi aplikasi dilewati", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      await expectPg(tx, "23514", (sp) =>
        sp.insert(items).values({
          sku: "RAW-1",
          name: "x",
          categoryId: r.cat.id,
          purchaseUnitId: r.kg.id,
          usageUnitId: r.g.id,
          purchaseToUsageFactor: "0",
        }),
      );
    });
  });
});

describe("pemasok", () => {
  const base = {
    name: "CV Sumber Rejeki",
    type: "formal",
    phone: "0411-123456",
    leadTimeDays: "3",
    paymentTerms: "Tempo 14 hari",
  };

  it("membuat, membaca kembali, dan mengubah pemasok", async () => {
    await inRollback(async (tx) => {
      const res = await createSupplier(tx, base);
      if (!res.ok) throw new Error(JSON.stringify(res));
      const row = await getSupplier(tx, res.id);
      expect(row).toMatchObject({
        name: "CV Sumber Rejeki",
        type: "formal",
        leadTimeDays: 3,
        isActive: true,
        address: null,
      });
      const upd = await updateSupplier(tx, res.id, {
        ...base,
        name: "CV Sumber Rejeki Baru",
        leadTimeDays: "",
      });
      expect(upd.ok).toBe(true);
      expect(await getSupplier(tx, res.id)).toMatchObject({
        name: "CV Sumber Rejeki Baru",
        leadTimeDays: null,
      });
    });
  });

  it("nama unik tanpa membedakan huruf besar/kecil; boleh menyimpan nama sendiri", async () => {
    await inRollback(async (tx) => {
      const a = await createSupplier(tx, base);
      const b = await createSupplier(tx, { ...base, name: "Pasar Terong", type: "market" });
      if (!a.ok || !b.ok) throw new Error("gagal");
      expect(await createSupplier(tx, { ...base, name: "cv sumber REJEKI" })).toMatchObject({
        ok: false,
        fieldErrors: { name: "Nama pemasok sudah dipakai." },
      });
      expect((await updateSupplier(tx, a.id, base)).ok).toBe(true);
      expect(
        await updateSupplier(tx, b.id, { ...base, name: "CV SUMBER REJEKI", type: "market" }),
      ).toMatchObject({ ok: false });
    });
  });

  it("filter jenis dan status, pencarian, serta nonaktif tanpa hapus", async () => {
    await inRollback(async (tx) => {
      const a = await createSupplier(tx, { ...base, name: "Toko Alfa" });
      const b = await createSupplier(tx, { ...base, name: "Pasar Beta", type: "market" });
      if (!a.ok || !b.ok) throw new Error("gagal");
      expect((await listSuppliers(tx, { type: "market", q: "Beta" })).total).toBe(1);
      expect((await listSuppliers(tx, { q: "toko" })).rows.map((s) => s.name)).toEqual([
        "Toko Alfa",
      ]);
      expect((await setSupplierActive(tx, a.id, false)).ok).toBe(true);
      expect((await listSuppliers(tx, { q: "Alfa" })).total).toBe(0);
      expect((await listSuppliers(tx, { q: "Alfa", status: "inactive" })).total).toBe(1);
    });
  });

  it("database menolak lead time di luar rentang walau validasi dilewati", async () => {
    await inRollback(async (tx) => {
      await expectPg(tx, "23514", (sp) =>
        sp.insert(suppliers).values({ name: "Raw", leadTimeDays: 366 }),
      );
    });
  });
});

describe("kategori dan satuan", () => {
  it("kategori: kode dinormalkan huruf besar, unik, tidak dapat diubah; field lain dapat diubah", async () => {
    await inRollback(async (tx) => {
      const res = await createCategory(tx, {
        code: "cat-h",
        name: "Lain-lain",
        treatment: "consumable",
        tracksStock: "on",
        sortOrder: "8",
      });
      if (!res.ok) throw new Error(JSON.stringify(res));
      expect(
        await createCategory(tx, {
          code: "CAT-H",
          name: "Dup",
          treatment: "consumable",
          sortOrder: "1",
        }),
      ).toMatchObject({ ok: false, fieldErrors: { code: "Kode kategori sudah dipakai." } });
      expect(
        (
          await updateCategory(tx, res.id, {
            code: "HACK",
            name: "Nama Baru",
            treatment: "resale",
            sortOrder: "5",
          })
        ).ok,
      ).toBe(true);
      const row = (await listCategories(tx)).find((c) => c.id === res.id);
      expect(row).toMatchObject({
        code: "CAT-H",
        name: "Nama Baru",
        treatment: "resale",
        tracksStock: false,
        sortOrder: 5,
      });
    });
  });

  it("kategori tidak dapat dinonaktifkan selama masih dipakai barang aktif; bisa setelah barangnya nonaktif", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const cat = await createCategory(tx, {
        code: "cat-q",
        name: "Kategori Q",
        treatment: "consumable",
        sortOrder: "9",
      });
      if (!cat.ok) throw new Error("gagal");
      const item = await createItem(tx, itemInput(r, { categoryId: cat.id }));
      if (!item.ok) throw new Error("gagal");
      expect(await setCategoryActive(tx, cat.id, false)).toEqual({
        ok: false,
        code: "has_active_items",
      });
      expect((await listCategories(tx)).find((c) => c.id === cat.id)?.activeItemCount).toBe(1);
      await setItemActive(tx, item.id, false);
      expect((await setCategoryActive(tx, cat.id, false)).ok).toBe(true);
      expect((await categoryOptions(tx)).some((c) => c.id === cat.id)).toBe(false);
      expect((await categoryOptions(tx, cat.id)).some((c) => c.id === cat.id)).toBe(true); // tetap tampil bila sedang dipakai
      expect((await setCategoryActive(tx, cat.id, true)).ok).toBe(true);
    });
  });

  it("satuan: kode dinormalkan huruf kecil, unik; hanya nama yang dapat diubah", async () => {
    await inRollback(async (tx) => {
      const res = await createUnit(tx, { code: "LUSIN", name: "Lusin", dimension: "count" });
      if (!res.ok) throw new Error(JSON.stringify(res));
      expect(
        await createUnit(tx, { code: "lusin", name: "Dup", dimension: "count" }),
      ).toMatchObject({ ok: false, fieldErrors: { code: "Kode satuan sudah dipakai." } });
      expect(
        (await updateUnit(tx, res.id, { name: "Lusin (12)", code: "hack", dimension: "mass" })).ok,
      ).toBe(true);
      expect((await listUnits(tx)).find((u) => u.id === res.id)).toMatchObject({
        code: "lusin",
        name: "Lusin (12)",
        dimension: "count",
      });
    });
  });

  it("satuan tidak dapat dinonaktifkan selama dipakai barang aktif (satuan beli maupun pakai)", async () => {
    await inRollback(async (tx) => {
      const r = await refs(tx);
      const unit = await createUnit(tx, { code: "ikat", name: "Ikat", dimension: "count" });
      if (!unit.ok) throw new Error("gagal");
      const item = await createItem(tx, itemInput(r, { purchaseUnitId: unit.id }));
      if (!item.ok) throw new Error("gagal");
      expect(await setUnitActive(tx, unit.id, false)).toEqual({
        ok: false,
        code: "has_active_items",
      });
      // satu barang memakai satuan yang sama sebagai satuan beli dan pakai tetap dihitung 1
      const same = await createItem(
        tx,
        itemInput(r, { purchaseUnitId: unit.id, usageUnitId: unit.id }),
      );
      expect(same.ok).toBe(true);
      expect((await listUnits(tx)).find((u) => u.id === unit.id)?.activeItemCount).toBe(2);
      if (same.ok) await setItemActive(tx, same.id, false);
      await setItemActive(tx, item.id, false);
      expect((await setUnitActive(tx, unit.id, false)).ok).toBe(true);
      expect((await unitOptions(tx)).some((u) => u.id === unit.id)).toBe(false);
      expect((await unitOptions(tx, [unit.id])).some((u) => u.id === unit.id)).toBe(true);
      const res = await createItem(tx, itemInput(r, { usageUnitId: unit.id }));
      expect(res).toMatchObject({ ok: false, fieldErrors: { usageUnitId: "Satuan tidak aktif." } });
    });
  });
});

describe("kebersihan data tes", () => {
  it("tidak ada barang/pemasok tes yang tersisa (semua di-rollback)", async () => {
    expect((await db.select().from(items)).length).toBe(3); // hanya 3 barang contoh dari seed
    expect((await db.select().from(suppliers)).length).toBe(0);
  });
});
