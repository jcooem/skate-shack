import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/authz";
import { getBalance } from "@/lib/credits";
import { getSettings } from "@/lib/settings";
import { formatDate, formatMoney, plural, skateName } from "@/lib/format";
import { Card, EmptyState, LinkButton, Notice } from "@/components/ui";
import { CardBalance } from "@/components/customer-history";

export default async function AccountOverview() {
  const { customer } = await requireCustomer();
  const [balance, recent, count, cards, settings] = await Promise.all([
    getBalance(prisma, customer.id),
    prisma.sharpening.findMany({
      where: { customerId: customer.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { skate: true },
    }),
    prisma.sharpening.count({ where: { customerId: customer.id } }),
    prisma.product.findMany({ where: { kind: "CARD", active: true, showOnPublicPage: true }, orderBy: { sortOrder: "asc" }, take: 1 }),
    getSettings(),
  ]);
  const needsProfile = !customer.phone || (!customer.preferredHollow && count === 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <CardBalance businessName={settings.businessName} balance={balance}>
          {balance === 0 && cards[0] && (
            <p className="mt-4 text-sm text-ice-100">
              Pick up a {cards[0].name} for {formatMoney(cards[0].priceCents)} on your next visit.
            </p>
          )}
        </CardBalance>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last sharpen</div>
          {recent[0] ? (
            <>
              <div className="mt-4 text-2xl font-bold text-slate-900">{formatDate(recent[0].date)}</div>
              <div className="text-sm text-slate-600">
                {recent[0].serviceName}
                {recent[0].hollow && ` · ${recent[0].hollow}`}
              </div>
            </>
          ) : (
            <div className="mt-4 text-sm text-slate-600">No sharpens yet — see you at the shop!</div>
          )}
          <div className="mt-4 text-sm text-slate-500">{plural(count, "sharpen")} in total</div>
        </div>
      </div>

      {needsProfile && (
        <Notice tone="blue">
          Help us get your edges right: add your phone number, skates and preferred hollow on your{" "}
          <Link href="/account/profile" className="font-semibold underline">
            profile
          </Link>
          .
        </Notice>
      )}

      <Card title="Recent sharpens" actions={count > 5 && <LinkButton href="/account/history" variant="secondary" size="sm">See all</LinkButton>}>
        {recent.length === 0 ? (
          <EmptyState>Your sharpening history will show up here.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium text-slate-900">{s.serviceName}</div>
                  <div className="text-sm text-slate-500">
                    {[s.skate && skateName(s.skate), s.hollow, s.profile].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-700">{formatDate(s.date)}</div>
                  <div className="text-slate-500">{s.paymentMethod === "CREDIT" ? `${plural(s.creditsUsed, "credit")} used` : ""}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
