import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserError } from "@/lib/credits";
import { actionEmail, sendEmail } from "@/lib/email";
import { fullName } from "@/lib/format";
import { getSettings } from "@/lib/settings";
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
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(tempPassword);
  const userId = user.id;

  await prisma.$transaction(async (tx) => {
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
