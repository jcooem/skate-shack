import type { Metadata } from "next";
import { requireOwner } from "@/lib/authz";
import { createCustomer } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CustomerFields, SharpenDatalists } from "@/components/form-fields";
import { Card, Checkbox, LinkButton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  await requireOwner();
  return (
    <>
      <PageHeader
        title="Add customer"
        description="Add their email to send them a private card link or a login, now or later from their page."
      />
      <Card>
        <SharpenDatalists />
        <ActionForm action={createCustomer} className="space-y-6">
          <CustomerFields admin />
          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-4">
            <legend className="px-1 text-sm font-semibold text-slate-800">Send by email (needs their email)</legend>
            <div>
              <Checkbox name="sendCardLink" label="Email them a private link to see their card balance and history (no login needed)" />
            </div>
            <div>
              <Checkbox name="sendLoginInvite" label="Email them a login with a temporary password" />
            </div>
          </fieldset>
          <div className="flex gap-2">
            <SubmitButton pendingText="Adding…">Add customer</SubmitButton>
            <LinkButton href="/admin/customers" variant="ghost">
              Cancel
            </LinkButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
