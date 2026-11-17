import { z } from "zod";
import { PAYMENT_METHODS, SKATE_TYPES } from "@/lib/constants";
import { parseMoneyToCents } from "@/lib/format";

/** Result type returned by every Server Action used with <ActionForm>. */
export type ActionState = {
  error?: string;
  success?: string;
  /** A newly created private link, shown once with a Copy button. */
  link?: string;
  /** A one-time secret (e.g. a temporary password), shown once with a Copy button. */
  secret?: { label: string; value: string };
} | null;

/** FormData → plain object of strings (checkboxes become "on"; missing ones are absent). */
export function formToObject(formData: FormData) {
  const obj: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") obj[key] = value;
  }
  return obj;
}

export function firstIssue(error: z.ZodError) {
  const issue = error.issues[0];
  return issue?.message ?? "Please check the form and try again.";
}

const text = (max: number) => z.string().trim().max(max).default("");
const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

const money = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const cents = parseMoneyToCents(v);
      if (cents == null || cents < 0) {
        ctx.addIssue({ code: "custom", message: `${label} must be an amount like 15.00` });
        return z.NEVER;
      }
      return cents;
    });

const optionalMoney = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const cents = parseMoneyToCents(v);
    if (cents == null || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Amount must look like 15.00" });
      return z.NEVER;
    }
    return cents;
  });

export const ownerSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  name: z.string().trim().max(100).default(""),
});

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => v || null)
  .pipe(z.email("Enter a valid email address").nullable());

const dateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .transform((v) => new Date(`${v}T00:00:00.000Z`));

const preferences = {
  phone: text(40),
  preferredHollow: text(40),
  preferredProfile: text(60),
  sharpenNotes: text(1000),
};

export const customerAdminSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: text(80),
  email: optionalEmail,
  ...preferences,
  ownerNotes: text(2000),
});

export const customerSelfSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: text(80),
  ...preferences,
});

export const skateSchema = z.object({
  label: text(80),
  skateType: z.enum(Object.keys(SKATE_TYPES) as [keyof typeof SKATE_TYPES, ...(keyof typeof SKATE_TYPES)[]]),
  brand: text(60),
  model: text(80),
  size: text(20),
  holderBlade: text(80),
  preferredHollow: text(40),
  notes: text(500),
  active: checkbox,
});

const paymentMethod = z.enum(
  Object.keys(PAYMENT_METHODS) as [keyof typeof PAYMENT_METHODS, ...(keyof typeof PAYMENT_METHODS)[]],
  { message: "Choose a payment method" },
);

export const sharpeningSchema = z.object({
  productId: z.string().min(1, "Choose a service"),
  skateId: z
    .string()
    .optional()
    .transform((v) => v || null),
  date: dateInput,
  hollow: text(40),
  profile: text(60),
  paymentMethod,
  priceCharged: optionalMoney,
  notes: text(1000),
});

export const sellCardSchema = z.object({
  productId: z.string().min(1, "Choose a card"),
  amountPaid: optionalMoney,
  note: text(200),
});

export const adjustCreditsSchema = z.object({
  delta: z.coerce
    .number({ message: "Enter a number of credits" })
    .int("Credits must be a whole number")
    .refine((n) => n !== 0, "Credits can't be zero")
    .refine((n) => Math.abs(n) <= 1000, "That's a lot of credits — check the number"),
  reason: z.enum(["ADJUSTMENT", "REFUND"]).default("ADJUSTMENT"),
  note: z.string().trim().min(1, "Add a short note explaining the adjustment").max(200),
});

export const productSchema = z
  .object({
    kind: z.enum(["SERVICE", "CARD"]),
    name: z.string().trim().min(1, "Name is required").max(80),
    description: text(500),
    price: money("Price"),
    credits: z.coerce.number().int().min(1, "Credits must be at least 1").max(500),
    sortOrder: z.coerce.number().int().default(0),
    active: checkbox,
    showOnPublicPage: checkbox,
  })
  .transform(({ price, ...rest }) => ({ ...rest, priceCents: price }));

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(80),
  tagline: text(160),
  aboutText: text(3000),
  phone: text(40),
  contactEmail: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Enter a valid contact email"),
  address: text(300),
  hours: text(500),
});

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
});
