import "server-only";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { UserError } from "@/lib/credits";
import { actionEmail, sendEmail } from "@/lib/email";
import { fullName } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { parseOwnerEmails } from "@/lib/customer-link";
import { createShareToken, shareUrl, siteUrl } from "@/lib/share-link";
import { generateTempPassword, TEMP_PASSWORD_DAYS } from "@/lib/temp-password";

// Owner-only operations. Callers must have already checked requireOwner().

/**
 * Makes a new private card link for a customer, replacing (and so disabling)
 * any previous one. Optionally emails it. Returns the link so the owner can
 * copy it. It can't be shown again later because only its hash is stored.
 */
export async function issueCardLink(customerId: string, { email }: { email: boolean }) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { firstName: true, email: true } });
  if (!customer) throw new UserError("That customer no longer exists.");
  if (email && !customer.email) throw new UserError("Add an email address to this customer first.");

  const { token, hash } = createShareToken();
  await prisma.customer.update({
    where: { id: customerId },
    data: { shareTokenHash: hash, shareTokenCreatedAt: new Date() },
  });
  const url = shareUrl(token);

  if (email && customer.email) {
    const { businessName } = await getSettings();
    await sendEmail({
      to: customer.email,
      subject: `Your ${businessName} sharpening card`,
      ...actionEmail({
        businessName,
        heading: "Your sharpening card",
        body: `Hi ${customer.firstName}, here's your private link to check your card balance and sharpening history any time. No login needed. Bookmark it for later.`,
        cta: "View my card",
        url,
        footer: "Keep this link private: anyone who has it can see your card balance and sharpening history. If you think someone else has it, ask us for a new one.",
      }),
    });
  }
  return { url, sentTo: email ? customer.email : null };
}

export async function disableCardLink(customerId: string) {
  await prisma.customer.update({
    where: { id: customerId },
    data: { shareTokenHash: null, shareTokenCreatedAt: null },
  });
}

/**
 * Creates (or resets) a customer's login with a temporary password and emails
 * it. They must choose their own password the first time they sign in, and
 * the temporary one stops working after TEMP_PASSWORD_DAYS.
 */
export async function sendLoginInvite(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, include: { user: true } });
  if (!customer) throw new UserError("That customer no longer exists.");

  let user = customer.user;
  if (!user) {
    if (!customer.email) throw new UserError("Add an email address to this customer first.");
    const existing = await prisma.user.findUnique({ where: { email: customer.email }, include: { customer: true } });
    if (existing?.customer) throw new UserError("That email is already the login for a different customer.");
    user =
      existing ??
      (await prisma.user.create({
        // The temporary password is delivered to this inbox, so signing in with it proves ownership.
        data: { email: customer.email, name: fullName(customer) || customer.email, emailVerified: true },
      }));
  }
  if (user.role === "OWNER") throw new UserError("That email belongs to an owner login, so it can't be reset from here.");

  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  const userId = user.id;

  await prisma.$transaction(async (tx) => {
    await applyTempPassword(tx, userId, hash);
    await tx.customer.update({ where: { id: customerId }, data: { userId } });
  });

  const { businessName } = await getSettings();
  await sendEmail({
    to: user.email,
    subject: `Your ${businessName} login`,
    ...actionEmail({
      businessName,
      heading: "Your login is ready",
      body: `Hi ${customer.firstName}, you can now sign in to see your sharpening history, card balance and skate preferences. Sign in with this email address and the temporary password below. You'll choose your own password right after.`,
      code: { label: "Temporary password", value: tempPassword },
      cta: "Sign in",
      url: `${siteUrl()}/login`,
      footer: `The temporary password stops working after ${TEMP_PASSWORD_DAYS} days. If it expires, just ask us for a new one.`,
    }),
  });
  return { sentTo: user.email };
}

// ── Shared temporary-password helpers ────────────────────────

async function hashPassword(password: string) {
  const ctx = await auth.$context;
  return ctx.password.hash(password);
}

/**
 * Sets a (hashed) temporary password on a login: creates or updates its
 * email/password account, forces a password change on next sign-in, sets the
 * expiry and signs out every existing session.
 */
async function applyTempPassword(tx: Prisma.TransactionClient, userId: string, hash: string) {
  const credential = await tx.account.findFirst({ where: { userId, providerId: "credential" } });
  if (credential) {
    await tx.account.update({ where: { id: credential.id }, data: { password: hash } });
  } else {
    await tx.account.create({ data: { userId, accountId: userId, providerId: "credential", password: hash } });
  }
  await tx.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      mustChangePassword: true,
      tempPasswordExpiresAt: new Date(Date.now() + TEMP_PASSWORD_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  // Sign out any existing sessions: the old password no longer applies.
  await tx.session.deleteMany({ where: { userId } });
}

// ── Owners ───────────────────────────────────────────────────
// Nothing here sends email: the temporary password is returned so the owner
// adding them can pass it on in person or by text.

/**
 * Makes `email` an owner. A new login gets a temporary password (returned).
 * An existing verified login is just promoted and keeps its password; an
 * unverified one gets a temporary password too, since nobody has proven they
 * own that inbox.
 */
export async function addOwner(email: string, name: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing?.role === "OWNER") throw new UserError(`${email} is already an owner.`);

  if (existing?.emailVerified) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: existing.id }, data: { role: "OWNER" } }),
      // Make them sign in again so the new role applies everywhere at once.
      prisma.session.deleteMany({ where: { userId: existing.id } }),
    ]);
    return { tempPassword: null };
  }

  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  await prisma.$transaction(async (tx) => {
    const user = existing
      ? await tx.user.update({ where: { id: existing.id }, data: { role: "OWNER", ...(name ? { name } : {}) } })
      : await tx.user.create({ data: { email, name: name || email, role: "OWNER", emailVerified: true } });
    await applyTempPassword(tx, user.id, hash);
  });
  return { tempPassword };
}

async function findOtherOwner(userId: string, currentUserId: string) {
  if (userId === currentUserId) throw new UserError("You can't do that to your own login.");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
  if (!user || user.role !== "OWNER") throw new UserError("That owner no longer exists.");
  return user;
}

/** Gives another owner a new temporary password (e.g. they lost the first one). */
export async function resetOwnerPassword(userId: string, currentUserId: string) {
  const user = await findOtherOwner(userId, currentUserId);
  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  await prisma.$transaction((tx) => applyTempPassword(tx, user.id, hash));
  return { email: user.email, tempPassword };
}

/** Turns another owner back into an ordinary login and signs them out. */
export async function removeOwner(userId: string, currentUserId: string) {
  const user = await findOtherOwner(userId, currentUserId);
  if (parseOwnerEmails(process.env.OWNER_EMAILS).includes(user.email.toLowerCase())) {
    throw new UserError(
      `${user.email} is listed in OWNER_EMAILS, so they'd become an owner again next time they sign in. Remove it from OWNER_EMAILS (Render → Environment) first.`,
    );
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { role: "CUSTOMER" } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  return { email: user.email };
}
