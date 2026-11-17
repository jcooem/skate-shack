import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { parseOwnerEmails } from "@/lib/customer-link";
import { formatDate } from "@/lib/format";
import { addOwner, removeOwner, resetOwnerPassword } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, Field, inputClass, Notice, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Owners" };

export default async function OwnersPage({ searchParams }: PageProps<"/admin/owners">) {
  const me = await requireOwner();
  const { removed } = await searchParams;
  const owners = await prisma.user.findMany({
    where: { role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: true,
      accounts: { select: { providerId: true } },
    },
  });
  const listed = parseOwnerEmails(process.env.OWNER_EMAILS);
  const now = new Date();

  return (
    <>
      <PageHeader title="Owners" description="Owners can use everything in this admin area: customers, credits, pricing and settings." />

      <div className="space-y-6">
        {typeof removed === "string" && (
          <div role="status">
            <Notice tone="green">{removed} is no longer an owner and has been signed out.</Notice>
          </div>
        )}
        <Card title="Current owners">
          <ul className="divide-y divide-slate-100">
            {owners.map((o) => {
              const isMe = o.id === me.id;
              const expired = Boolean(o.mustChangePassword && o.tempPasswordExpiresAt && o.tempPasswordExpiresAt < now);
              const signIn = o.accounts.map((a) => (a.providerId === "credential" ? "password" : a.providerId)).join(", ");
              return (
                <li key={o.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{o.name && o.name !== o.email ? o.name : o.email}</span>
                    {isMe && <Badge tone="blue">You</Badge>}
                    {o.mustChangePassword && <Badge tone={expired ? "red" : "amber"}>{expired ? "Temporary password expired" : "Waiting for first sign-in"}</Badge>}
                    {listed.includes(o.email.toLowerCase()) && <Badge>In OWNER_EMAILS</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {o.name && o.name !== o.email && <>{o.email} · </>}
                    Owner since {formatDate(o.createdAt)}
                    {signIn && <> · signs in with {signIn}</>}
                  </p>
                  {!isMe && (
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <ActionForm
                        action={resetOwnerPassword.bind(null, o.id)}
                        confirm={`Give ${o.email} a new temporary password? Their current password will stop working and they'll be signed out.`}
                      >
                        <SubmitButton variant="secondary" size="sm" pendingText="Creating…">
                          New temporary password
                        </SubmitButton>
                      </ActionForm>
                      <ActionForm action={removeOwner.bind(null, o.id)} confirm={`Remove ${o.email} as an owner? They'll be signed out and lose access to admin.`}>
                        <SubmitButton variant="ghost" size="sm" pendingText="Removing…">
                          Remove owner
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Add an owner">
          <p className="mb-4 text-sm text-slate-600">
            No email is sent. You&apos;ll get a temporary password on screen to give them in person or by text. They sign in with
            their email and that password, then choose their own. If the email already has a login, it just becomes an owner and
            keeps its password.
          </p>
          <ActionForm action={addOwner} resetOnSuccess className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input name="email" type="email" required autoComplete="off" className={inputClass} />
              </Field>
              <Field label="Name" hint="Optional.">
                <input name="name" autoComplete="off" className={inputClass} />
              </Field>
            </div>
            <SubmitButton pendingText="Adding…">Add owner</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
