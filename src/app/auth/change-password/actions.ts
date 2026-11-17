"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import type { ActionState } from "@/lib/validation";

/** Replaces a temporary password with one the person chooses. */
export async function changeTempPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (newPassword.length < 8) return { error: "Your new password needs at least 8 characters." };
  if (newPassword !== confirm) return { error: "The new passwords don't match." };
  if (newPassword === currentPassword) return { error: "Choose a password that's different from the temporary one." };

  try {
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (err) {
    if (isAPIError(err)) {
      return { error: err.status === "BAD_REQUEST" || err.status === "UNAUTHORIZED" ? "The temporary password isn't right." : err.message };
    }
    console.error("changeTempPassword failed", err);
    return { error: "Something went wrong. Please try again." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { mustChangePassword: false, tempPasswordExpiresAt: null },
  });
  redirect("/go");
}
