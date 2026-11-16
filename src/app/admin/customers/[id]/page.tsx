import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { getBalance } from "@/lib/credits";
import { CREDIT_REASONS, PAYMENT_METHODS_SHORT, SKATE_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, fullName, skateName, todayInput } from "@/lib/format";
import {
  adjustCredits,
  deleteCreditTransaction,
  deleteCustomer,
  deleteSharpening,
  deleteSkate,
  saveSharpening,
  saveSkate,
  sellCard,
  updateCustomer,
} from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CustomerFields, SharpenDatalists, SkateFields } from "@/components/form-fields";
import { SharpenForm } from "@/components/sharpen-form";
import { Badge, Card, cx, EmptyState, Field, inputClass, LinkButton, Notice, Table, Td, Th } from "@/components/ui";

type Tab = "sharpens" | "credits" | "profile";

export async function generateMetadata({ params }: PageProps<"/admin/customers/[id]">): Promise<Metadata> {
  const { id } = await params;
  const c = await prisma.customer.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  return { title: c ? fullName(c) : "Customer" };
}

export default async function CustomerPage({ params, searchParams }: PageProps<"/admin/customers/[id]">) {
  await requireOwner();
  const { id } = await params;
  const sp = await searchParams;
  const tab: Tab = sp.tab === "credits" || sp.tab === "profile" ? sp.tab : "sharpens";

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, accounts: { select: { providerId: true } } } },
      skates: { orderBy: [{ active: "desc" }, { createdAt: "asc" }] },
    },
  });
  if (!customer) notFound();
  const balance = await getBalance(prisma, id);
  const name = fullName(customer);

  const tabs: [Tab, string][] = [
    ["sharpens", "Sharpens"],
    ["credits", `Credits (${balance})`],
    ["profile", "Profile & skates"],
  ];

  return (
    <>
      <div className="mb-6">
        <Link href="/admin/customers" className="text-sm text-slate-500 hover:text-slate-800">
          ← Customers
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{name}</h1>
            <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {customer.email && <a href={`mailto:${customer.email}`}>{customer.email}</a>}
              {customer.phone && <a href={`tel:${customer.phone}`}>{customer.phone}</a>}
              {customer.preferredHollow && <span>Hollow: {customer.preferredHollow}</span>}
              {customer.preferredProfile && <span>Profile: {customer.preferredProfile}</span>}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {customer.user ? (
                <Badge tone="blue">
                  Signs in with {customer.user.accounts.map((a) => (a.providerId === "credential" ? "password" : a.providerId)).join(", ") || "email link"}
                </Badge>
              ) : (
                <Badge>No login yet</Badge>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-rink-900 px-5 py-3 text-white">
            <div className="text-xs uppercase tracking-wide text-ice-200">Card balance</div>
            <div className="text-3xl font-bold">{balance}</div>
          </div>
        </div>
        {customer.sharpenNotes && (
          <div className="mt-3">
            <Notice tone="blue">
              <strong>Sharpening notes:</strong> {customer.sharpenNotes}
            </Notice>
          </div>
        )}
        {customer.ownerNotes && (
          <div className="mt-2">
            <Notice tone="amber">
              <strong>Private notes:</strong> {customer.ownerNotes}
            </Notice>
          </div>
        )}
      </div>

      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([key, label]) => (
          <Link
            key={key}
            role="tab"
            aria-selected={tab === key}
            href={`/admin/customers/${id}?tab=${key}`}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              tab === key ? "border-ice-600 text-ice-700" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <SharpenDatalists />
      {sp.created && (
        <div className="mb-4">
          <Notice tone="green">Customer added. Add their skates below, or log a sharpen from the Sharpens tab.</Notice>
        </div>
      )}
      {sp.saved && (
        <div className="mb-4">
          <Notice tone="green">Sharpen updated.</Notice>
        </div>
      )}

      {tab === "sharpens" && <SharpensTab customer={customer} balance={balance} />}
      {tab === "credits" && <CreditsTab customerId={id} balance={balance} />}
      {tab === "profile" && <ProfileTab customer={customer} />}
    </>
  );
}

// ── Sharpens ─────────────────────────────────────────────────

type CustomerWithSkates = Prisma.CustomerGetPayload<{ include: { skates: true } }>;

async function SharpensTab({ customer, balance }: { customer: CustomerWithSkates; balance: number }) {
  const [services, sharpens] = await Promise.all([
    prisma.product.findMany({ where: { kind: "SERVICE", active: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] }),
    prisma.sharpening.findMany({
      where: { customerId: customer.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { skate: true },
    }),
  ]);
  const activeSkates = customer.skates.filter((s) => s.active);
  const lastWithSkate = sharpens[0];

  return (
    <div className="space-y-6">
      <Card title="Log a sharpen">
        <SharpenForm
          isNew
          action={saveSharpening.bind(null, customer.id, null)}
          services={services}
          skates={activeSkates.map((s) => ({ id: s.id, name: skateName(s), preferredHollow: s.preferredHollow }))}
          customerHollow={customer.preferredHollow}
          balance={balance}
          submitLabel="Log sharpen"
          defaults={{
            date: todayInput(),
            skateId: activeSkates.length === 1 ? activeSkates[0].id : (lastWithSkate?.skateId ?? null),
            productId: lastWithSkate?.productId ?? undefined,
            hollow: (activeSkates.length === 1 && activeSkates[0].preferredHollow) || customer.preferredHollow,
            profile: customer.preferredProfile,
          }}
        />
      </Card>

      <Card title={`History (${sharpens.length})`}>
        {sharpens.length === 0 ? (
          <EmptyState>No sharpens yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Service</Th>
                <Th>Skates</Th>
                <Th>Paid</Th>
                <Th className="text-right">Actions</Th>
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
                    {s.paymentMethod === "CREDIT" ? `${s.creditsUsed} credit${s.creditsUsed === 1 ? "" : "s"}` : formatMoney(s.priceChargedCents)}
                    <div className="text-xs text-slate-500">{PAYMENT_METHODS_SHORT[s.paymentMethod]}</div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex justify-end gap-1">
                      <LinkButton variant="secondary" size="sm" href={`/admin/customers/${customer.id}/sharpens/${s.id}`}>
                        Edit
                      </LinkButton>
                      <ActionForm
                        action={deleteSharpening.bind(null, customer.id, s.id)}
                        confirm={`Delete the ${formatDate(s.date)} sharpen?${s.creditsUsed ? ` ${s.creditsUsed} credit(s) will be returned to the card.` : ""}`}
                      >
                        <SubmitButton variant="danger" size="sm" pendingText="…">
                          Delete
                        </SubmitButton>
                      </ActionForm>
                    </div>
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

// ── Credits ──────────────────────────────────────────────────

async function CreditsTab({ customerId, balance }: { customerId: string; balance: number }) {
  const [cards, ledger] = await Promise.all([
    prisma.product.findMany({ where: { kind: "CARD", active: true }, orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }] }),
    prisma.creditTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { sharpening: { select: { date: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Sell a sharpening card">
          {cards.length === 0 ? (
            <Notice tone="amber">
              Add a sharpening card on the{" "}
              <Link className="underline" href="/admin/pricing">
                Pricing
              </Link>{" "}
              page first.
            </Notice>
          ) : (
            <ActionForm action={sellCard.bind(null, customerId)} resetOnSuccess className="space-y-4">
              <Field label="Card">
                <select name="productId" className={inputClass}>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.credits} credits for {formatMoney(c.priceCents)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Amount paid" hint="Leave blank for the card's list price.">
                <input name="amountPaid" inputMode="decimal" placeholder="List price" className={inputClass} />
              </Field>
              <Field label="Note (optional)">
                <input name="note" className={inputClass} placeholder="e.g. paid by e-transfer" />
              </Field>
              <SubmitButton pendingText="Adding…">Sell card &amp; add credits</SubmitButton>
            </ActionForm>
          )}
        </Card>

        <Card title="Adjust balance">
          <ActionForm action={adjustCredits.bind(null, customerId)} resetOnSuccess className="space-y-4">
            <p className="text-sm text-slate-600">
              Current balance: <strong>{balance}</strong>. Use a negative number to remove credits.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Credits (+/−)">
                <input name="delta" type="number" step={1} required placeholder="e.g. 2 or -1" className={inputClass} />
              </Field>
              <Field label="Type">
                <select name="reason" className={inputClass}>
                  <option value="ADJUSTMENT">Adjustment</option>
                  <option value="REFUND">Refund / goodwill</option>
                </select>
              </Field>
            </div>
            <Field label="Reason">
              <input name="note" required placeholder="e.g. Free sharpen for referral" className={inputClass} />
            </Field>
            <SubmitButton variant="secondary" pendingText="Saving…">
              Apply adjustment
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <Card title="Credit history">
        {ledger.length === 0 ? (
          <EmptyState>No credit activity yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>What</Th>
                <Th>Credits</Th>
                <Th>Paid</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {ledger.map((t) => (
                <tr key={t.id}>
                  <Td className="whitespace-nowrap">{t.sharpening ? formatDate(t.sharpening.date) : formatDateTime(t.createdAt)}</Td>
                  <Td>
                    <div className="font-medium text-slate-900">{CREDIT_REASONS[t.reason]}</div>
                    {t.note && <div className="text-xs text-slate-500">{t.note}</div>}
                  </Td>
                  <Td>
                    <span className={t.delta > 0 ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>
                      {t.delta > 0 ? `+${t.delta}` : t.delta}
                    </span>
                  </Td>
                  <Td>{t.amountPaidCents != null ? formatMoney(t.amountPaidCents) : <span className="text-slate-400">—</span>}</Td>
                  <Td className="text-right">
                    {!t.sharpeningId && (
                      <ActionForm action={deleteCreditTransaction.bind(null, customerId, t.id)} confirm="Delete this ledger entry? The balance will change accordingly.">
                        <SubmitButton variant="ghost" size="sm" pendingText="…">
                          Delete
                        </SubmitButton>
                      </ActionForm>
                    )}
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

// ── Profile & skates ─────────────────────────────────────────

function ProfileTab({ customer }: { customer: CustomerWithSkates & { user: { email: string } | null } }) {
  return (
    <div className="space-y-6">
      <Card title="Details & preferences">
        {customer.user && customer.user.email !== customer.email && (
          <div className="mb-4">
            <Notice tone="amber">This customer signs in as {customer.user.email}. Changing the email below doesn&apos;t change their login.</Notice>
          </div>
        )}
        <ActionForm action={updateCustomer.bind(null, customer.id)} className="space-y-6">
          <CustomerFields customer={customer} admin />
          <SubmitButton>Save details</SubmitButton>
        </ActionForm>
      </Card>

      <Card title={`Skates (${customer.skates.length})`}>
        <div className="space-y-3">
          {customer.skates.length === 0 && <EmptyState>No skates on file yet.</EmptyState>}
          {customer.skates.map((s) => (
            <details key={s.id} className="group rounded-lg border border-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span>
                  <span className="font-medium text-slate-900">{skateName(s)}</span>
                  <span className="ml-2 text-sm text-slate-500">
                    {[SKATE_TYPES[s.skateType], s.size && `size ${s.size}`, s.preferredHollow].filter(Boolean).join(" · ")}
                  </span>
                  {!s.active && (
                    <span className="ml-2">
                      <Badge>Retired</Badge>
                    </span>
                  )}
                </span>
                <span className="text-sm text-ice-700 group-open:hidden">Edit</span>
              </summary>
              <div className="border-t border-slate-200 p-4">
                <ActionForm action={saveSkate.bind(null, customer.id, s.id)} className="space-y-4">
                  <SkateFields skate={s} />
                  <SubmitButton size="sm">Save skates</SubmitButton>
                </ActionForm>
                <ActionForm action={deleteSkate.bind(null, customer.id, s.id)} confirm="Remove these skates? Past sharpens are kept." className="mt-3">
                  <SubmitButton variant="danger" size="sm" pendingText="Removing…">
                    Remove skates
                  </SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
        </div>
        <details className="mt-4 rounded-lg border border-dashed border-slate-300">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ice-700">+ Add skates</summary>
          <div className="border-t border-slate-200 p-4">
            <ActionForm action={saveSkate.bind(null, customer.id, null)} resetOnSuccess className="space-y-4">
              <SkateFields />
              <SubmitButton size="sm">Add skates</SubmitButton>
            </ActionForm>
          </div>
        </details>
      </Card>

      <Card title="Danger zone" className="border-red-200">
        <ActionForm
          action={deleteCustomer.bind(null, customer.id)}
          confirm={`Permanently delete ${fullName(customer)}, their skates, sharpening history and credits${customer.user ? ", and their login" : ""}? This can't be undone.`}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-slate-600">Deletes this customer, their skates, sharpening history and card credits{customer.user ? ", and their login" : ""}.</p>
          <SubmitButton variant="danger" pendingText="Deleting…">
            Delete customer
          </SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
