import type { ReactNode } from "react";
import type { CustomerHistory } from "@/lib/customer-history";
import { CREDIT_REASONS, PAYMENT_METHODS_SHORT } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, skateName } from "@/lib/format";
import { Card, EmptyState, Table, Td, Th } from "@/components/ui";

/** The dark "sharpening card" tile showing how many sharpens are left. */
export function CardBalance({ businessName, balance, children }: { businessName: string; balance: number; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-rink-900 p-6 text-white shadow-md">
      <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-ice-500/20" />
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ice-200">{businessName} card</div>
      <div className="mt-4 font-display text-6xl font-bold">{balance}</div>
      <div className="text-sm text-ice-100">{balance === 1 ? "sharpen left" : "sharpens left"}</div>
      {children}
    </div>
  );
}

export function SharpenHistoryTable({ sharpens }: { sharpens: CustomerHistory["sharpens"] }) {
  return (
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
  );
}

export function CardActivityTable({ ledger, balance }: { ledger: CustomerHistory["ledger"]; balance: number }) {
  return (
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
  );
}
