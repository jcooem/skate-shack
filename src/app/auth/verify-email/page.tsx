import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { ResendVerification } from "./resend-verification";

export const metadata: Metadata = { title: "Confirm your email" };

/** Shown to signed-in users whose email isn't confirmed (e.g. a social provider that didn't verify it). */
export default async function VerifyEmailPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.emailVerified) redirect("/go");

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center font-display text-4xl font-bold uppercase tracking-wide text-slate-900">Confirm your email</h1>
      <div className="mt-8 space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
        <p>
          Before we can show your account we need to confirm that <strong>{user.email}</strong> belongs to you. We&apos;ll email you a
          link — just click it and you&apos;re in.
        </p>
        <ResendVerification email={user.email} />
        <p className="text-slate-500">
          Wrong email?{" "}
          <Link href="/login" className="text-ice-700 hover:underline">
            Sign in a different way
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
