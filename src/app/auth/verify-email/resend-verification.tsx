"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { buttonClass, cx, Notice } from "@/components/ui";

export function ResendVerification({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={state === "sending"}
        className={cx(buttonClass(), "w-full")}
        onClick={async () => {
          setState("sending");
          const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/go" });
          setState(error ? "error" : "sent");
        }}
      >
        {state === "sending" ? "Sending…" : state === "sent" ? "Send again" : "Email me a confirmation link"}
      </button>
      {state === "sent" && <Notice tone="green">Sent! Check your inbox (and spam folder).</Notice>}
      {state === "error" && <Notice tone="red">We couldn&apos;t send the email. Please try again shortly.</Notice>}
    </div>
  );
}
