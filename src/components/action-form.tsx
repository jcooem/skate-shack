"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
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
