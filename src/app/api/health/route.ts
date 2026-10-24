import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ status: "ok", database: "up" });
  } catch {
    // Jangan bocorkan detail koneksi/kredensial ke klien.
    return NextResponse.json({ status: "error", database: "down" }, { status: 503 });
  }
}
