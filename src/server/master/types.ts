import type { Db } from "../../db/client";

/** Db biasa atau transaksi (agar fungsi yang sama bisa dipakai di tes yang di-rollback). */
export type Executor = Db | Parameters<Parameters<Db["transaction"]>[0]>[0];

export type RawInput = Record<string, string | undefined>;
export type FieldErrors = Record<string, string>;

export type SaveResult =
  { ok: true; id: string } | { ok: false; fieldErrors: FieldErrors; formError?: string };

export type ToggleResult = { ok: true } | { ok: false; code: "not_found" | "has_active_items" };

export const PAGE_SIZE = 25;

export function parsePage(value: string | undefined): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100000 ? n : 1;
}

/** Escape karakter khusus LIKE agar pencarian "50%" tidak menjadi wildcard. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
