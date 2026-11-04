import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { videos, subscriptions, notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { currentUser } from "@/lib/auth";
import { isRemoteStorage, objectExists, deleteMedia } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Step 2 of the two-step upload. Verifies the file really landed in the bucket
 * before the video is marked ready and subscribers are notified. If the object
 * is missing, the record stays failed and is never shown as published.
 */
export async function POST(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!isRemoteStorage()) return NextResponse.json({ error: "This deployment uses direct uploads; nothing to confirm." }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }); }

  const videoId = String(body.videoId || "");
  const [v] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!v) return NextResponse.json({ error: "Upload record not found" }, { status: 404 });
  if (v.userId !== me.id) return NextResponse.json({ error: "Only the uploader can confirm this video" }, { status: 403 });
  if (v.status === "ready") return NextResponse.json({ video: v, message: "Already published." });

  const exists = await objectExists(v.fileName);
  if (!exists) {
    return NextResponse.json({
      error: "The video file was not found in storage, so nothing was published. Retry the upload — no failed video was created.",
    }, { status: 422 });
  }

  const [updated] = await db.update(videos).set({ status: "ready" }).where(eq(videos.id, videoId)).returning();

  const subs = await db.select().from(subscriptions).where(eq(subscriptions.creatorId, me.id));
  for (const s of subs) {
    await db.insert(notifications).values({
      userId: s.followerId,
      actorId: me.id,
      type: "new_video",
      message: `${me.displayName} uploaded “${v.title}”`,
      videoId: v.id,
    });
  }

  return NextResponse.json({
    video: updated,
    message: "Upload verified in object storage and published.",
  });
}

/** Cancels an abandoned two-step upload and cleans up any partial object. */
export async function DELETE(req: NextRequest) {
  const me = await currentUser();
  if (!me) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const videoId = req.nextUrl.searchParams.get("videoId") || "";
  const [v] = await db.select().from(videos).where(eq(videos.id, videoId));
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (v.userId !== me.id) return NextResponse.json({ error: "Not your upload" }, { status: 403 });
  if (v.status === "ready") return NextResponse.json({ error: "Video is already published; delete it from Studio instead." }, { status: 409 });

  await deleteMedia(v.fileName);
  await db.delete(videos).where(eq(videos.id, videoId));
  return NextResponse.json({ ok: true, message: "Abandoned upload discarded." });
}
