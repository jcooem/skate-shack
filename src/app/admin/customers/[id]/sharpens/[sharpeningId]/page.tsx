import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { getBalance } from "@/lib/credits";
import { dateToInput, fullName, skateName } from "@/lib/format";
import { saveSharpening } from "@/app/admin/actions";
import { SharpenDatalists } from "@/components/form-fields";
import { SharpenForm } from "@/components/sharpen-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Edit sharpen" };

export default async function EditSharpenPage({ params }: PageProps<"/admin/customers/[id]/sharpens/[sharpeningId]">) {
  await requireOwner();
  const { id, sharpeningId } = await params;

  const sharpen = await prisma.sharpening.findFirst({
    where: { id: sharpeningId, customerId: id },
    include: { customer: { include: { skates: true } }, transaction: true },
  });
  if (!sharpen) notFound();

  const [balance, services] = await Promise.all([
    getBalance(prisma, id),
    prisma.product.findMany({
      // Include the sharpen's current service even if it has since been deactivated.
      where: { kind: "SERVICE", OR: [{ active: true }, ...(sharpen.productId ? [{ id: sharpen.productId }] : [])] },
      orderBy: [{ sortOrder: "asc" }, { priceCents: "asc" }],
    }),
  ]);
  const { customer } = sharpen;
  const skates = customer.skates.filter((s) => s.active || s.id === sharpen.skateId);

  return (
    <>
      <Link href={`/admin/customers/${id}?tab=sharpens`} className="text-sm text-slate-500 hover:text-slate-800">
        ← {fullName(customer)}
      </Link>
      <div className="mt-2">
        <PageHeader title="Edit sharpen" description={`Logged as “${sharpen.serviceName}”. Changing the payment updates the card balance automatically.`} />
      </div>
      <Card>
        <SharpenDatalists />
        <SharpenForm
          isNew={false}
          action={saveSharpening.bind(null, id, sharpen.id)}
          services={services}
          skates={skates.map((s) => ({ id: s.id, name: skateName(s), preferredHollow: s.preferredHollow }))}
          customerHollow={customer.preferredHollow}
          balance={balance}
          creditsAlreadyUsed={-(sharpen.transaction?.delta ?? 0)}
          submitLabel="Save changes"
          defaults={{
            date: dateToInput(sharpen.date),
            productId: sharpen.productId ?? undefined,
            skateId: sharpen.skateId,
            hollow: sharpen.hollow,
            profile: sharpen.profile,
            paymentMethod: sharpen.paymentMethod,
            priceChargedCents: sharpen.paymentMethod === "CREDIT" || sharpen.paymentMethod === "COMP" ? null : sharpen.priceChargedCents,
            notes: sharpen.notes,
          }}
        />
      </Card>
    </>
  );
}
