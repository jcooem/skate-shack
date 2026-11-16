import Link from "next/link";
import type { SiteSettings } from "@/lib/settings";
import { cx } from "@/components/ui";

/** Logo + business name. Falls back to a skate-blade mark when no logo is uploaded. */
export function Brand({ settings, className, size = "md" }: { settings: SiteSettings; className?: string; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16" : "h-9 w-9";
  return (
    <Link href="/" className={cx("flex items-center gap-3", className)}>
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route
        <img src={settings.logoUrl} alt="" className={cx(box, "rounded-md object-contain")} />
      ) : (
        <span className={cx(box, "grid place-items-center rounded-md bg-ice-500 text-white")} aria-hidden>
          <BladeIcon className={size === "lg" ? "h-10 w-10" : "h-6 w-6"} />
        </span>
      )}
      <span className={cx("font-display font-bold uppercase tracking-wide", size === "lg" ? "text-4xl" : "text-xl")}>
        {settings.businessName}
      </span>
    </Link>
  );
}

export function BladeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 6v9c0 1.5 1 2.5 2.5 2.5H20l4 2.5" />
      <path d="M8 15h7" />
      <path d="M4 24c4 1.5 18 1.5 24-1" />
      <path d="M10 18v5M22 19.5v3.5" />
    </svg>
  );
}
