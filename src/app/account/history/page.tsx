import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/authz";
import { getBalance } from "@/lib/credits";
import { CREDIT_REASONS, PAYMENT_METHODS_SHORT } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, skateName } from "@/lib/format";
import { Card, EmptyState, Table, Td, Th } from "@/components/ui";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const { customer } = await requireCustomer();
  const [sharpens, ledger, balance] = await Promise.all([
    prisma.sharpening.findMany({
      where: { customerId: customer.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { skate: true },
    }),
    prisma.creditTransaction.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: { sharpening: { select: { date: true } } },
    }),
    getBalance(prisma, customer.id),
  ]);

  return (
    <div className="space-y-6">
      <Card title={`Sharpening history (${sharpens.length})`}>
        {sharpens.length === 0 ? (
          <EmptyState>No sharpens yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Service</Th>
                <Th>Skates</Th>
                <Th>Paid with</Th>
              </tr>
            </thead>
            <tbody>
              {sharpens.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap">{formatDate(s.date)}</Td>
                  <Td>
                    <div className="font-medium text-slate-900">{s.serviceName}</div>
                    <div className="text-xs text-slate-500">{[s.hollow, s.profile].filter(Boolean).join(" · ")}</div>
                    {s.notes && <div className="mt-1 text-xs text-slate-500">{s.notes}</div>}
                  </Td>
                  <Td>{s.skate ? skateName(s.skate) : <span className="text-slate-400">—</span>}</Td>
                  <Td className="whitespace-nowrap">
                    {s.paymentMethod === "CREDIT"
                      ? `${s.creditsUsed} card credit${s.creditsUsed === 1 ? "" : "s"}`
                      : `${PAYMENT_METHODS_SHORT[s.paymentMethod]}${s.priceChargedCents ? ` · ${formatMoney(s.priceChargedCents)}` : ""}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card title={`Card activity · ${balance} left`}>
        {ledger.length === 0 ? (
          <EmptyState>No sharpening card activity yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>What</Th>
                <Th className="text-right">Credits</Th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((t) => (
                <tr key={t.id}>
                  <Td className="whitespace-nowrap">{t.sharpening ? formatDate(t.sharpening.date) : formatDateTime(t.createdAt)}</Td>
                  <Td>
                    {CREDIT_REASONS[t.reason]}
                    {t.note && <span className="text-slate-500"> · {t.note}</span>}
                  </Td>
                  <Td className={t.delta > 0 ? "text-right font-semibold text-emerald-700" : "text-right font-semibold"}>
                    {t.delta > 0 ? `+${t.delta}` : t.delta}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
