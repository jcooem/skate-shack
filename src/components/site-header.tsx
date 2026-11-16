import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/authz";
import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const [settings, user] = await Promise.all([getSettings(), getCurrentUser()]);
  const link = "rounded-lg px-3 py-2 text-sm font-medium text-ice-100 hover:bg-white/10 hover:text-white";

  return (
    <header className="bg-rink-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Brand settings={settings} />
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/#services" className={link}>
            Services
          </Link>
          {user?.role === "OWNER" && (
            <Link href="/admin" className={link}>
              Admin
            </Link>
          )}
          {user ? (
            <>
              <Link href="/account" className={link}>
                My account
              </Link>
              <SignOutButton className="text-ice-100 hover:bg-white/10 hover:text-white" />
            </>
          ) : (
            <Link href="/login" className="ml-1 rounded-lg bg-ice-500 px-4 py-2 text-sm font-semibold text-white hover:bg-ice-400">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
