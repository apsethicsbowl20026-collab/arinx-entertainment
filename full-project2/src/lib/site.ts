const FALLBACK_SITE_URL = "https://www.arinx.com";

/**
 * Accepts values written as "arinx.com", "www.arinx.com", "https://arinx.com/"
 * and always returns a valid absolute origin with no trailing slash.
 */
function normalizeSiteUrl(raw?: string | null) {
  const value = (raw || "").trim().replace(/^["']|["']$/g, "");
  if (!value) return FALLBACK_SITE_URL;
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const siteUrl = (path = "/") =>
  `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
