import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/authz";
import { enabledSocialProviders } from "@/lib/auth";
import { SKATE_TYPES } from "@/lib/constants";
import { skateName } from "@/lib/format";
import { deleteMySkate, saveMySkate, updateMyProfile } from "@/app/account/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CustomerFields, SharpenDatalists, SkateFields } from "@/components/form-fields";
import { Badge, Card, EmptyState, Notice } from "@/components/ui";
import { ConnectedAccounts } from "./connected-accounts";

export const metadata: Metadata = { title: "Profile & skates" };

export default async function ProfilePage({ searchParams }: PageProps<"/account/profile">) {
  const { customer, user } = await requireCustomer();
  const sp = await searchParams;
  const [skates, accounts] = await Promise.all([
    prisma.skate.findMany({ where: { customerId: customer.id }, orderBy: [{ active: "desc" }, { createdAt: "asc" }] }),
    prisma.account.findMany({ where: { userId: user.id }, select: { providerId: true } }),
  ]);

  return (
    <div className="space-y-6">
      <SharpenDatalists />
      <Card title="Your details & preferences">
        <p className="-mt-2 mb-4 text-sm text-slate-600">
          Signed in as <strong>{user.email}</strong>. Your preferences help us sharpen your skates exactly how you like them.
        </p>
        <ActionForm action={updateMyProfile} className="space-y-6">
          <CustomerFields customer={customer} />
          <SubmitButton>Save profile</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Your skates">
        <div className="space-y-3">
          {skates.length === 0 && <EmptyState>Add your skates so we know what we&apos;re working with.</EmptyState>}
          {skates.map((s) => (
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
                <ActionForm action={saveMySkate.bind(null, s.id)} className="space-y-4">
                  <SkateFields skate={s} />
                  <SubmitButton size="sm">Save skates</SubmitButton>
                </ActionForm>
                <ActionForm action={deleteMySkate.bind(null, s.id)} confirm="Remove these skates from your profile?" className="mt-3">
                  <SubmitButton variant="danger" size="sm" pendingText="Removing…">
                    Remove
                  </SubmitButton>
                </ActionForm>
              </div>
            </details>
          ))}
        </div>
        <details className="mt-4 rounded-lg border border-dashed border-slate-300" open={skates.length === 0}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ice-700">+ Add skates</summary>
          <div className="border-t border-slate-200 p-4">
            <ActionForm action={saveMySkate.bind(null, null)} resetOnSuccess className="space-y-4">
              <SkateFields />
              <SubmitButton size="sm">Add skates</SubmitButton>
            </ActionForm>
          </div>
        </details>
      </Card>

      {enabledSocialProviders.length > 0 && (
        <Card title="Sign-in methods">
          {typeof sp.error === "string" && (
            <div className="mb-4">
              <Notice tone="red">
                {sp.error.includes("already_linked")
                  ? "That account is already connected to a different login."
                  : sp.error.includes("email_does_not_match")
                    ? "That account uses a different email address than this one."
                    : "We couldn't connect that account. Please try again."}
              </Notice>
            </div>
          )}
          <ConnectedAccounts
            providers={enabledSocialProviders}
            connected={accounts.map((a) => a.providerId)}
            hasPassword={accounts.some((a) => a.providerId === "credential")}
          />
        </Card>
      )}
    </div>
  );
}
