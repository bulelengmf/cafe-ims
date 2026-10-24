import { describe, expect, it } from "vitest";
import { trimDecimal } from "../../src/lib/format";
import { likePattern, parsePage } from "../../src/server/master/types";
import {
  categoryCreateSchema,
  itemSchema,
  parseDecimalInput,
  runSchema,
  supplierSchema,
  unitCreateSchema,
} from "../../src/server/master/validation";

const UUID = "3f2b8c1e-9a4d-4e6b-8c5a-1d2e3f4a5b6c";
const validItem = {
  sku: "kopi-001",
  name: "Biji Kopi",
  categoryId: UUID,
  purchaseUnitId: UUID,
  usageUnitId: UUID,
  purchaseToUsageFactor: "1000",
  minStockLevel: "2000",
  reorderPoint: "4000",
};

describe("parseDecimalInput", () => {
  const o = { scale: 3 };
  it("menerima titik atau koma sebagai desimal dan menormalkan ke skala kolom", () => {
    expect(parseDecimalInput("12.5", o)).toEqual({ ok: true, value: "12.500" });
    expect(parseDecimalInput("12,5", o)).toEqual({ ok: true, value: "12.500" });
    expect(parseDecimalInput(" 0 ", o)).toEqual({ ok: true, value: "0.000" });
  });
  it("menolak pemisah ribuan, negatif, huruf, kosong, dan notasi ilmiah", () => {
    for (const bad of ["1.000,5", "1,000.5", "-1", "abc", "", "  ", "1e3", "1 000", "+5", ".5"]) {
      expect(parseDecimalInput(bad, o).ok, bad).toBe(false);
    }
  });
  it("menolak presisi berlebih tanpa membulatkan diam-diam", () => {
    expect(parseDecimalInput("1.0005", o).ok).toBe(false);
    expect(parseDecimalInput("1.0000", o)).toEqual({ ok: true, value: "1.000" });
  });
  it("batas: positif dan minimum; maksimal 12 digit sebelum desimal", () => {
    expect(parseDecimalInput("0", { scale: 6, positive: true }).ok).toBe(false);
    expect(parseDecimalInput("0.000001", { scale: 6, positive: true }).ok).toBe(true);
    expect(parseDecimalInput("1234567890123", o).ok).toBe(false);
    expect(parseDecimalInput("123456789012", o).ok).toBe(true);
  });
});

describe("skema barang", () => {
  it("menerima data valid dan menormalkan angka; checkbox tidak dicentang = false", () => {
    const r = runSchema(itemSchema, validItem);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.purchaseToUsageFactor).toBe("1000.000000");
      expect(r.value.minStockLevel).toBe("2000.000");
      expect(r.value.tracksExpiry).toBe(false);
      expect(r.value.description).toBeNull();
    }
  });
  it("checkbox 'on' menjadi true", () => {
    const r = runSchema(itemSchema, { ...validItem, tracksExpiry: "on" });
    expect(r.ok && r.value.tracksExpiry).toBe(true);
  });
  it("memberi pesan per field untuk input salah", () => {
    const r = runSchema(itemSchema, {
      ...validItem,
      sku: "a b",
      name: "x",
      categoryId: "",
      purchaseToUsageFactor: "0",
      minStockLevel: "-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.fieldErrors).sort()).toEqual([
        "categoryId",
        "minStockLevel",
        "name",
        "purchaseToUsageFactor",
        "sku",
      ]);
    }
  });
  it("field yang tidak dikirim ditolak, bukan error tak terduga", () => {
    expect(runSchema(itemSchema, {}).ok).toBe(false);
  });
});

describe("skema pemasok, kategori, satuan", () => {
  it("pemasok: opsional kosong menjadi null; telepon dan lead time divalidasi", () => {
    const ok = runSchema(supplierSchema, {
      name: "CV Maju",
      type: "formal",
      phone: "",
      leadTimeDays: "",
    });
    expect(ok.ok && ok.value.phone).toBeNull();
    expect(ok.ok && ok.value.leadTimeDays).toBeNull();
    const bad = runSchema(supplierSchema, {
      name: "CV Maju",
      type: "x",
      phone: "abc",
      leadTimeDays: "400",
    });
    expect(!bad.ok && Object.keys(bad.fieldErrors).sort()).toEqual([
      "leadTimeDays",
      "phone",
      "type",
    ]);
    const days = runSchema(supplierSchema, { name: "CV Maju", type: "market", leadTimeDays: "14" });
    expect(days.ok && days.value.leadTimeDays).toBe(14);
  });
  it("kategori: kode, perlakuan, urutan", () => {
    const ok = runSchema(categoryCreateSchema, {
      code: "CAT-H",
      name: "Lainnya",
      treatment: "consumable",
      sortOrder: "8",
    });
    expect(ok.ok && ok.value.sortOrder).toBe(8);
    expect(
      runSchema(categoryCreateSchema, {
        code: "CAT H",
        name: "Lainnya",
        treatment: "x",
        sortOrder: "a",
      }).ok,
    ).toBe(false);
  });
  it("satuan: kode dan dimensi", () => {
    expect(
      runSchema(unitCreateSchema, { code: "lusin", name: "Lusin", dimension: "count" }).ok,
    ).toBe(true);
    expect(runSchema(unitCreateSchema, { code: "l u", name: "Lusin", dimension: "berat" }).ok).toBe(
      false,
    );
  });
});

describe("helper", () => {
  it("trimDecimal", () => {
    expect(trimDecimal("1000.000")).toBe("1000");
    expect(trimDecimal("12.500")).toBe("12.5");
    expect(trimDecimal("0.000001")).toBe("0.000001");
    expect(trimDecimal("100")).toBe("100");
    expect(trimDecimal(null)).toBe("");
  });
  it("likePattern meng-escape wildcard; parsePage aman", () => {
    expect(likePattern("50%_a\\")).toBe("%50\\%\\_a\\\\%");
    expect([
      parsePage("3"),
      parsePage("0"),
      parsePage("abc"),
      parsePage(undefined),
      parsePage("2.5"),
    ]).toEqual([3, 1, 1, 1, 1]);
  });
});
