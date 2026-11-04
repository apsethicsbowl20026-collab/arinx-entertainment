export const OWNER_EMAIL = (process.env.ARINX_OWNER_EMAIL || "sujeetraut217@gmail.com").trim().toLowerCase();

export function isOwnerEmail(email?: string | null) {
  return (email || "").trim().toLowerCase() === OWNER_EMAIL;
}

export function isStaff(user?: { role?: string; email?: string } | null) {
  if (!user) return false;
  return user.role === "owner" || user.role === "admin" || isOwnerEmail(user.email);
}

export function isOwner(user?: { role?: string; email?: string } | null) {
  if (!user) return false;
  return user.role === "owner" || isOwnerEmail(user.email);
}

export function roleForEmail(email: string, fallback: "user" | "admin" = "user") {
  return isOwnerEmail(email) ? "owner" : fallback;
}
