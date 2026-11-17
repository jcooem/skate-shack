import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, inputClass } from "@/components/ui";
import { changeTempPassword } from "./actions";

export const metadata: Metadata = { title: "Choose your password" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect("/go");

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-center font-display text-4xl font-bold uppercase tracking-wide text-slate-900">Choose your password</h1>
      <p className="mt-2 text-center text-sm text-slate-600">
        You signed in with a temporary password. Pick your own to finish setting up your account.
      </p>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ActionForm action={changeTempPassword} className="space-y-4">
          <input type="email" name="username" value={user.email} autoComplete="username" readOnly hidden />
          <Field label="Temporary password" hint="The one from your email.">
            <input name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <Field label="New password" hint="At least 8 characters.">
            <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <Field label="Confirm new password">
            <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <SubmitButton pendingText="Saving…" className="w-full">
            Save password
          </SubmitButton>
        </ActionForm>
      </div>
    </main>
  );
}
