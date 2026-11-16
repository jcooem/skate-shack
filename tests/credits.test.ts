import { describe, expect, it } from "vitest";
import { assertEnoughCredits, assertNotNegative, creditsForSharpening, priceForSharpening, UserError } from "@/lib/credits";

describe("creditsForSharpening", () => {
  it("uses the product's credits when paid with a card", () => {
    expect(creditsForSharpening("CREDIT", 1)).toBe(1);
    expect(creditsForSharpening("CREDIT", 2)).toBe(2);
  });
  it("always uses at least one credit", () => {
    expect(creditsForSharpening("CREDIT", 0)).toBe(1);
  });
  it("uses no credits for other payment methods", () => {
    for (const m of ["CASH", "CARD", "ETRANSFER", "COMP"] as const) expect(creditsForSharpening(m, 1)).toBe(0);
  });
});

describe("priceForSharpening", () => {
  it("is free at the till for card credits and comps", () => {
    expect(priceForSharpening("CREDIT", 1200)).toBe(0);
    expect(priceForSharpening("COMP", 1200, 500)).toBe(0);
  });
  it("uses the list price unless overridden", () => {
    expect(priceForSharpening("CASH", 1200)).toBe(1200);
    expect(priceForSharpening("CASH", 1200, null)).toBe(1200);
    expect(priceForSharpening("ETRANSFER", 1200, 1000)).toBe(1000);
    expect(priceForSharpening("CARD", 1200, 0)).toBe(0);
  });
});

describe("assertEnoughCredits", () => {
  it("allows a new sharpen when the balance covers it", () => {
    expect(() => assertEnoughCredits(1, 0, 1)).not.toThrow();
  });
  it("rejects a new sharpen that would go negative", () => {
    expect(() => assertEnoughCredits(0, 0, 1)).toThrow(UserError);
  });
  it("gives back the credits an edited sharpen already used", () => {
    // Balance is 0 because this sharpen already used the last credit; re-saving it is fine.
    expect(() => assertEnoughCredits(0, -1, 1)).not.toThrow();
    // ...but switching it to a 2-credit service is not.
    expect(() => assertEnoughCredits(0, -1, 2)).toThrow(UserError);
  });
});

describe("assertNotNegative", () => {
  it("allows changes that keep the balance at or above zero", () => {
    expect(() => assertNotNegative(3, -3)).not.toThrow();
    expect(() => assertNotNegative(0, 5)).not.toThrow();
  });
  it("rejects changes that would make the balance negative", () => {
    expect(() => assertNotNegative(2, -3)).toThrow(UserError);
  });
});
