import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminLogs, comments, liveStreams, playlists, posts, reports, sessions, users, videos } from "@/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { currentUser, publicUser } from "@/lib/auth";
import { isOwner, isOwnerEmail, isStaff } from "@/lib/admin";
import fs from "fs";
import path from "path";
import { deleteMedia, isRemoteStorage } from "@/lib/storage";

async function staff() {
  const me = await currentUser();
  if (!me) return { error: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (!isStaff(me)) return { error: NextResponse.json({ error: "Admin only" }, { status: 403 }) };
  return { me };
}

/** Removes a stored media file from object storage or local disk. */
async function removeStoredMedia(fileName?: string | null) {
  if (!fileName) return;
  if (isRemoteStorage()) await deleteMedia(fileName);
  else { try { fs.unlinkSync(path.join(process.cwd(), "uploads", fileName)); } catch {} }
}

async function log(actorId: string, action: string, targetType = "", targetId = "", detail = "") {
  await db.insert(adminLogs).values({ actorId, action, targetType, targetId, detail: detail.slice(0, 1000) });
}

export async function GET(req: NextRequest) {
  const auth = await staff();
  if (auth.error) return auth.error;
  const me = auth.me!;
  const what = req.nextUrl.searchParams.get("what") || "overview";
  if (what === "overview") {
    const [userCount] = await db.select({ c: count() }).from(users);
    const [videoCount] = await db.select({ c: count() }).from(videos);
    const [reportCount] = await db.select({ c: count() }).from(reports);
    const [commentCount] = await db.select({ c: count() }).from(comments);
    const allUsers = await db.select({ status: users.status, role: users.role }).from(users);
    const allVideos = await db.select({ sourceType: videos.sourceType, visibility: videos.visibility, views: videos.views }).from(videos);
    return NextResponse.json({
      // Owner identity is intentionally not returned; the console derives it from
      // each account's role so the owner address is never exposed in any payload.
      ownerCount: allUsers.filter((u) => u.role === "owner").length,
      stats: {
        users: Number(userCount.c),
        admins: allUsers.filter((u) => u.role === "admin" || u.role === "owner").length,
        suspended: allUsers.filter((u) => u.status === "suspended").length,
        videos: Number(videoCount.c),
        uploads: allVideos.filter((v) => v.sourceType === "upload").length,
        commons: allVideos.filter((v) => v.sourceType === "commons").length,
        privateVideos: allVideos.filter((v) => v.visibility === "private").length,
        comments: Number(commentCount.c),
        reports: Number(reportCount.c),
        views: allVideos.reduce((sum, v) => sum + Number(v.views || 0), 0),
      },
    });
  }
  if (what === "users") {
    if (!isOwner(me)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
    const rows = await db.select().from(users).orderBy(desc(users.createdAt));
    return NextResponse.json({ users: rows.map((u) => publicUser(u)) });
  }
  if (what === "videos") {
    const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    const source = req.nextUrl.searchParams.get("source") || "all"; // all | upload | commons
    const rows = await db.select({ v: videos, u: users }).from(videos).leftJoin(users, eq(videos.userId, users.id)).orderBy(desc(videos.createdAt));
    let list = rows.map((r) => ({
      ...r.v,
      creator: r.u ? { id: r.u.id, displayName: r.u.displayName, username: r.u.username, ...(isOwner(me) ? { email: r.u.email } : {}) } : null,
    }));
    if (source === "upload") list = list.filter((v) => v.sourceType === "upload");
    if (source === "commons") list = list.filter((v) => v.sourceType === "commons");
    if (q) list = list.filter((v) =>
      v.title.toLowerCase().includes(q) ||
      v.id.toLowerCase().includes(q) ||
      (v.creator?.email || "").toLowerCase().includes(q) ||
      (v.creator?.username || "").toLowerCase().includes(q) ||
      (v.creator?.displayName || "").toLowerCase().includes(q) ||
      (v.attribution || "").toLowerCase().includes(q) ||
      (v.license || "").toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q)
    );
    return NextResponse.json({ total: list.length, videos: list.slice(0, 300) });
  }
  if (what === "logs") {
    const rows = await db.select({ l: adminLogs, u: users }).from(adminLogs).leftJoin(users, eq(adminLogs.actorId, users.id)).orderBy(desc(adminLogs.createdAt)).limit(100);
    return NextResponse.json({
      logs: rows.map((r) => ({
        ...r.l,
        actor: r.u ? { displayName: r.u.displayName, email: r.u.email, username: r.u.username } : null,
      })),
    });
  }
  return NextResponse.json({ error: "Unknown admin query" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const auth = await staff();
  if (auth.error) return auth.error;
  const me = auth.me!;
  const b = await req.json();

  if (b.action === "setRole") {
    if (!isOwner(me)) return NextResponse.json({ error: "Only the ARINX owner can change staff roles." }, { status: 403 });
    const [target] = await db.select().from(users).where(eq(users.id, b.userId));
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isOwnerEmail(target.email) || target.role === "owner") return NextResponse.json({ error: "The owner account cannot have its role changed." }, { status: 403 });
    if (!["user", "admin"].includes(b.role)) return NextResponse.json({ error: "Role must be user or admin" }, { status: 400 });
    const [upd] = await db.update(users).set({ role: b.role }).where(eq(users.id, target.id)).returning();
    await log(me.id, "setRole", "user", target.id, `${target.email} → ${b.role}`);
    return NextResponse.json({ user: publicUser(upd) });
  }

  if (b.action === "setStatus") {
    const [target] = await db.select().from(users).where(eq(users.id, b.userId));
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isOwnerEmail(target.email) || target.role === "owner") return NextResponse.json({ error: "The owner account cannot be suspended." }, { status: 403 });
    if (target.id === me.id) return NextResponse.json({ error: "You cannot suspend your own account." }, { status: 400 });
    if (!["active", "suspended"].includes(b.status)) return NextResponse.json({ error: "Status must be active or suspended" }, { status: 400 });
    const [upd] = await db.update(users).set({ status: b.status }).where(eq(users.id, target.id)).returning();
    if (b.status === "suspended") await db.delete(sessions).where(eq(sessions.userId, target.id));
    await log(me.id, b.status === "suspended" ? "suspendUser" : "unsuspendUser", "user", target.id, target.email);
    return NextResponse.json({ user: publicUser(upd) });
  }

  if (b.action === "deleteUser") {
    if (!isOwner(me)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
    const [target] = await db.select().from(users).where(eq(users.id, b.userId));
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isOwnerEmail(target.email) || target.role === "owner") return NextResponse.json({ error: "The owner account cannot be deleted." }, { status: 403 });
    if (target.id === me.id) return NextResponse.json({ error: "Use Settings to delete your own account." }, { status: 400 });
    await db.delete(users).where(eq(users.id, target.id));
    await log(me.id, "deleteUser", "user", target.id, target.email);
    return NextResponse.json({ ok: true });
  }

  const reason = typeof b.reason === "string" && b.reason.trim() ? ` — reason: ${b.reason.trim().slice(0, 300)}` : "";

  if (b.action === "takedownVideo") {
    const [v] = await db.select().from(videos).where(eq(videos.id, b.videoId));
    if (!v) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const [upd] = await db.update(videos).set({ visibility: "private", status: "takedown" }).where(eq(videos.id, v.id)).returning();
    await log(me.id, "takedownVideo", "video", v.id, `${v.title}${reason}`);
    return NextResponse.json({ video: upd });
  }

  if (b.action === "restoreVideo") {
    const [v] = await db.select().from(videos).where(eq(videos.id, b.videoId));
    if (!v) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    const [upd] = await db.update(videos).set({ visibility: "public", status: "ready" }).where(eq(videos.id, v.id)).returning();
    await log(me.id, "restoreVideo", "video", v.id, v.title);
    return NextResponse.json({ video: upd });
  }

  if (b.action === "deleteVideo") {
    const [v] = await db.select().from(videos).where(eq(videos.id, b.videoId));
    if (!v) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    await removeStoredMedia(v.fileName);
    await db.delete(videos).where(eq(videos.id, v.id));
    await log(me.id, "deleteVideo", "video", v.id, `${v.title}${v.userId ? ` (owner ${v.userId})` : " (external)"}${reason}`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "deleteComment") {
    const [c] = await db.select().from(comments).where(eq(comments.id, b.commentId));
    if (!c) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    await db.delete(comments).where(eq(comments.parentId, c.id));
    await db.delete(comments).where(eq(comments.id, c.id));
    await log(me.id, "deleteComment", "comment", c.id, `${c.content.slice(0, 120)}${reason}`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "deletePost") {
    const [p] = await db.select().from(posts).where(eq(posts.id, b.postId));
    if (!p) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    await db.delete(comments).where(eq(comments.postId, p.id));
    await db.delete(posts).where(eq(posts.id, p.id));
    await log(me.id, "deletePost", "post", p.id, `${(p.content || p.pollQuestion || "").slice(0, 120)}${reason}`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "deleteLive") {
    const [l] = await db.select().from(liveStreams).where(eq(liveStreams.id, b.streamId));
    if (!l) return NextResponse.json({ error: "Stream not found" }, { status: 404 });
    await db.delete(liveStreams).where(eq(liveStreams.id, l.id));
    await log(me.id, "deleteLive", "live", l.id, `${l.title}${reason}`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "deletePlaylist") {
    const [p] = await db.select().from(playlists).where(eq(playlists.id, b.playlistId));
    if (!p) return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    await db.delete(playlists).where(eq(playlists.id, p.id));
    await log(me.id, "deletePlaylist", "playlist", p.id, `${p.title}${reason}`);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "purgeUserContent") {
    if (!isOwner(me)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
    const [target] = await db.select().from(users).where(eq(users.id, b.userId));
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (isOwnerEmail(target.email) || target.role === "owner") return NextResponse.json({ error: "The owner account's content cannot be purged." }, { status: 403 });
    const theirVideos = await db.select().from(videos).where(eq(videos.userId, target.id));
    for (const v of theirVideos) await removeStoredMedia(v.fileName);
    await db.delete(videos).where(eq(videos.userId, target.id));
    await db.delete(comments).where(eq(comments.userId, target.id));
    await db.delete(posts).where(eq(posts.userId, target.id));
    await db.delete(liveStreams).where(eq(liveStreams.userId, target.id));
    await log(me.id, "purgeUserContent", "user", target.id, `${target.email}: ${theirVideos.length} videos + comments/posts/streams removed${reason}`);
    return NextResponse.json({ ok: true, removedVideos: theirVideos.length });
  }

  return NextResponse.json({ error: "Unknown admin action" }, { status: 400 });
}
