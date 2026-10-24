/** Mengambil kode error PostgreSQL (mis. 23505 = unique violation) dari error Drizzle/pg. */
export function pgErrorCode(err: unknown): string | undefined {
  let e: unknown = err;
  while (e && typeof e === "object") {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
    e = (e as { cause?: unknown }).cause;
  }
  return undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
