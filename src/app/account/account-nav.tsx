"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/history", label: "History" },
  { href: "/account/profile", label: "Profile & skates" },
];

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Account">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium",
              active ? "border-ice-600 text-ice-700" : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
