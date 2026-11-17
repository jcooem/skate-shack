import type { Metadata } from "next";
import { requireCustomer } from "@/lib/authz";
import { getCustomerHistory } from "@/lib/customer-history";
import { CardActivityTable, SharpenHistoryTable } from "@/components/customer-history";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage() {
  const { customer } = await requireCustomer();
  const { sharpens, ledger, balance } = await getCustomerHistory(customer.id);

  return (
    <div className="space-y-6">
      <SharpenHistoryTable sharpens={sharpens} />
      <CardActivityTable ledger={ledger} balance={balance} />
    </div>
  );
}
