import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { enabledSocialProviders } from "@/lib/auth";
import { getCurrentUser } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Sign in" };

const OAUTH_ERRORS: Record<string, string> = {
  account_not_linked:
    "That email has a login here, but we couldn't connect this sign-in method automatically. Sign in with your email and password, then connect it from your profile.",
  signup_disabled: "There's no login for that account yet. Ask us at the shop and we'll email you one.",
  unable_to_link_account: "We couldn't connect that sign-in to your existing account. Try signing in with your email instead.",
  email_not_found: "That provider didn't share an email address with us. Try another sign-in method.",
  email_not_verified: "Please confirm your email address before signing in.",
  access_denied: "Sign-in was cancelled.",
};

function safeNext(next: string | string[] | undefined) {
  const value = Array.isArray(next) ? next[0] : next;
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/go";
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const user = await getCurrentUser();
  if (user) redirect(next);

  const [settings, ownerCount] = await Promise.all([getSettings(), prisma.user.count({ where: { role: "OWNER" } })]);
  const rawError = typeof params.error === "string" ? params.error.toLowerCase().replace(/\s+/g, "_") : "";
  const error = rawError ? (OAUTH_ERRORS[rawError] ?? "Sign-in didn't work. Please try again.") : undefined;
  const notice = params.reset ? "Your password is set. Sign in below." : undefined;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center font-display text-4xl font-bold uppercase tracking-wide text-slate-900">Welcome back</h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        Sign in to see your sharpening history and {settings.businessName} card balance.
      </p>
      <LoginPanel
        providers={enabledSocialProviders}
        next={next}
        initialError={error}
        initialNotice={notice}
        ownerSetup={ownerCount === 0}
      />
    </main>
  );
}
