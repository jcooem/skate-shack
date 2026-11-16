"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { emailSchema, firstIssue, formToObject, type ActionState } from "@/lib/validation";

/**
 * "First time here / forgot password": emails a link to choose a password.
 *
 * If the owner already created a customer with this email but the person has
 * never signed in, a login (with an unverified email) is created first, so the
 * emailed link both proves they own the inbox and sets their password.
 * The response is identical whether or not the email is known.
 */
export async function requestSetPasswordLink(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { email } = parsed.data;

  const generic: ActionState = {
    success: `If ${email} is on file with us, we've emailed a link to set your password. It may take a minute to arrive — check your spam folder too. New here? Use "Create account" instead.`,
  };

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const customer = await prisma.customer.findUnique({ where: { email } });
      if (!customer || customer.userId) return generic;
      user = await prisma.user.create({
        data: { email, name: fullName(customer) || email, emailVerified: false },
      });
    }

    // Light throttle: at most one link per minute per account.
    const recent = await prisma.verification.findFirst({
      where: {
        value: user.id,
        identifier: { startsWith: "reset-password:" },
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) return generic;

    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/auth/set-password" } });
  } catch (err) {
    console.error("requestSetPasswordLink failed", err);
    return { error: "Something went wrong sending the email. Please try again in a moment." };
  }
  return generic;
}
