import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";

export type SiteSettings = {
  businessName: string;
  tagline: string;
  aboutText: string;
  phone: string;
  contactEmail: string;
  address: string;
  hours: string;
  /** URL of the logo (cache-busted), or null when no logo is uploaded. */
  logoUrl: string | null;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "Skate Shack",
  tagline: "Sharp edges. Better skating.",
  aboutText: "",
  phone: "",
  contactEmail: "",
  address: "",
  hours: "",
  logoUrl: null,
};

/** Branding + contact details. Never loads the logo bytes. Cached per request. */
export const getSettings = cache(async (): Promise<SiteSettings> => {
  await connection(); // always read at request time, never at build time
  const row = await prisma.settings.findUnique({
    where: { id: 1 },
    omit: { logo: true },
  });
  if (!row) return DEFAULT_SETTINGS;
  return {
    businessName: row.businessName || DEFAULT_SETTINGS.businessName,
    tagline: row.tagline,
    aboutText: row.aboutText,
    phone: row.phone,
    contactEmail: row.contactEmail,
    address: row.address,
    hours: row.hours,
    logoUrl: row.logoUpdatedAt && row.logoMime ? `/api/logo?v=${row.logoUpdatedAt.getTime()}` : null,
  };
});
