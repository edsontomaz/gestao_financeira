import { useQuery, useMutation } from "@tanstack/react-query";
import { SummaryCards } from "@/components/summary-cards";
import { Reports } from "@/components/reports";
import { useProfile } from "@/contexts/profile-context";
import type { Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  futureExpenses: number;
}

export default function Resumo() {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery<SummaryData>({
    queryKey: ["/api/summary", profile],
    queryFn: async () => {
      const res = await fetch(`/api/summary?profile=${profile}`);
      return res.json();
    },
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", profile],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?profile=${profile}`);
      return res.json();
    },
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/onedrive/backup?profile=${profile}`);
      return response.json();
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    
    // Create a timeout promise to avoid hanging forever
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 10000);
    });
    
    try {
      await Promise.race([backupMutation.mutateAsync(), timeoutPromise]);
      toast({
        title: "Backup realizado",
        description: "Seus dados foram salvos no OneDrive.",
      });
    } catch (error: any) {
      const errorMessage = error?.message === "Timeout" 
        ? "O backup demorou muito. Tente novamente mais tarde."
        : "Não foi possível fazer backup.";
      toast({
        title: "Erro no backup",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSave}
          disabled={isSaving}
          data-testid="button-save"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>
      <SummaryCards data={summary} isLoading={summaryLoading} />
      <Reports transactions={transactions} isLoading={transactionsLoading} />
    </div>
  );
}
