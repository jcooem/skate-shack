"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { emailSchema, firstIssue, formToObject, type ActionState } from "@/lib/validation";

/**
 * "Forgot password": emails a link to choose a new password, for people who
 * already have a login. (Logins are created by the owner, never here.)
 * The response is identical whether or not the email is known.
 */
export async function requestSetPasswordLink(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = emailSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { email } = parsed.data;

  const generic: ActionState = {
    success: `If ${email} has a login with us, we've emailed a link to choose a new password. It may take a minute to arrive — check your spam folder too.`,
  };

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return generic;

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
