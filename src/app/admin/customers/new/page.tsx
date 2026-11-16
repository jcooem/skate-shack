import type { Metadata } from "next";
import { requireOwner } from "@/lib/authz";
import { createCustomer } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { CustomerFields, SharpenDatalists } from "@/components/form-fields";
import { Card, LinkButton, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  await requireOwner();
  return (
    <>
      <PageHeader
        title="Add customer"
        description="If you add their email, they can sign in later and see everything you log for them."
      />
      <Card>
        <SharpenDatalists />
        <ActionForm action={createCustomer} className="space-y-6">
          <CustomerFields admin />
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
