import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { contentTypeFor, isRemoteStorage, signedMediaUrl } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = path.basename(name);
  if (!safe || safe === "." || safe === "..") return new Response("Not found", { status: 404 });

  // Durable object storage (Cloudflare R2 / S3 / Supabase Storage / MinIO).
  // Redirect to a short-lived signed URL so the bucket/CDN serves the bytes and
  // honours HTTP Range requests needed for video seeking.
  if (isRemoteStorage()) {
    const url = await signedMediaUrl(safe);
    if (url) {
      return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, max-age=300" } });
    }
  }

  // Local disk fallback (this sandbox / a single long-lived server).
  const file = path.join(process.cwd(), "uploads", safe);
  if (!fs.existsSync(file)) return new Response("Not found", { status: 404 });
  const stat = fs.statSync(file);
  const type = contentTypeFor(safe);
  const range = req.headers.get("range");
  if (range) {
    const [s, e] = range.replace("bytes=", "").split("-");
    const start = parseInt(s, 10);
    const end = e ? parseInt(e, 10) : stat.size - 1;
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream as any, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(end - start + 1),
        "Content-Type": type,
        // inline => play in the player, never trigger a save dialog.
        "Content-Disposition": `inline; filename="${safe}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }
  const stream = fs.createReadStream(file);
  return new Response(stream as any, {
    headers: {
      "Content-Length": String(stat.size),
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Content-Disposition": `inline; filename="${safe}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
