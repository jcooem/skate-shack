// Labels and suggestions shared by server and client components.

export const SKATE_TYPES = {
  HOCKEY_PLAYER: "Hockey (player)",
  HOCKEY_GOALIE: "Hockey (goalie)",
  FIGURE: "Figure",
  SPEED: "Speed",
  RECREATIONAL: "Recreational",
  OTHER: "Other",
} as const;
export type SkateTypeKey = keyof typeof SKATE_TYPES;

export const PAYMENT_METHODS = {
  CREDIT: "Sharpening card (credits)",
  CASH: "Cash",
  CARD: "Debit / credit card",
  ETRANSFER: "E-transfer",
  COMP: "Complimentary",
} as const;
export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

export const PAYMENT_METHODS_SHORT: Record<PaymentMethodKey, string> = {
  CREDIT: "Card credits",
  CASH: "Cash",
  CARD: "Debit/credit",
  ETRANSFER: "E-transfer",
  COMP: "Comp",
};

export const CREDIT_REASONS = {
  CARD_PURCHASE: "Card purchase",
  SHARPEN: "Sharpen",
  ADJUSTMENT: "Adjustment",
  REFUND: "Refund",
} as const;

/** Common radius-of-hollow / flat-bottom-V values offered as suggestions. */
export const HOLLOW_SUGGESTIONS = [
  '3/8"',
  '7/16"',
  '1/2"',
  '9/16"',
  '5/8"',
  '11/16"',
  '3/4"',
  '7/8"',
  '1"',
  "FBV 50",
  "FBV 75",
  "FBV 90",
  "FBV 100",
  "FBV 125",
  "FBV 150",
];

export const PROFILE_SUGGESTIONS = ["Factory / maintain", "9 ft", "10 ft", "11 ft", "13 ft", "Quad", "Goalie 28 ft", "Custom"];

export const SOCIAL_PROVIDERS = {
  google: "Google",
  facebook: "Facebook",
  microsoft: "Microsoft",
} as const;
export type SocialProviderId = keyof typeof SOCIAL_PROVIDERS;
