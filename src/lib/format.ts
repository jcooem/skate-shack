// Formatting helpers that are safe to use on both server and client.

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "CAD";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "en-CA";

export function formatMoney(cents: number) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(cents / 100);
}

/** "12.50" / "$12.50" / "12" → 1250. Returns null when not a valid amount. */
export function parseMoneyToCents(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Cents → "12.50" for use as an input's default value. */
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Sharpening dates are stored as calendar dates (UTC midnight). */
export function formatDate(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.APP_TIMEZONE || "America/Toronto",
  }).format(date);
}

/** Date → "YYYY-MM-DD" for a date input (date-only values are stored at UTC midnight). */
export function dateToInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in the shop's time zone, as "YYYY-MM-DD". */
export function todayInput() {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIMEZONE || "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** "YYYY-MM-DD" → Date at UTC midnight. */
export function inputToDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function fullName(c: { firstName: string; lastName: string }) {
  return [c.firstName, c.lastName].filter(Boolean).join(" ");
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${Math.abs(n) === 1 ? word : pluralWord}`;
}

const SKATE_TYPE_LABELS: Record<string, string> = {
  HOCKEY_PLAYER: "Hockey (player)",
  HOCKEY_GOALIE: "Hockey (goalie)",
  FIGURE: "Figure",
  SPEED: "Speed",
  RECREATIONAL: "Recreational",
  OTHER: "Other",
};

/** "Game skates (Bauer Supreme)" / "Bauer Supreme" / "Hockey (player)". */
export function skateName(s: { label: string; brand: string; model: string; skateType: string }) {
  const desc = [s.brand, s.model].filter(Boolean).join(" ");
  return s.label ? `${s.label}${desc ? ` (${desc})` : ""}` : desc || SKATE_TYPE_LABELS[s.skateType] || "Skates";
}
