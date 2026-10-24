import { defineConfig } from "vitest/config";
import path from "node:path";

/** Hanya tes murni: tanpa globalSetup, tanpa .env, tidak menyentuh database. */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { include: ["tests/unit/**/*.test.ts", "tests/decimal.test.ts", "tests/env.test.ts"] },
});
