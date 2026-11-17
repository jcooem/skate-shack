import { randomInt } from "node:crypto";

/** No look-alikes (0/O, 1/I/l), so it's easy to type from an email. */
export const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** e.g. "Kq7M-x4TP-9hRw": 12 random characters (~68 bits), grouped for readability. */
export function generateTempPassword() {
  let out = "";
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) out += "-";
    out += TEMP_PASSWORD_ALPHABET[randomInt(TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}

export const TEMP_PASSWORD_DAYS = 7;
