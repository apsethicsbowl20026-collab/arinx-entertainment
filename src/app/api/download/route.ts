import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves ARINX source files as downloads.
 *
 * This exists because the front-end source is far too large for a phone
 * clipboard to copy reliably — src/app/page.tsx alone is ~111 KB and gets cut
 * off mid-file. Sending it with Content-Disposition: attachment makes the
 * browser save it to device storage instead of trying to render it.
 *
 * SECURITY: this is a strict allowlist, not a file server. Only presentation
 * files with no secrets in them are listed. Server-only modules are deliberately
 * excluded — most importantly src/lib/admin.ts, which holds the configured owner
 * identity and must never be exposed. The filename is validated and resolved
 * against the allowlist, so path traversal is not possible.
 */
const FILES: Record<string, { rel: string; type: string }> = {
  "page.tsx": { rel: "src/app/page.tsx", type: "text/plain; charset=utf-8" },
  "layout.tsx": { rel: "src/app/layout.tsx", type: "text/plain; charset=utf-8" },
  "globals.css": { rel: "src/app/globals.css", type: "text/css; charset=utf-8" },
  "arinx.html": { rel: "public/arinx.html", type: "text/html; charset=utf-8" },
};

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("file") || "";
  const entry = FILES[name];

  // Reject anything not on the allowlist before touching the filesystem.
  if (!entry) {
    return Response.json(
      { error: "File not available for download.", allowed: Object.keys(FILES) },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Belt and braces: the resolved absolute path must live inside this project
  // and must be exactly the allowlisted file.
  const root = process.cwd();
  const abs = path.resolve(root, entry.rel);
  if (!abs.startsWith(root + path.sep) || path.basename(abs) !== name) {
    return Response.json({ error: "Invalid file path." }, { status: 400 });
  }

  let data: Buffer;
  try {
    data = await fs.readFile(abs);
  } catch {
    return Response.json({ error: "That file is not present on this deployment." }, { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": entry.type,
      "Content-Length": String(data.byteLength),
      // Forces a save-to-device on iOS Safari and Android Chrome.
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
