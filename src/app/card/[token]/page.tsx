import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCustomerHistory } from "@/lib/customer-history";
import { hashShareToken, isShareTokenShaped } from "@/lib/share-link";
import { CardActivityTable, CardBalance, SharpenHistoryTable } from "@/components/customer-history";
import { formatDate } from "@/lib/format";

// A private, no-login view of one customer's card. The URL holds a 256-bit
// secret; only its hash is stored. next.config.ts adds no-referrer / no-store /
// noindex headers for /card/*, so the link doesn't leak to other sites, caches
// or search engines.

export const metadata: Metadata = {
  title: "My sharpening card",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function CardPage({ params }: PageProps<"/card/[token]">) {
  const { token } = await params;
  // Same 404 for malformed, unknown and turned-off links.
  if (!isShareTokenShaped(token)) notFound();
  const customer = await prisma.customer.findUnique({
    where: { shareTokenHash: hashShareToken(token) },
    select: { id: true, firstName: true },
  });
  if (!customer) notFound();

  const [settings, { sharpens, ledger, balance }] = await Promise.all([getSettings(), getCustomerHistory(customer.id)]);
  const last = sharpens[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Hi {customer.firstName}!</h1>
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <CardBalance businessName={settings.businessName} balance={balance} />
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Last sharpen</div>
            {last ? (
              <>
                <div className="mt-4 text-2xl font-bold text-slate-900">{formatDate(last.date)}</div>
                <div className="text-sm text-slate-600">
                  {last.serviceName}
                  {last.hollow && ` · ${last.hollow}`}
                </div>
              </>
            ) : (
              <div className="mt-4 text-sm text-slate-600">No sharpens yet — see you at the shop!</div>
            )}
          </div>
        </div>
        <SharpenHistoryTable sharpens={sharpens} />
        <CardActivityTable ledger={ledger} balance={balance} />
        <p className="text-sm text-slate-500">
          Bookmark this page to check your balance any time. Keep the link private: anyone who has it can see your card.
        </p>
      </div>
    </main>
  );
}
