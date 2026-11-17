import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureCustomerForUser, parseOwnerEmails } from "@/lib/customer-link";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "OWNER" | "CUSTOMER";
  /** Signed in with a temporary password and must choose their own first. */
  mustChangePassword: boolean;
};

/** The signed-in user (with role), or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, emailVerified: true, role: true, mustChangePassword: true },
  });
  if (!user) return null;

  // Anyone listed in OWNER_EMAILS becomes an owner once their email is verified.
  if (user.role !== "OWNER" && user.emailVerified && parseOwnerEmails(process.env.OWNER_EMAILS).includes(user.email.toLowerCase())) {
    await prisma.user.update({ where: { id: user.id }, data: { role: "OWNER" } });
    user.role = "OWNER";
  }
  return user;
});

/** Use in owner-only pages, layouts and EVERY owner Server Action. */
export async function requireOwner() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.mustChangePassword) redirect("/auth/change-password");
  if (user.role !== "OWNER") redirect("/account");
  return user;
}

/**
 * Use in customer pages, layouts and EVERY customer Server Action. Returns the
 * signed-in user and *their own* customer record — customer actions must never
 * accept a customer id from the client.
 */
export const requireCustomer = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.mustChangePassword) redirect("/auth/change-password");
  if (!user.emailVerified) redirect("/auth/verify-email");
  const customer = await ensureCustomerForUser(prisma, user);
  return { user, customer };
});
