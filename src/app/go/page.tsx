import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";

/** Post-login landing: sends owners to the admin and customers to their account. */
export default async function GoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/auth/change-password");
  if (!user.emailVerified) redirect("/auth/verify-email");
  redirect(user.role === "OWNER" ? "/admin" : "/account");
}
