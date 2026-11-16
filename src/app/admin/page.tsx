import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { PAYMENT_METHODS_SHORT } from "@/lib/constants";
import { formatDate, formatMoney, fullName, inputToDate, todayInput } from "@/lib/format";
import { buttonClass, Card, EmptyState, inputClass, LinkButton, PageHeader, Stat, Table, Td, Th } from "@/components/ui";

export default async function AdminDashboard() {
  await requireOwner();

  const today = inputToDate(todayInput());
  const weekAgo = new Date(today.getTime() - 6 * 86_400_000);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  const [customers, sharpensWeek, sharpensMonth, salesMonth, cardSalesMonth, outstanding, recent] = await Promise.all([
    prisma.customer.count(),
    prisma.sharpening.count({ where: { date: { gte: weekAgo } } }),
    prisma.sharpening.count({ where: { date: { gte: monthStart } } }),
    prisma.sharpening.aggregate({ where: { date: { gte: monthStart } }, _sum: { priceChargedCents: true } }),
    prisma.creditTransaction.aggregate({
      where: { reason: "CARD_PURCHASE", createdAt: { gte: monthStart } },
      _sum: { amountPaidCents: true },
    }),
    prisma.creditTransaction.aggregate({ _sum: { delta: true } }),
    prisma.sharpening.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  const revenueMonth = (salesMonth._sum.priceChargedCents ?? 0) + (cardSalesMonth._sum.amountPaidCents ?? 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Find a customer to log a sharpen, sell a card or update their details."
        actions={<LinkButton href="/admin/customers/new">Add customer</LinkButton>}
      />

      <Card className="mb-6">
        <form action="/admin/customers" className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="q">
            Search customers
          </label>
          <input id="q" name="q" placeholder="Search by name, email or phone…" className={inputClass} autoFocus />
          <button className={buttonClass()} type="submit">
            Find customer
          </button>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Sharpens · last 7 days" value={sharpensWeek} />
        <Stat label="Sharpens · this month" value={sharpensMonth} />
        <Stat label="Taken in · this month" value={formatMoney(revenueMonth)} hint="Single sharpens + card sales" />
        <Stat label="Customers" value={customers} hint={`${outstanding._sum.delta ?? 0} card credits outstanding`} />
      </div>

      <Card title="Recent sharpens">
        {recent.length === 0 ? (
          <EmptyState>No sharpens logged yet. Find a customer above to log the first one.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Service</Th>
                <Th>Paid</Th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id}>
                  <Td className="whitespace-nowrap">{formatDate(s.date)}</Td>
                  <Td>
                    <Link className="font-medium text-ice-700 hover:underline" href={`/admin/customers/${s.customer.id}`}>
                      {fullName(s.customer)}
                    </Link>
                  </Td>
                  <Td>
                    {s.serviceName}
                    {s.hollow && <span className="text-slate-500"> · {s.hollow}</span>}
                  </Td>
                  <Td className="whitespace-nowrap">
                    {s.paymentMethod === "CREDIT" ? `${s.creditsUsed} credit${s.creditsUsed === 1 ? "" : "s"}` : formatMoney(s.priceChargedCents)}
                    <span className="block text-xs text-slate-500">{PAYMENT_METHODS_SHORT[s.paymentMethod]}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
