import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL wajib diisi")
    .refine((v) => /^postgres(ql)?:\/\//.test(v), "DATABASE_URL harus diawali postgres://"),
});

export type Env = z.infer<typeof schema>;

/** Validasi environment variables; melempar error yang jelas bila ada yang salah. */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = schema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Konfigurasi environment tidak valid: ${detail}`);
  }
  return result.data;
}
