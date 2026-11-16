"use client";

import { useState } from "react";
import { PAYMENT_METHODS, type PaymentMethodKey } from "@/lib/constants";
import { centsToInput, formatMoney } from "@/lib/format";
import type { ActionState } from "@/lib/validation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, inputClass, Notice } from "@/components/ui";

type Service = { id: string; name: string; priceCents: number; credits: number };
type SkateOption = { id: string; name: string; preferredHollow: string };

export type SharpenDefaults = {
  productId?: string;
  skateId?: string | null;
  date: string;
  hollow: string;
  profile: string;
  paymentMethod?: PaymentMethodKey;
  priceChargedCents?: number | null;
  notes?: string;
};

export function SharpenForm({
  action,
  services,
  skates,
  defaults,
  customerHollow,
  balance,
  creditsAlreadyUsed = 0,
  submitLabel,
  isNew,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  services: Service[];
  skates: SkateOption[];
  defaults: SharpenDefaults;
  customerHollow: string;
  /** Current credit balance. */
  balance: number;
  /** When editing, credits this sharpen already used (they'd be given back). */
  creditsAlreadyUsed?: number;
  submitLabel: string;
  isNew: boolean;
}) {
  const [productId, setProductId] = useState(defaults.productId ?? services[0]?.id ?? "");
  const [payment, setPayment] = useState<PaymentMethodKey>(defaults.paymentMethod ?? (balance > 0 ? "CREDIT" : "CASH"));
  const [hollow, setHollow] = useState(defaults.hollow);
  const [hollowTouched, setHollowTouched] = useState(!isNew);

  const service = services.find((s) => s.id === productId);
  const available = balance + creditsAlreadyUsed;
  const needed = service ? Math.max(1, service.credits) : 1;
  const short = payment === "CREDIT" && needed > available;

  if (services.length === 0) {
    return <Notice tone="amber">Add a sharpening service on the Pricing page first.</Notice>;
  }

  return (
    <ActionForm action={action} resetOnSuccess={isNew} onSuccess={() => setHollowTouched(false)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date">
          <input type="date" name="date" required defaultValue={defaults.date} className={inputClass} />
        </Field>
        <Field label="Service">
          <select name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {formatMoney(s.priceCents)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Skates">
          <select
            name="skateId"
            defaultValue={defaults.skateId ?? ""}
            className={inputClass}
            onChange={(e) => {
              if (hollowTouched) return;
              const skate = skates.find((s) => s.id === e.target.value);
              setHollow(skate?.preferredHollow || customerHollow);
            }}
          >
            <option value="">{skates.length ? "Not specified" : "No skates on file"}</option>
            {skates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hollow">
          <input
            name="hollow"
            list="hollow-suggestions"
            value={hollow}
            onChange={(e) => {
              setHollow(e.target.value);
              setHollowTouched(true);
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Profile">
          <input name="profile" list="profile-suggestions" defaultValue={defaults.profile} className={inputClass} />
        </Field>
        <Field label="Payment">
          <select name="paymentMethod" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethodKey)} className={inputClass}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
                {value === "CREDIT" ? ` (${available} left)` : ""}
              </option>
            ))}
          </select>
        </Field>
        {payment !== "CREDIT" && payment !== "COMP" && (
          <Field label="Amount charged" hint={service ? `Leave blank for the list price (${formatMoney(service.priceCents)}).` : undefined}>
            <input
              name="priceCharged"
              inputMode="decimal"
              defaultValue={defaults.priceChargedCents != null ? centsToInput(defaults.priceChargedCents) : ""}
              placeholder={service ? centsToInput(service.priceCents) : ""}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Notes" className="sm:col-span-2 lg:col-span-3">
          <input name="notes" defaultValue={defaults.notes} placeholder="Nicks, rust, edge check, rockered…" className={inputClass} />
        </Field>
      </div>
      {short && (
        <Notice tone="amber">
          This sharpen needs {needed} credit{needed === 1 ? "" : "s"} but only {available} {available === 1 ? "is" : "are"} available. Sell a card first or choose
          another payment method.
        </Notice>
      )}
      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </ActionForm>
  );
}
