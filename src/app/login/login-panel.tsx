"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/lib/constants";
import { buttonClass, cx, Field, inputClass, Notice } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { requestSetPasswordLink } from "./actions";

type Tab = "signin" | "signup" | "link";

export function LoginPanel({
  providers,
  next,
  initialError,
  initialNotice,
}: {
  providers: SocialProviderId[];
  next: string;
  initialError?: string;
  initialNotice?: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("signin");
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState(initialNotice);
  const [pending, setPending] = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError(undefined);
    setNotice(undefined);
  }

  async function onSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    const { error } = await authClient.signIn.email({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      callbackURL: next,
    });
    setPending(false);
    if (error) {
      if (error.status === 403) {
        setNotice("Please confirm your email first — we've just sent you a new confirmation link.");
      } else {
        setError(error.message || "Incorrect email or password.");
      }
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function onSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(undefined);
    const email = String(fd.get("email"));
    const { error } = await authClient.signUp.email({
      name: String(fd.get("name")),
      email,
      password: String(fd.get("password")),
      callbackURL: "/go",
    });
    setPending(false);
    if (error) {
      setError(error.message || "We couldn't create your account.");
      return;
    }
    setNotice(`Almost done! We've emailed a confirmation link to ${email}. Click it to finish creating your account.`);
  }

  async function social(provider: SocialProviderId) {
    setError(undefined);
    await authClient.signIn.social({ provider, callbackURL: next, errorCallbackURL: "/login" });
  }

  const tabs: [Tab, string][] = [
    ["signin", "Sign in"],
    ["signup", "Create account"],
    ["link", "First time here?"],
  ];

  return (
    <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {providers.length > 0 && (
        <>
          <div className="grid gap-2">
            {providers.map((p) => (
              <button key={p} type="button" onClick={() => social(p)} className={cx(buttonClass("secondary"), "w-full")}>
                <ProviderIcon provider={p} />
                Continue with {SOCIAL_PROVIDERS[p]}
              </button>
            ))}
          </div>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or use email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}

      <div role="tablist" className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => switchTab(key)}
            className={cx(
              "rounded-md px-2 py-1.5 font-medium",
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4" role="alert">
          <Notice tone="red">{error}</Notice>
        </div>
      )}
      {notice && (
        <div className="mb-4" role="status">
          <Notice tone="green">{notice}</Notice>
        </div>
      )}

      {tab === "signin" && (
        <form onSubmit={onSignIn} className="space-y-4">
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Password">
            <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
          </Field>
          <button type="submit" disabled={pending} className={cx(buttonClass(), "w-full")}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-sm text-slate-500">
            <button type="button" className="text-ice-700 hover:underline" onClick={() => switchTab("link")}>
              Forgot your password?
            </button>
          </p>
        </form>
      )}

      {tab === "signup" && (
        <form onSubmit={onSignUp} className="space-y-4">
          <Field label="Your name">
            <input name="name" required autoComplete="name" className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          </Field>
          <button type="submit" disabled={pending} className={cx(buttonClass(), "w-full")}>
            {pending ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs text-slate-500">
            Already a customer? Use “First time here?” instead so your sharpening history comes with you.
          </p>
        </form>
      )}

      {tab === "link" && (
        <ActionForm action={requestSetPasswordLink} className="space-y-4">
          <p className="text-sm text-slate-600">
            Already a customer, or forgot your password? Enter your email and we&apos;ll send you a link to choose a password.
            {providers.length > 0 && " You can also just use one of the buttons above if it matches your email."}
          </p>
          <Field label="Email">
            <input name="email" type="email" required autoComplete="email" className={inputClass} />
          </Field>
          <SubmitButton pendingText="Sending…" className="w-full">
            Email me a link
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

function ProviderIcon({ provider }: { provider: SocialProviderId }) {
  if (provider === "google")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
        <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9l4-3.1z" />
        <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
      </svg>
    );
  if (provider === "facebook")
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z" />
      </svg>
    );
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#F25022" d="M1 1h10.5v10.5H1z" />
      <path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z" />
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z" />
      <path fill="#FFB900" d="M12.5 12.5H23V23H12.5z" />
    </svg>
  );
}
