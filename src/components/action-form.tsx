"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { ActionState } from "@/lib/validation";
import { buttonClass, cx, Notice } from "@/components/ui";

const PendingContext = createContext(false);

/**
 * A form wired to a Server Action that returns ActionState. Shows the returned
 * error/success message and keeps the typed values when there's an error
 * (unlike a plain <form action>, which React resets after every submit).
 */
export function ActionForm({
  action,
  children,
  className,
  confirm,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  /** Ask the user to confirm before submitting (e.g. deletes). */
  confirm?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
}) {
  const [state, dispatch, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        if (confirm && !window.confirm(confirm)) return;
        const formData = new FormData(event.currentTarget);
        startTransition(() => dispatch(formData));
      }}
    >
      <PendingContext.Provider value={pending}>
        {children}
        {state?.error && (
          <div className="mt-3" role="alert">
            <Notice tone="red">{state.error}</Notice>
          </div>
        )}
        {state?.success && (
          <div className="mt-3" role="status">
            <Notice tone="green">{state.success}</Notice>
          </div>
        )}
        {state?.link && <CopyLink url={state.link} />}
      </PendingContext.Provider>
    </form>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button type="submit" disabled={pending} className={cx(buttonClass(variant, size), className)}>
      {pending ? (pendingText ?? "Saving…") : children}
    </button>
  );
}

/** A read-only link with a Copy button (for one-time links). */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex gap-2">
      <input
        readOnly
        value={url}
        aria-label="New link"
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
      />
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard blocked: the field can still be selected and copied by hand.
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
