import "server-only";
import { prisma } from "@/lib/db";
import { getBalance } from "@/lib/credits";

/** Everything a customer may see about their own sharpening and card activity. */
export async function getCustomerHistory(customerId: string) {
  const [sharpens, ledger, balance] = await Promise.all([
    prisma.sharpening.findMany({
      where: { customerId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { skate: true },
    }),
    prisma.creditTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { sharpening: { select: { date: true } } },
    }),
    getBalance(prisma, customerId),
  ]);
  return { sharpens, ledger, balance };
}

export type CustomerHistory = Awaited<ReturnType<typeof getCustomerHistory>>;
