import { useQuery } from "@tanstack/react-query";
import { ImportExport } from "@/components/import-export";
import { OneDriveSync } from "@/components/onedrive-sync";
import { TransactionList } from "@/components/transaction-list";
import { useProfile } from "@/contexts/profile-context";
import type { Transaction } from "@shared/schema";

export default function Historico() {
  const { profile } = useProfile();

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", profile],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?profile=${profile}`);
      return res.json();
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="grid gap-6 md:grid-cols-2">
        <ImportExport />
        <OneDriveSync />
      </div>
      <TransactionList transactions={transactions} isLoading={transactionsLoading} />
    </div>
  );
}
