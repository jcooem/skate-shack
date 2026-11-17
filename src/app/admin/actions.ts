"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/authz";
import { runAction } from "@/lib/actions";
import * as credits from "@/lib/credits";
import { UserError } from "@/lib/credits";
import * as access from "@/lib/customer-access";
import {
  adjustCreditsSchema,
  customerAdminSchema,
  formToObject,
  ownerSchema,
  productSchema,
  sellCardSchema,
  settingsSchema,
  sharpeningSchema,
  skateSchema,
  type ActionState,
} from "@/lib/validation";

// Every action here starts with requireOwner(): Server Actions are public
// HTTP endpoints, so the check must happen in the action, not just the page.

async function assertCustomer(customerId: string) {
  const exists = await prisma.customer.count({ where: { id: customerId } });
  if (!exists) throw new UserError("That customer no longer exists.");
}

// ── Customers ────────────────────────────────────────────────

export async function createCustomer(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const sendCardLink = formData.get("sendCardLink") === "on";
  const sendInvite = formData.get("sendLoginInvite") === "on";
  let id = "";
  const sent: string[] = [];
  let sendFailed = false;
  const result = await runAction(async () => {
    const data = customerAdminSchema.parse(formToObject(formData));
    if ((sendCardLink || sendInvite) && !data.email) throw new UserError("Add their email address to send them a card link or login.");
    const customer = await prisma.customer.create({ data });
    id = customer.id;
  });
  if (result?.error) return result;

  // The customer is saved either way; an email problem is reported on their page.
  try {
    if (sendCardLink) {
      await access.issueCardLink(id, { email: true });
      sent.push("card");
    }
    if (sendInvite) {
      await access.sendLoginInvite(id);
      sent.push("login");
    }
  } catch (err) {
    console.error("Sending welcome emails failed", err);
    sendFailed = true;
  }
  const params = new URLSearchParams({ tab: "profile", created: "1" });
  if (sent.length) params.set("sent", sent.join(","));
  if (sendFailed) params.set("sendFailed", "1");
  redirect(`/admin/customers/${id}?${params}`);
}

export async function updateCustomer(customerId: string, _: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const data = customerAdminSchema.parse(formToObject(formData));
    await prisma.customer.update({ where: { id: customerId }, data });
    return { success: "Customer saved." };
  });
}

export async function deleteCustomer(customerId: string, _: ActionState, _formData: FormData): Promise<ActionState> {
  await requireOwner();
  const result = await runAction(async () => {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, include: { user: true } });
    if (!customer) throw new UserError("That customer no longer exists.");
    await prisma.$transaction(async (tx) => {
      await tx.customer.delete({ where: { id: customerId } }); // cascades skates, sharpens, ledger
      // Also remove their login (never an owner's).
      if (customer.user && customer.user.role === "CUSTOMER") await tx.user.delete({ where: { id: customer.user.id } });
    });
  });
  if (result?.error) return result;
  revalidatePath("/admin", "layout");
  redirect("/admin/customers?deleted=1");
}

// ── Card link & login ────────────────────────────────────────

export async function emailCardLink(customerId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const { url, sentTo } = await access.issueCardLink(customerId, { email: true });
    return { success: `Emailed a new card link to ${sentTo}. Any older link no longer works.`, link: url };
  });
}

export async function createCardLink(customerId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const { url } = await access.issueCardLink(customerId, { email: false });
    return { success: "New card link created. Copy it now — it can't be shown again. Any older link no longer works.", link: url };
  });
}

export async function disableCardLink(customerId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await assertCustomer(customerId);
    await access.disableCardLink(customerId);
    return { success: "Card link turned off. It no longer works." };
  });
}

export async function emailLoginInvite(customerId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const { sentTo } = await access.sendLoginInvite(customerId);
    return { success: `Emailed a temporary password to ${sentTo}. It works for 7 days.` };
  });
}

// ── Owners ───────────────────────────────────────────────────

const ownerPasswordNote = "Give it to them in person or by text: it isn't emailed and can't be shown again. They sign in at the usual Sign in page and choose their own password right away. It stops working after 7 days.";

export async function addOwner(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  return runAction(async () => {
    const { email, name } = ownerSchema.parse(formToObject(formData));
    const { tempPassword } = await access.addOwner(email, name);
    if (!tempPassword) {
      return { success: `${email} already had a login and is now an owner. They keep their current password (or Google sign-in).` };
    }
    return {
      success: `${email} is now an owner. Here's their temporary password. ${ownerPasswordNote}`,
      secret: { label: "Temporary password", value: tempPassword },
    };
  });
}

export async function resetOwnerPassword(userId: string, _: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await requireOwner();
  return runAction(async () => {
    const { email, tempPassword } = await access.resetOwnerPassword(userId, me.id);
    return {
      success: `New temporary password for ${email}. Their old password no longer works. ${ownerPasswordNote}`,
      secret: { label: "Temporary password", value: tempPassword },
    };
  });
}

