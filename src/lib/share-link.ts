import { createHash, randomBytes } from "node:crypto";

/**
 * Private "view my card" links.
 *
 * A link is /card/<token>, where the token is 32 random bytes (256 bits) in
 * base64url. Only a SHA-256 hash of the token is stored, so the database alone
 * can't be used to rebuild a working link. Lookup is an exact match on that
 * hash, so there's no timing side channel on the token itself.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashShareToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createShareToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashShareToken(token) };
}

/** Cheap check before touching the database. */
export function isShareTokenShaped(token: string) {
  return TOKEN_PATTERN.test(token);
}

/** Absolute site URL for links in emails. */
export function siteUrl() {
  return (process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function shareUrl(token: string) {
  return `${siteUrl()}/card/${token}`;
}
