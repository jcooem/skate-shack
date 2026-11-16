import type { PrismaClient } from "@/generated/prisma/client";
import type { PaymentMethodKey } from "@/lib/constants";

/** An error whose message is safe and useful to show to the person using the app. */
export class UserError extends Error {}

type Db = PrismaClient;
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

// ─────────────────────────────────────────────────────────────
// Pure rules (unit-tested without a database)
// ─────────────────────────────────────────────────────────────

/** Credits a sharpening consumes for a given payment method. */
export function creditsForSharpening(paymentMethod: PaymentMethodKey, productCredits: number) {
  return paymentMethod === "CREDIT" ? Math.max(1, productCredits) : 0;
}

/** Price recorded on a sharpening: card credits and comps are $0 at the till. */
export function priceForSharpening(paymentMethod: PaymentMethodKey, productPriceCents: number, overrideCents?: number | null) {
  if (paymentMethod === "CREDIT" || paymentMethod === "COMP") return 0;
  return overrideCents ?? productPriceCents;
}

/**
 * Checks a credit sharpening can be paid for.
 * @param balance        current balance
 * @param existingDelta  ledger delta already recorded for this sharpening (≤ 0) when editing, else 0
 * @param creditsNeeded  credits the sharpening will now consume
 */
export function assertEnoughCredits(balance: number, existingDelta: number, creditsNeeded: number) {
  const available = balance - existingDelta; // give back what this sharpening already used
  if (creditsNeeded > available) {
    throw new UserError(
      `Not enough credits: this sharpen needs ${creditsNeeded} but only ${available} ${available === 1 ? "is" : "are"} available. Sell a card or choose another payment method.`,
    );
  }
}

/** A change to the balance must not leave it negative. */
export function assertNotNegative(balance: number, delta: number) {
  if (balance + delta < 0) {
    throw new UserError(`That would leave the balance at ${balance + delta}. Balances can't go below zero.`);
  }
}

// ─────────────────────────────────────────────────────────────
// Database operations
// ─────────────────────────────────────────────────────────────

export async function getBalance(db: Db | Tx, customerId: string) {
  const { _sum } = await db.creditTransaction.aggregate({ where: { customerId }, _sum: { delta: true } });
  return _sum.delta ?? 0;
}

export async function getBalances(db: Db, customerIds: string[]) {
  if (customerIds.length === 0) return new Map<string, number>();
  const rows = await db.creditTransaction.groupBy({
    by: ["customerId"],
    where: { customerId: { in: customerIds } },
    _sum: { delta: true },
  });
  return new Map(rows.map((r) => [r.customerId, r._sum.delta ?? 0]));
}

export async function sellCard(
  db: Db,
  input: { customerId: string; productId: string; amountPaidCents?: number | null; note?: string },
) {
  const product = await db.product.findUnique({ where: { id: input.productId } });
  if (!product || product.kind !== "CARD") throw new UserError("Choose a sharpening card to sell.");
  return db.creditTransaction.create({
    data: {
      customerId: input.customerId,
      delta: product.credits,
      reason: "CARD_PURCHASE",
      productId: product.id,
      amountPaidCents: input.amountPaidCents ?? product.priceCents,
      note: input.note ?? product.name,
    },
  });
}

export async function adjustCredits(db: Db, input: { customerId: string; delta: number; note: string; reason?: "ADJUSTMENT" | "REFUND" }) {
  if (!Number.isInteger(input.delta) || input.delta === 0) throw new UserError("Enter a whole number of credits other than zero.");
  return db.$transaction(async (tx) => {
    assertNotNegative(await getBalance(tx, input.customerId), input.delta);
    return tx.creditTransaction.create({
      data: { customerId: input.customerId, delta: input.delta, reason: input.reason ?? "ADJUSTMENT", note: input.note },
    });
  });
}

/** Deletes a manual ledger entry (card sale / adjustment). Sharpen entries are removed by deleting the sharpen. */
export async function deleteCreditTransaction(db: Db, input: { customerId: string; transactionId: string }) {
  return db.$transaction(async (tx) => {
    const row = await tx.creditTransaction.findFirst({ where: { id: input.transactionId, customerId: input.customerId } });
    if (!row) throw new UserError("That ledger entry no longer exists.");
    if (row.sharpeningId) throw new UserError("This entry belongs to a sharpen. Edit or delete the sharpen instead.");
    assertNotNegative(await getBalance(tx, input.customerId), -row.delta);
    await tx.creditTransaction.delete({ where: { id: row.id } });
  });
}

export type SharpeningInput = {
  id?: string;
  customerId: string;
  skateId?: string | null;
  productId: string;
  date: Date;
  hollow: string;
  profile: string;
  paymentMethod: PaymentMethodKey;
  priceChargedCents?: number | null;
  notes: string;
};

/**
 * Creates or updates a sharpening and keeps its credit-ledger entry in sync:
 * paid with credits → one negative ledger row linked to the sharpening;
 * paid any other way → no ledger row.
 */
export async function saveSharpening(db: Db, input: SharpeningInput) {
  return db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product || product.kind !== "SERVICE") throw new UserError("Choose a sharpening service.");

    if (input.skateId) {
      const skate = await tx.skate.findFirst({ where: { id: input.skateId, customerId: input.customerId } });
      if (!skate) throw new UserError("That pair of skates doesn't belong to this customer.");
    }

    let existingDelta = 0;
    if (input.id) {
      const existing = await tx.sharpening.findFirst({
        where: { id: input.id, customerId: input.customerId },
        include: { transaction: true },
      });
      if (!existing) throw new UserError("That sharpen no longer exists.");
      existingDelta = existing.transaction?.delta ?? 0;
    }

    const creditsUsed = creditsForSharpening(input.paymentMethod, product.credits);
    if (creditsUsed > 0) {
      assertEnoughCredits(await getBalance(tx, input.customerId), existingDelta, creditsUsed);
    }

    const data = {
      customerId: input.customerId,
      skateId: input.skateId || null,
      productId: product.id,
      serviceName: product.name,
      date: input.date,
      hollow: input.hollow,
      profile: input.profile,
      paymentMethod: input.paymentMethod,
      priceChargedCents: priceForSharpening(input.paymentMethod, product.priceCents, input.priceChargedCents),
      creditsUsed,
      notes: input.notes,
    };

    const sharpening = input.id
      ? await tx.sharpening.update({ where: { id: input.id }, data })
      : await tx.sharpening.create({ data });

    if (creditsUsed > 0) {
      await tx.creditTransaction.upsert({
        where: { sharpeningId: sharpening.id },
        create: {
          customerId: input.customerId,
          sharpeningId: sharpening.id,
          delta: -creditsUsed,
          reason: "SHARPEN",
          productId: product.id,
          note: product.name,
        },
        update: { delta: -creditsUsed, productId: product.id, note: product.name },
      });
    } else {
      await tx.creditTransaction.deleteMany({ where: { sharpeningId: sharpening.id } });
    }
    return sharpening;
  });
}

/** Deleting a sharpen also deletes its ledger row (FK cascade), refunding any credits used. */
export async function deleteSharpening(db: Db, input: { customerId: string; sharpeningId: string }) {
  const { count } = await db.sharpening.deleteMany({ where: { id: input.sharpeningId, customerId: input.customerId } });
  if (count === 0) throw new UserError("That sharpen no longer exists.");
}
