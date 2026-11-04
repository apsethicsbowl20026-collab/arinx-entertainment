import { db } from "@/db";
import { sql } from "drizzle-orm";
import { isRemoteStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      app: "ARINX",
      mediaStorage: isRemoteStorage() ? "s3-compatible (durable)" : "local disk",
      database: "connected",
    });
  } catch {
    return Response.json({ ok: false, app: "ARINX", database: "unreachable" }, { status: 500 });
  }
}
