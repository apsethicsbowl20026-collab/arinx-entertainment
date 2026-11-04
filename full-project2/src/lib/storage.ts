import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Durable media storage for ARINX.
 *
 * On a serverless host (Vercel / Cloudflare Pages) the local filesystem is
 * ephemeral — uploads would disappear on every cold start or redeploy. When
 * S3-compatible credentials are present, media is stored in the bucket and
 * `/api/media/<name>` redirects to a short-lived signed URL, so video seeking
 * (HTTP Range requests) is served by the bucket/CDN instead of proxying bytes
 * through a serverless function.
 *
 * Without those credentials it falls back to `./uploads` on local disk, which
 * is correct for this sandbox and for a single long-lived server.
 */

const endpoint = process.env.STORAGE_S3_ENDPOINT?.trim() || "";
const bucket = process.env.STORAGE_S3_BUCKET?.trim() || "";
const accessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID?.trim() || "";
const secretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY?.trim() || "";
const region = process.env.STORAGE_S3_REGION?.trim() || "auto";
const prefix = (process.env.STORAGE_S3_PREFIX?.trim() || "arinx").replace(/^\/+|\/+$/g, "");
const urlExpirySec = Number(process.env.STORAGE_S3_URL_TTL_SEC || 3600);

let client: S3Client | null = null;

export function isRemoteStorage() {
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
}

function getClient() {
  if (!client) {
    client = new S3Client({
      endpoint,
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: Boolean(process.env.STORAGE_S3_PATH_STYLE === "true"),
    });
  }
  return client;
}

/** Object key for a stored media file, e.g. "arinx/8f1c...mp4" */
export function mediaKey(name: string) {
  const safe = name.replace(/^\/+/, "");
  return prefix ? `${prefix}/${safe}` : safe;
}

export function contentTypeFor(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".avi")) return "video/x-msvideo";
  return "video/mp4";
}

export async function putMedia(name: string, body: Buffer, contentType?: string) {
  if (!isRemoteStorage()) throw new Error("Remote storage is not configured");
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: mediaKey(name),
      Body: body,
      ContentType: contentType || contentTypeFor(name),
    })
  );
}

/** Short-lived signed GET URL, or null when remote storage is not configured. */
export async function signedMediaUrl(name: string) {
  if (!isRemoteStorage()) return null;
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: mediaKey(name),
      ResponseContentType: contentTypeFor(name),
    }),
    { expiresIn: Number.isFinite(urlExpirySec) && urlExpirySec > 0 ? urlExpirySec : 3600 }
  );
}

/**
 * Short-lived signed PUT URL so the browser uploads straight to the bucket.
 * This bypasses the serverless payload limit entirely (Netlify buffers
 * request/response bodies at 6 MB, AWS Lambda at 6 MB, with a 60s synchronous
 * timeout), which would otherwise make video uploads impossible on those hosts.
 */
export async function presignedPutUrl(name: string, contentType: string, expiresInSec = 1800) {
  if (!isRemoteStorage()) return null;
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket, Key: mediaKey(name), ContentType: contentType }),
    { expiresIn: expiresInSec }
  );
}

/** Confirms an object really exists in the bucket before a video is published. */
export async function objectExists(name: string) {
  if (!isRemoteStorage()) return false;
  try {
    await getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: mediaKey(name) }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteMedia(name: string) {
  if (!isRemoteStorage() || !name) return false;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: mediaKey(name) }));
    return true;
  } catch {
    return false;
  }
}
