import type { Metadata } from "next";
import { requireCustomer } from "@/lib/authz";
import { AccountNav } from "./account-nav";

export const metadata: Metadata = { title: { default: "My account", template: "%s · My account" } };

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const { customer } = await requireCustomer();
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:py-10">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-slate-900">Hi {customer.firstName}!</h1>
      <AccountNav />
      {children}
    </main>
  );
}