export async function removeOwner(userId: string, _: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await requireOwner();
  let email = "";
  const result = await runAction(async () => {
    ({ email } = await access.removeOwner(userId, me.id));
  });
  if (result?.error) return result;
  // Their row (and this form) disappears, so show the confirmation on the page instead.
  redirect(`/admin/owners?removed=${encodeURIComponent(email)}`);
}

// ── Skates ───────────────────────────────────────────────────

export async function saveSkate(customerId: string, skateId: string | null, _: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await assertCustomer(customerId);
    const data = skateSchema.parse(formToObject(formData));
    if (skateId) {
      const { count } = await prisma.skate.updateMany({ where: { id: skateId, customerId }, data });
      if (!count) throw new UserError("Those skates no longer exist.");
      return { success: "Skates saved." };
    }
    await prisma.skate.create({ data: { ...data, customerId } });
    return { success: "Skates added." };
  });
}

export async function deleteSkate(customerId: string, skateId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await prisma.skate.deleteMany({ where: { id: skateId, customerId } });
    return { success: "Skates removed." };
  });
}

// ── Sharpens ─────────────────────────────────────────────────

export async function saveSharpening(customerId: string, sharpeningId: string | null, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireOwner();
  const result = await runAction(async () => {
    await assertCustomer(customerId);
    const input = sharpeningSchema.parse(formToObject(formData));
    await credits.saveSharpening(prisma, {
      id: sharpeningId ?? undefined,
      customerId,
      skateId: input.skateId,
      productId: input.productId,
      date: input.date,
      hollow: input.hollow,
      profile: input.profile,
      paymentMethod: input.paymentMethod,
      priceChargedCents: input.priceCharged,
      notes: input.notes,
    });
    return { success: input.paymentMethod === "CREDIT" ? "Sharpen logged and credits deducted." : "Sharpen logged." };
  });
  if (sharpeningId && result?.success) redirect(`/admin/customers/${customerId}?tab=sharpens&saved=1`);
  return result;
}

export async function deleteSharpening(customerId: string, sharpeningId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await credits.deleteSharpening(prisma, { customerId, sharpeningId });
    return { success: "Sharpen deleted. Any credits it used were returned." };
  });
}

// ── Credits ──────────────────────────────────────────────────

export async function sellCard(customerId: string, _: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await assertCustomer(customerId);
    const input = sellCardSchema.parse(formToObject(formData));
    const tx = await credits.sellCard(prisma, {
      customerId,
      productId: input.productId,
      amountPaidCents: input.amountPaid,
      note: input.note || undefined,
    });
    return { success: `Card sold — ${tx.delta} credits added.` };
  });
}

export async function adjustCredits(customerId: string, _: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await assertCustomer(customerId);
    const input = adjustCreditsSchema.parse(formToObject(formData));
    await credits.adjustCredits(prisma, { customerId, delta: input.delta, note: input.note, reason: input.reason });
    return { success: `Balance ${input.delta > 0 ? "increased" : "reduced"} by ${Math.abs(input.delta)}.` };
  });
}

export async function deleteCreditTransaction(customerId: string, transactionId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    await credits.deleteCreditTransaction(prisma, { customerId, transactionId });
    return { success: "Ledger entry deleted." };
  });
}

// ── Pricing ──────────────────────────────────────────────────

export async function saveProduct(productId: string | null, _: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const data = productSchema.parse(formToObject(formData));
    if (productId) {
      await prisma.product.update({ where: { id: productId }, data });
      return { success: `${data.name} saved.` };
    }
    await prisma.product.create({ data });
    return { success: `${data.name} added.` };
  });
}

export async function deleteProduct(productId: string, _: ActionState, _formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    // Past sharpens keep their own copy of the service name and price.
    await prisma.product.delete({ where: { id: productId } });
    return { success: "Product deleted." };
  });
}

// ── Settings & branding ──────────────────────────────────────

const MAX_LOGO_BYTES = 1024 * 1024;

/** Identify an image from its first bytes rather than trusting the browser-supplied type. */
function sniffImageType(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function saveSettings(_: ActionState, formData: FormData) {
  await requireOwner();
  return runAction(async () => {
    const data = settingsSchema.parse(formToObject(formData));

    let logo: { logo: Uint8Array<ArrayBuffer> | null; logoMime: string | null; logoUpdatedAt: Date | null } | undefined;
    const file = formData.get("logo");
    if (formData.get("removeLogo") === "on") {
      logo = { logo: null, logoMime: null, logoUpdatedAt: null };
    } else if (file instanceof File && file.size > 0) {
      if (file.size > MAX_LOGO_BYTES) throw new UserError("The logo must be 1 MB or smaller.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = sniffImageType(bytes);
      if (!mime) throw new UserError("The logo must be a PNG, JPG or WebP image.");
      logo = { logo: bytes, logoMime: mime, logoUpdatedAt: new Date() };
    }

    await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data, ...logo },
      update: { ...data, ...logo },
    });
    return { success: "Settings saved." };
  });
}
