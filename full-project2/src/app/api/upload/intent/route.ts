import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { contentTypeFor, isRemoteStorage, presignedPutUrl } from "@/lib/storage";

export const runtime = "nodejs";

const MAX = Number(process.env.MAX_UPLOAD_BYTES || 200 * 1024 * 1024);
const MAX_LABEL = `${Math.round(MAX / (1024 * 1024))}MB`;
const OK_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"];
const OK_EXT = [".mp4", ".mov", ".webm", ".avi"];

/**
 * Step 1 of the two-step upload used when durable object storage is configured.
 *
 * The request body is small JSON (metadata only), so it stays far below the
 * 6 MB payload cap that Netlify/AWS Lambda impose. The actual video bytes never
 * touch the serverless function — the browser PUTs them straight to the bucket
 * using the signed URL returned here.
 */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in to upload" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const fileName = String(body.fileName || "");
  const size = Number(body.size || 0);
  const title = String(body.title || "").trim();
  const ext = path.extname(fileName).toLowerCase();
  const mime = String(body.type || "");

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!fileName) return NextResponse.json({ error: "No video file selected" }, { status: 400 });
  if (!OK_TYPES.includes(mime) && !OK_EXT.includes(ext)) {
    return NextResponse.json({ error: "Unsupported format. Use MP4, MOV, WebM or AVI." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (size > MAX) return NextResponse.json({ error: `File exceeds the ${MAX_LABEL} limit for this deployment.` }, { status: 413 });

  // No bucket configured (e.g. this sandbox using local disk): tell the client to
  // use the classic multipart POST, which works fine on a long-lived server.
  if (!isRemoteStorage()) {
    return NextResponse.json({ mode: "direct", maxBytes: MAX });
  }

  const key = `${randomUUID()}${ext || ".mp4"}`;
  const contentType = mime && mime.startsWith("video/") ? mime : contentTypeFor(key);
  const uploadUrl = await presignedPutUrl(key, contentType);
  if (!uploadUrl) return NextResponse.json({ error: "Could not create an upload URL. Check STORAGE_S3_* credentials." }, { status: 502 });

  // Optional thumbnail gets its own signed PUT so it also bypasses the payload cap.
  let thumbnailKey = "";
  let thumbnailUploadUrl: string | null = null;
  let thumbnailContentType = "";
  if (body.hasThumbnail) {
    thumbnailKey = `${randomUUID()}-thumb.jpg`;
    thumbnailContentType = "image/jpeg";
    thumbnailUploadUrl = await presignedPutUrl(thumbnailKey, thumbnailContentType);
  }

  const durationSec = Math.round(Number(body.durationSec || 0));
  const isShort = body.isShort === true || (durationSec > 0 && durationSec <= 60 && body.vertical === true);

  // Row is created as "processing" so nothing is ever presented as published
  // before the bytes are confirmed present in the bucket.
  const [v] = await db.insert(videos).values({
    userId: me.id,
    title,
    description: String(body.description || "").slice(0, 5000),
    category: String(body.category || "Entertainment"),
    visibility: ["public", "unlisted", "private"].includes(String(body.visibility)) ? String(body.visibility) : "public",
    sourceType: "upload",
    fileName: key,
    thumbnailUrl: thumbnailKey ? `/api/media/${thumbnailKey}` : "",
    durationSec,
    isShort: !!isShort,
    // ARINX is a streaming platform: uploads are played, not offered as file downloads.
    allowDownload: false,
    status: "processing",
  }).returning();

  return NextResponse.json({
    mode: "presigned",
    videoId: v.id,
    key,
    uploadUrl,
    contentType,
    thumbnailKey,
    thumbnailUploadUrl,
    thumbnailContentType,
    maxBytes: MAX,
    message: "Signed upload URL issued. Upload the file directly to the bucket, then confirm.",
  });
}
