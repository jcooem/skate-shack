import type { Metadata } from "next";
import { requireOwner } from "@/lib/authz";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireOwner();
  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr] md:py-10">
      <aside>
        <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:block">Owner admin</p>
        <AdminNav />
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
