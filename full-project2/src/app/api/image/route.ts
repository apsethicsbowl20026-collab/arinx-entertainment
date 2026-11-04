import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { currentUser } from "@/lib/auth";
import { contentTypeFor, isRemoteStorage, putMedia } from "@/lib/storage";

export const runtime = "nodejs";
const MAX = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No image" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Image must be under 5MB" }, { status: 413 });
  if (file.size === 0) return NextResponse.json({ error: "Image is empty" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const name = `${randomUUID()}${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  try {
    if (isRemoteStorage()) {
      await putMedia(name, body, contentTypeFor(name));
    } else {
      const dir = path.join(process.cwd(), "uploads");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, name), body);
    }
  } catch (error: any) {
    return NextResponse.json({ error: `Image upload failed: ${error?.message || "storage error"}` }, { status: 502 });
  }
  return NextResponse.json({ url: `/api/media/${name}` });
}
