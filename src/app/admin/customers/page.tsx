import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { getBalances } from "@/lib/credits";
import { formatDate, fullName } from "@/lib/format";
import { Badge, buttonClass, Card, EmptyState, inputClass, LinkButton, Notice, PageHeader, Table, Td, Th } from "@/components/ui";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireOwner();
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = Math.max(1, Number(params.page) || 1);

  const terms = q.split(/\s+/).filter(Boolean);
  const where: Prisma.CustomerWhereInput = terms.length
    ? {
        AND: terms.map((t) => ({
          OR: [
            { firstName: { contains: t, mode: "insensitive" } },
            { lastName: { contains: t, mode: "insensitive" } },
            { email: { contains: t, mode: "insensitive" } },
            { phone: { contains: t } },
          ],
        })),
      }
    : {};

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        sharpenings: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
        _count: { select: { skates: true } },
      },
    }),
  ]);
  const balances = await getBalances(
    prisma,
    customers.map((c) => c.id),
  );
  const pages = Math.ceil(total / PAGE_SIZE);
  const pageHref = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${total} ${total === 1 ? "customer" : "customers"}${q ? ` matching “${q}”` : ""}`}
        actions={<LinkButton href="/admin/customers/new">Add customer</LinkButton>}
      />
      {params.deleted && (
        <div className="mb-4">
          <Notice tone="green">Customer deleted.</Notice>
        </div>
      )}
      <Card>
        <form className="mb-4 flex flex-col gap-2 sm:flex-row">
          <input name="q" defaultValue={q} placeholder="Search by name, email or phone…" className={inputClass} aria-label="Search customers" />
          <button className={buttonClass("secondary")} type="submit">
            Search
          </button>
        </form>

        {customers.length === 0 ? (
          <EmptyState>{q ? "No customers match that search." : "No customers yet — add your first one."}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>Credits</Th>
                <Th>Last sharpen</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const balance = balances.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/admin/customers/${c.id}`} className="font-medium text-ice-700 hover:underline">
                        {fullName(c)}
                      </Link>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {c.userId && <Badge tone="blue">Has login</Badge>}
                        {c.preferredHollow && <Badge>{c.preferredHollow}</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <div>{c.email}</div>
                      <div className="text-slate-500">{c.phone}</div>
                    </Td>
                    <Td>{balance > 0 ? <Badge tone="green">{balance}</Badge> : <span className="text-slate-400">0</span>}</Td>
                    <Td className="whitespace-nowrap">{c.sharpenings[0] ? formatDate(c.sharpenings[0].date) : <span className="text-slate-400">—</span>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {page} of {pages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <LinkButton variant="secondary" size="sm" href={pageHref(page - 1)}>
                  Previous
                </LinkButton>
              )}
              {page < pages && (
                <LinkButton variant="secondary" size="sm" href={pageHref(page + 1)}>
                  Next
                </LinkButton>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
