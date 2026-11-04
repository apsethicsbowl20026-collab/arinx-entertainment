import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { db } from "@/db";
import { videos, subscriptions, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { contentTypeFor, isRemoteStorage, putMedia } from "@/lib/storage";

export const runtime = "nodejs";
const MAX = Number(process.env.MAX_UPLOAD_BYTES || 200 * 1024 * 1024); // 200MB default
const MAX_LABEL = `${Math.round(MAX / (1024 * 1024))}MB`;

/** Writes to durable object storage when configured, otherwise to ./uploads. */
async function store(name: string, body: Buffer) {
  if (isRemoteStorage()) {
    await putMedia(name, body, contentTypeFor(name));
    return "object storage";
  }
  const dir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), body);
  return "server disk";
}

export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const thumb = form.get("thumbnail") as File | null;
  const title = (form.get("title") as string || "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!file) return NextResponse.json({ error: "No video file selected" }, { status: 400 });

  const okTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
  const okExt = [".mp4", ".mov", ".webm", ".avi"];
  const ext = path.extname(file.name).toLowerCase();
  if (!okTypes.includes(file.type) && !okExt.includes(ext)) {
    return NextResponse.json({ error: "Unsupported format. Use MP4, MOV, WebM or AVI." }, { status: 400 });
  }
  if (file.size > MAX) return NextResponse.json({ error: `File exceeds the ${MAX_LABEL} limit for this deployment. Compress or trim the video.` }, { status: 413 });
  if (file.size === 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });

  const fid = randomUUID();
  const fileName = `${fid}${ext || ".mp4"}`;
  let storedIn: string;
  try {
    storedIn = await store(fileName, Buffer.from(await file.arrayBuffer()));
  } catch (error: any) {
    return NextResponse.json({
      error: `Video upload failed and nothing was published: ${error?.message || "storage error"}. Check your STORAGE_S3_* credentials and retry.`,
    }, { status: 502 });
  }

  let thumbnailUrl = (form.get("thumbnailUrl") as string) || "";
  if (thumb && thumb.size) {
    const te = path.extname(thumb.name).toLowerCase() || ".jpg";
    const tn = `${fid}-thumb${te}`;
    try {
      await store(tn, Buffer.from(await thumb.arrayBuffer()));
      thumbnailUrl = `/api/media/${tn}`;
    } catch {
      // Thumbnail is optional; the video itself stored fine, so publish without it.
      thumbnailUrl = "";
    }
  }

  const durationSec = Math.round(Number(form.get("durationSec") || 0));
  const isShort = form.get("isShort") === "true" || (durationSec > 0 && durationSec <= 60 && form.get("vertical") === "true");
  const [v] = await db.insert(videos).values({
    userId: me.id,
    title,
    description: (form.get("description") as string || "").slice(0, 5000),
    category: (form.get("category") as string || "Entertainment"),
    visibility: (form.get("visibility") as string || "public"),
    sourceType: "upload",
    fileName,
    thumbnailUrl,
    durationSec,
    isShort: !!isShort,
    // ARINX is a streaming platform: uploads are played, not offered as file downloads.
    allowDownload: false,
    status: "ready",
  }).returning();

  const subs = await db.select().from(subscriptions).where(eq(subscriptions.creatorId, me.id));
  for (const s of subs) {
    await db.insert(notifications).values({
      userId: s.followerId,
      actorId: me.id,
      type: "new_video",
      message: `${me.displayName} uploaded “${title}”`,
      videoId: v.id,
    });
  }

  return NextResponse.json({
    video: v,
    storedIn,
    message: `Upload complete. The file is stored in ${storedIn === "object storage" ? "your configured S3-compatible bucket (durable across redeploys)" : "server disk"} and is ready for playback.`,
  });
}
