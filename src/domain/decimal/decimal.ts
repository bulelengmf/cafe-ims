import Decimal from "decimal.js";

/**
 * Aritmetika desimal untuk seluruh perhitungan jumlah, biaya, dan nilai.
 * Aturan: JANGAN memakai `number` JS untuk hitungan stok/uang. Nilai dari/ke database
 * (kolom numeric) berupa string dan dikonversi lewat modul ini.
 *
 * Kebijakan pembulatan: ROUND_HALF_UP (titik tengah dibulatkan menjauhi nol).
 * Dokumen kebutuhan belum menetapkan kebijakan pembulatan; ini asumsi yang terdokumentasi.
 */
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type Dec = Decimal;
export type DecimalInput = string | number | Dec;

export class DecimalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecimalError";
  }
}

/** Membuat Dec. Menolak string kosong, NaN, dan Infinity. Gunakan string untuk nilai desimal. */
export function dec(value: DecimalInput): Dec {
  if (typeof value === "string" && value.trim() === "") {
    throw new DecimalError("Nilai desimal tidak boleh kosong.");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new DecimalError("Nilai desimal harus berupa angka berhingga.");
  }
  let result: Dec;
  try {
    result = new D(value instanceof Decimal ? value.toString() : value);
  } catch {
    throw new DecimalError(`Nilai desimal tidak valid: "${String(value)}".`);
  }
  if (!result.isFinite()) {
    throw new DecimalError(`Nilai desimal tidak valid: "${String(value)}".`);
  }
  return result;
}

export const ZERO: Dec = dec(0);

export function add(a: DecimalInput, b: DecimalInput): Dec {
  return dec(a).plus(dec(b));
}

export function sub(a: DecimalInput, b: DecimalInput): Dec {
  return dec(a).minus(dec(b));
}

export function mul(a: DecimalInput, b: DecimalInput): Dec {
  return dec(a).times(dec(b));
}

/** Pembagian; melempar DecimalError jika pembagi nol (tidak pernah menghasilkan Infinity/NaN). */
export function div(a: DecimalInput, b: DecimalInput): Dec {
  const divisor = dec(b);
  if (divisor.isZero()) throw new DecimalError("Pembagian dengan nol.");
  return dec(a).div(divisor);
}

/** Membulatkan ke `scale` digit di belakang koma (ROUND_HALF_UP). */
export function round(value: DecimalInput, scale: number): Dec {
  assertScale(scale);
  return dec(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_UP);
}

/** -1, 0, atau 1. */
export function compare(a: DecimalInput, b: DecimalInput): -1 | 0 | 1 {
  return dec(a).comparedTo(dec(b)) as -1 | 0 | 1;
}

export const isZero = (v: DecimalInput): boolean => dec(v).isZero();
export const isNegative = (v: DecimalInput): boolean => dec(v).isNegative() && !dec(v).isZero();
export const isPositive = (v: DecimalInput): boolean => dec(v).isPositive() && !dec(v).isZero();

/**
 * String untuk kolom numeric(p, scale): dibulatkan dan selalu bertitik tetap
 * (tanpa notasi ilmiah), mis. toDb("1.005", 2) === "1.01".
 */
export function toDb(value: DecimalInput, scale: number): string {
  assertScale(scale);
  return round(value, scale).toFixed(scale);
}

/** Skala kolom numeric yang dipakai skema saat ini. */
export const SCALE = {
  quantity: 3,
  conversionFactor: 6,
  money: 2,
  unitCost: 4,
} as const;

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < 0 || scale > 20) {
    throw new DecimalError(`Skala tidak valid: ${scale}.`);
  }
}
