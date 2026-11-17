import { describe, expect, it } from "vitest";
import { createShareToken, hashShareToken, isShareTokenShaped } from "@/lib/share-link";
import { generateTempPassword, TEMP_PASSWORD_ALPHABET } from "@/lib/temp-password";

describe("share links", () => {
  it("creates 43-character url-safe tokens with a matching hash", () => {
    const { token, hash } = createShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isShareTokenShaped(token)).toBe(true);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashShareToken(token)).toBe(hash);
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => createShareToken().token));
    expect(tokens.size).toBe(1000);
  });

  it("rejects malformed tokens", () => {
    for (const bad of ["", "abc", "a".repeat(42), "a".repeat(44), `${"a".repeat(42)}/`, `${"a".repeat(42)}=`]) {
      expect(isShareTokenShaped(bad)).toBe(false);
    }
  });
});

describe("temporary passwords", () => {
  it("are 12 characters from the readable alphabet, grouped in fours", () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateTempPassword();
      expect(pw).toMatch(/^.{4}-.{4}-.{4}$/);
      for (const ch of pw.replace(/-/g, "")) expect(TEMP_PASSWORD_ALPHABET).toContain(ch);
    }
  });

  it("has no look-alike characters", () => {
    for (const ch of "0O1Il") expect(TEMP_PASSWORD_ALPHABET).not.toContain(ch);
  });
});
