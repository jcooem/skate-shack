import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { centsToInput, formatMoney, plural } from "@/lib/format";
import { deleteProduct, saveProduct } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Badge, Card, Checkbox, EmptyState, Field, inputClass, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Pricing" };

type ProductLike = {
  kind: "SERVICE" | "CARD";
  name: string;
  description: string;
  priceCents: number;
  credits: number;
  sortOrder: number;
  active: boolean;
  showOnPublicPage: boolean;
};

function ProductFields({ product, kind }: { product?: ProductLike; kind: "SERVICE" | "CARD" }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <input type="hidden" name="kind" value={kind} />
      <Field label="Name" className="sm:col-span-2">
        <input
          name="name"
          required
          defaultValue={product?.name}
          placeholder={kind === "CARD" ? "e.g. 10-sharpen card" : "e.g. Standard sharpen"}
          className={inputClass}
        />
      </Field>
      <Field label="Price">
        <input name="price" required inputMode="decimal" defaultValue={product ? centsToInput(product.priceCents) : ""} placeholder="15.00" className={inputClass} />
      </Field>
      <Field
        label={kind === "CARD" ? "Sharpens included" : "Credits used"}
        hint={kind === "CARD" ? "Credits added to the customer's card." : "Credits deducted when paid with a card."}
      >
        <input name="credits" type="number" min={1} required defaultValue={product?.credits ?? (kind === "CARD" ? 10 : 1)} className={inputClass} />
      </Field>
      <Field label="Description (shown on the public page)" className="sm:col-span-2 lg:col-span-3">
        <input name="description" defaultValue={product?.description} className={inputClass} />
      </Field>
      <Field label="Display order" hint="Lower numbers first.">
        <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-6 sm:col-span-2 lg:col-span-4">
        <Checkbox name="active" label="Available to sell" defaultChecked={product?.active ?? true} />
        <Checkbox name="showOnPublicPage" label="Show on public page" defaultChecked={product?.showOnPublicPage ?? true} />
      </div>
    </div>
  );
}

export default async function PricingPage() {
  await requireOwner();
  const products = await prisma.product.findMany({ orderBy: [{ kind: "desc" }, { sortOrder: "asc" }, { priceCents: "asc" }] });

  const sections: { kind: "SERVICE" | "CARD"; title: string; blurb: string }[] = [
    { kind: "SERVICE", title: "Sharpening services", blurb: "Single sharpens and other services you log against a customer." },
    { kind: "CARD", title: "Sharpening cards", blurb: "Prepaid cards. Selling one adds credits to the customer's balance." },
  ];

  return (
    <>
      <PageHeader
        title="Pricing"
        description="Change prices any time — past sharpens and card sales keep the price they were sold at."
      />
      <div className="space-y-8">
        {sections.map((section) => {
          const items = products.filter((p) => p.kind === section.kind);
          return (
            <Card key={section.kind} title={section.title}>
              <p className="-mt-2 mb-4 text-sm text-slate-600">{section.blurb}</p>
              <div className="space-y-3">
                {items.length === 0 && <EmptyState>Nothing here yet.</EmptyState>}
                {items.map((p) => (
                  <details key={p.id} className="group rounded-lg border border-slate-200">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">{p.name}</span>
                        <span className="text-slate-600">{formatMoney(p.priceCents)}</span>
                        <span className="text-sm text-slate-500">
                          {p.kind === "CARD" ? plural(p.credits, "sharpen") : `${plural(p.credits, "credit")} from a card`}
                        </span>
                        {!p.active && <Badge tone="amber">Not available</Badge>}
                        {!p.showOnPublicPage && <Badge>Hidden from public page</Badge>}
                      </span>
                      <span className="text-sm text-ice-700 group-open:hidden">Edit</span>
                    </summary>
                    <div className="border-t border-slate-200 p-4">
                      <ActionForm action={saveProduct.bind(null, p.id)} className="space-y-4">
                        <ProductFields product={p} kind={p.kind} />
                        <SubmitButton size="sm">Save</SubmitButton>
                      </ActionForm>
                      <ActionForm
                        action={deleteProduct.bind(null, p.id)}
                        confirm={`Delete “${p.name}”? Past sharpens and sales keep their details. Tip: untick “Available to sell” to hide it without deleting.`}
                        className="mt-3"
                      >
                        <SubmitButton variant="danger" size="sm" pendingText="Deleting…">
                          Delete
                        </SubmitButton>
                      </ActionForm>
                    </div>
                  </details>
                ))}
              </div>
              <details className="mt-4 rounded-lg border border-dashed border-slate-300">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ice-700">
                  + Add {section.kind === "CARD" ? "a sharpening card" : "a service"}
                </summary>
                <div className="border-t border-slate-200 p-4">
                  <ActionForm action={saveProduct.bind(null, null)} resetOnSuccess className="space-y-4">
                    <ProductFields kind={section.kind} />
                    <SubmitButton size="sm">Add</SubmitButton>
                  </ActionForm>
                </div>
              </details>
            </Card>
          );
        })}
      </div>
    </>
  );
}
