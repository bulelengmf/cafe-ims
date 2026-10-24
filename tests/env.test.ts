import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/lib/env";

describe("parseEnv", () => {
  it("menerima DATABASE_URL postgres yang valid", () => {
    expect(parseEnv({ DATABASE_URL: "postgres://u:p@localhost:5432/db" }).DATABASE_URL).toContain(
      "postgres://",
    );
  });
  it("menolak nilai kosong atau skema salah", () => {
    expect(() => parseEnv({})).toThrow(/tidak valid/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://x" })).toThrow(/postgres/);
  });
});
