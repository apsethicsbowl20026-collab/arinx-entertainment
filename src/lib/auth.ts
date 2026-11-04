import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { notifications, sessions, users, videos } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { COMMONS_CATALOG } from "@/lib/catalog-seed";

export const hashPw = (p: string) => bcrypt.hash(p, 10);
export const verifyPw = (p: string, h: string) => bcrypt.compare(p, h);
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt: expires });

  // Preview panels and embedded widgets serve ARINX inside a cross-site iframe.
  // Browsers only send cookies in that context when SameSite=None AND Secure are
  // both set — with SameSite=Lax the session cookie is silently dropped, so the
  // app kept asking people to sign in again even though they already had.
  let secure = false;
  try {
    const h = await headers();
    const proto = (h.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
    secure = proto === "https";
  } catch { /* non-request context; fall back to lax */ }

  const c = await cookies();
  c.set("arinx_session", token, {
    httpOnly: true,
    path: "/",
    expires,
    sameSite: secure ? "none" : "lax",
    secure,
  });
  return token;
}

export async function destroySession() {
  const c = await cookies();
  const t = c.get("arinx_session")?.value;
  if (t) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(t)));
  c.delete("arinx_session");
}

export async function currentUser() {
  try {
    const c = await cookies();
    const t = c.get("arinx_session")?.value;
    if (!t) return null;
    const rows = await db
      .select({ u: users })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, hashToken(t)), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const u = rows[0]?.u || null;
    if (u && (u as any).status === "suspended") return null;
    return u;
  } catch {
    return null;
  }
}

export function publicUser(u: any) {
  if (!u) return null;
  const { passwordHash, ...rest } = u;
  return rest;
}

let seeded = false;

/**
 * Seeds the opening catalogue with freely-licensed Wikimedia Commons videos.
 *
 * The earlier demo shelf used YouTube embeds, which had to be labelled as
 * third-party content and could not show real ARINX view counts. Commons media
 * (Public domain, CC0, CC BY, CC BY-SA) streams directly into the ARINX player,
 * so views, likes and comments are genuine ARINX records. Author and licence are
 * stored per video and surfaced in the UI, as the CC licences require.
 */
export async function ensureSeed() {
  if (seeded) return;
  seeded = true;
  try {
    await db.delete(videos).where(eq(videos.sourceType, "youtube"));
    const existing = await db.select({ id: videos.id }).from(videos).where(eq(videos.sourceType, "commons")).limit(1);
    if (existing.length) return;
    for (const v of COMMONS_CATALOG) {
      await db.insert(videos).values({
        title: v.title,
        description: `Freely-licensed video from Wikimedia Commons.\n\nAuthor: ${v.attribution}\nLicence: ${v.license}\nSource: ${v.sourcePage}`,
        category: v.category,
        sourceType: "commons",
        sourceUrl: v.sourceUrl,
        sourcePage: v.sourcePage,
        thumbnailUrl: v.thumbnailUrl,
        license: v.license,
        attribution: v.attribution,
        durationSec: v.durationSec,
        // Store the real transcodes Commons publishes so the player can switch quality.
        renditions: (v as any).renditions || [],
        visibility: "public",
        status: "ready",
        // Catalogue media is streamed, not offered for download.
        allowDownload: false,
      });
    }
  } catch (e) {
    console.error("seed", e);
  }
}

export async function notify(userId: string, actorId: string | null, type: string, message: string, videoId?: string) {
  if (actorId && userId === actorId) return;
  try {
    await db.insert(notifications).values({ userId, actorId: actorId || undefined, type, message, videoId: videoId || undefined });
  } catch { /* notification failure must never break the action that caused it */ }
}
