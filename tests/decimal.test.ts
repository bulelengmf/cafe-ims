import { describe, expect, it } from "vitest";
import {
  DecimalError,
  SCALE,
  add,
  compare,
  dec,
  div,
  isNegative,
  isPositive,
  isZero,
  mul,
  round,
  sub,
  toDb,
} from "../src/domain/decimal";

describe("aritmetika desimal", () => {
  it("tidak memiliki galat float: 0.1 + 0.2 = 0.3 persis", () => {
    expect(add("0.1", "0.2").toString()).toBe("0.3");
    expect(0.1 + 0.2).not.toBe(0.3); // bukti bahwa Number memang bermasalah
  });

  it("tepat pada angka di luar presisi float (> 2^53)", () => {
    expect(add("9007199254740993", "1").toString()).toBe("9007199254740994");
  });

  it("sub dan mul tepat untuk pecahan", () => {
    expect(sub("1", "0.9").toString()).toBe("0.1");
    expect(mul("0.333333", "3").toString()).toBe("0.999999");
  });

  it("mendukung nilai negatif", () => {
    expect(add("-5", "2").toString()).toBe("-3");
    expect(isNegative("-0.001")).toBe(true);
    expect(isNegative("0")).toBe(false);
    expect(isPositive("0")).toBe(false);
  });
});

describe("pembagian", () => {
  it("membagi dengan presisi tinggi", () => {
    expect(round(div("1", "3"), 6).toString()).toBe("0.333333");
  });

  it("menolak pembagian dengan nol, termasuk '0.000'", () => {
    expect(() => div("5", "0")).toThrow(DecimalError);
    expect(() => div("5", "0.000")).toThrow(/nol/);
    expect(div("0", "5").toString()).toBe("0");
  });
});

describe("pembulatan dan format database", () => {
  it("ROUND_HALF_UP pada titik tengah (positif dan negatif menjauhi nol)", () => {
    expect(toDb("1.005", 2)).toBe("1.01");
    expect(toDb("2.5", 0)).toBe("3");
    expect(toDb("-2.5", 0)).toBe("-3");
    expect(toDb("1.004", 2)).toBe("1.00");
  });

  it("selalu bertitik tetap sesuai skala kolom, tanpa notasi ilmiah", () => {
    expect(toDb("5", SCALE.quantity)).toBe("5.000");
    expect(toDb("0.0000001", SCALE.unitCost)).toBe("0.0000");
    expect(toDb("1e21", 0)).toBe("1000000000000000000000");
  });

  it("round-trip string numeric database tidak berubah", () => {
    expect(toDb(dec("12345.678"), SCALE.quantity)).toBe("12345.678");
    expect(toDb(dec("0.333333"), SCALE.conversionFactor)).toBe("0.333333");
  });

  it("menolak skala tidak valid", () => {
    expect(() => round("1", -1)).toThrow(DecimalError);
    expect(() => round("1", 1.5)).toThrow(DecimalError);
    expect(() => toDb("1", 99)).toThrow(DecimalError);
  });
});

describe("perbandingan dan validasi input", () => {
  it("compare dan isZero memperlakukan '0.00' sama dengan nol", () => {
    expect(compare("1.10", "1.1")).toBe(0);
    expect(compare("1", "2")).toBe(-1);
    expect(compare("3", "2")).toBe(1);
    expect(isZero("0.000")).toBe(true);
  });

  it("menolak input tidak valid", () => {
    for (const bad of [
      "",
      "  ",
      "abc",
      "1,5",
      "NaN",
      "Infinity",
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(() => dec(bad), String(bad)).toThrow(DecimalError);
    }
  });
});
