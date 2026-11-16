"use server";

import { prisma } from "@/lib/db";
import { requireCustomer } from "@/lib/authz";
import { runAction } from "@/lib/actions";
import { UserError } from "@/lib/credits";
import { customerSelfSchema, formToObject, skateSchema, type ActionState } from "@/lib/validation";

// Customer actions always act on the signed-in user's OWN customer record,
// never on an id sent from the browser.

export async function updateMyProfile(_: ActionState, formData: FormData) {
  const { customer, user } = await requireCustomer();
  return runAction(async () => {
    const data = customerSelfSchema.parse(formToObject(formData));
    await prisma.customer.update({ where: { id: customer.id }, data });
    await prisma.user.update({ where: { id: user.id }, data: { name: [data.firstName, data.lastName].filter(Boolean).join(" ") } });
    return { success: "Profile saved." };
  });
}

export async function saveMySkate(skateId: string | null, _: ActionState, formData: FormData) {
  const { customer } = await requireCustomer();
  return runAction(async () => {
    const data = skateSchema.parse(formToObject(formData));
    if (skateId) {
      const { count } = await prisma.skate.updateMany({ where: { id: skateId, customerId: customer.id }, data });
      if (!count) throw new UserError("Those skates no longer exist.");
      return { success: "Skates saved." };
    }
    await prisma.skate.create({ data: { ...data, customerId: customer.id } });
    return { success: "Skates added." };
  });
}

export async function deleteMySkate(skateId: string, _: ActionState, _formData: FormData) {
  const { customer } = await requireCustomer();
  return runAction(async () => {
    await prisma.skate.deleteMany({ where: { id: skateId, customerId: customer.id } });
    return { success: "Skates removed." };
  });
}
