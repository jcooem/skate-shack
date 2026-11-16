"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { SOCIAL_PROVIDERS, type SocialProviderId } from "@/lib/constants";
import { Badge, buttonClass } from "@/components/ui";

export function ConnectedAccounts({
  providers,
  connected,
  hasPassword,
}: {
  providers: SocialProviderId[];
  connected: string[];
  hasPassword: boolean;
}) {
  const [pending, setPending] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-slate-100">
      <li className="flex items-center justify-between py-3">
        <span className="text-sm font-medium text-slate-800">Email &amp; password</span>
        {hasPassword ? <Badge tone="green">Set</Badge> : <span className="text-sm text-slate-500">Use “Forgot password” on the sign-in page to set one</span>}
      </li>
      {providers.map((p) => {
        const isConnected = connected.includes(p);
        return (
          <li key={p} className="flex items-center justify-between py-3">
            <span className="text-sm font-medium text-slate-800">{SOCIAL_PROVIDERS[p]}</span>
            {isConnected ? (
              <Badge tone="green">Connected</Badge>
            ) : (
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                disabled={pending !== null}
                onClick={async () => {
                  setPending(p);
                  await authClient.linkSocial({
                    provider: p,
                    callbackURL: "/account/profile",
                    errorCallbackURL: "/account/profile",
                  });
                }}
              >
                {pending === p ? "Connecting…" : "Connect"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
