import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@/components/ui";
import { SetPasswordForm } from "./set-password-form";

export const metadata: Metadata = { title: "Choose a password" };

export default async function SetPasswordPage({ searchParams }: PageProps<"/auth/set-password">) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token && !error;

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center font-display text-4xl font-bold uppercase tracking-wide text-slate-900">Choose a password</h1>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {valid ? (
          <SetPasswordForm token={token} />
        ) : (
          <div className="space-y-4">
            <Notice tone="amber">This link has expired or was already used.</Notice>
            <p className="text-sm text-slate-600">
              Go back to{" "}
              <Link href="/login" className="text-ice-700 hover:underline">
                sign in
              </Link>{" "}
              and choose “Forgot password?” to get a fresh link.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
