import type { PrismaClient } from "@/generated/prisma/client";

type Db = Pick<PrismaClient, "customer" | "user">;

export function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export function parseOwnerEmails(value: string | undefined) {
  return (value ?? "")
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns the Customer record for a signed-in user, creating or linking it on
 * first use:
 *   1. already linked → return it
 *   2. an owner-created customer with the same (verified) email and no login → link it
 *   3. otherwise → create a new customer
 *
 * Callers must only pass users whose email is verified; linking by email is
 * what lets a customer see history the owner entered for them.
 */
export async function ensureCustomerForUser(
  db: Db,
  user: { id: string; name: string; email: string; emailVerified: boolean },
) {
  if (!user.emailVerified) throw new Error("Email must be verified before linking a customer record.");

  const linked = await db.customer.findUnique({ where: { userId: user.id } });
  if (linked) return linked;

  const email = user.email.toLowerCase();
  const existing = await db.customer.findUnique({ where: { email } });
  if (existing && !existing.userId) {
    // updateMany with userId: null guards against a concurrent link.
    const { count } = await db.customer.updateMany({
      where: { id: existing.id, userId: null },
      data: { userId: user.id },
    });
    if (count === 1) return { ...existing, userId: user.id };
  }

  const { firstName, lastName } = splitName(user.name);
  try {
    return await db.customer.create({
      data: {
        userId: user.id,
        firstName: firstName || email.split("@")[0],
        lastName,
        // If the email is somehow already taken by another linked customer, leave it blank.
        email: existing ? null : email,
      },
    });
  } catch (err) {
    // Lost a race with a parallel request — return whatever got linked.
    const again = await db.customer.findUnique({ where: { userId: user.id } });
    if (again) return again;
    throw err;
  }
}
