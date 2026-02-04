import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/contexts/profile-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import {
  type Transaction,
  paymentMethodLabels,
  cardOperatorLabels,
  incomeCategoryLabels,
  expenseCategoryLabels,
  paymentMethods,
  cardOperators,
  type PaymentMethod,
  type CardOperator,
} from "@shared/schema";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Trash2,
  Pencil,
  Filter,
  History,
  Calendar,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, addMonths, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

type PeriodFilter = "all" | "this_month" | "last_month" | "last_3_months" | "this_year" | "next_month";

const periodLabels: Record<PeriodFilter, string> = {
  all: "Todos",
  this_month: "Este Mês",
  last_month: "Mês Passado",
  last_3_months: "Últimos 3 Meses",
  this_year: "Este Ano",
  next_month: "Próximo Mês",
};

export function TransactionList({
  transactions,
  isLoading,
}: {
  transactions?: Transaction[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [filterPayment, setFilterPayment] = useState<string>("all");
  const [filterOperator, setFilterOperator] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>("all");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/transactions/${id}?profile=${profile}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", profile] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary", profile] });
      toast({
        title: "Transação removida",
        description: "A transação foi removida com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível remover a transação.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "credit_card":
      case "debit_card":
        return <CreditCard className="h-4 w-4" />;
      case "pix":
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.2 6.8l-3.6 3.6c-.4.4-1 .4-1.4 0l-3.6-3.6c-.8-.8-2-.8-2.8 0l-1.4 1.4 4.2 4.2c1.2 1.2 3.2 1.2 4.4 0l4.2-4.2-1.4-1.4c-.8-.8-2-.8-2.8 0z"/>
            <path d="M6.8 17.2l3.6-3.6c.4-.4 1-.4 1.4 0l3.6 3.6c.8.8 2 .8 2.8 0l1.4-1.4-4.2-4.2c-1.2-1.2-3.2-1.2-4.4 0l-4.2 4.2 1.4 1.4c.8.8 2 .8 2.8 0z"/>
          </svg>
        );
      case "cash":
        return <Banknote className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getCategoryLabel = (category: string, type: string) => {
    if (type === "income") {
      return incomeCategoryLabels[category as keyof typeof incomeCategoryLabels] || category;
    }
    return expenseCategoryLabels[category as keyof typeof expenseCategoryLabels] || category;
  };

  const filterByPeriod = (transaction: Transaction) => {
    if (filterPeriod === "all") return true;
    
    const transactionDate = new Date(transaction.createdAt);
    const now = new Date();
    
    switch (filterPeriod) {
      case "this_month":
        return isWithinInterval(transactionDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      case "last_month":
        const lastMonth = subMonths(now, 1);
        return isWithinInterval(transactionDate, {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        });
      case "last_3_months":
        const threeMonthsAgo = subMonths(now, 3);
        return isWithinInterval(transactionDate, {
          start: startOfMonth(threeMonthsAgo),
          end: endOfMonth(now),
        });
      case "this_year":
        return isWithinInterval(transactionDate, {
          start: startOfYear(now),
          end: endOfYear(now),
        });
      case "next_month":
        const nextMonth = addMonths(now, 1);
        return isWithinInterval(transactionDate, {
          start: startOfMonth(nextMonth),
          end: endOfMonth(nextMonth),
        });
      default:
        return true;
    }
  };

  const filteredTransactions = transactions?.filter((t) => {
    if (filterPayment !== "all" && t.paymentMethod !== filterPayment) return false;
    if (filterOperator !== "all" && t.cardOperator !== filterOperator) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (!filterByPeriod(t)) return false;
    return true;
  });

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Histórico de Transações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-history-title">
              <History className="h-5 w-5" />
              Histórico de Transações
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterPeriod} onValueChange={(v) => setFilterPeriod(v as PeriodFilter)}>
                <SelectTrigger className="w-[150px]" data-testid="filter-period">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(periodLabels) as [PeriodFilter, string][]).map(([key, label]) => (
                    <SelectItem key={key} value={key} data-testid={`filter-period-${key}`}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]" data-testid="filter-type">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-[140px]" data-testid="filter-payment">
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method} value={method}>
                      {paymentMethodLabels[method]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterOperator} onValueChange={setFilterOperator}>
                <SelectTrigger className="w-[130px]" data-testid="filter-operator">
                  <SelectValue placeholder="Operadora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {cardOperators.map((operator) => (
                    <SelectItem key={operator} value={operator}>
                      {cardOperatorLabels[operator]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <History className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1" data-testid="text-empty-state">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground text-sm">
                {transactions?.length === 0
                  ? "Comece registrando sua primeira transação."
                  : "Tente ajustar os filtros para ver mais resultados."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover-elevate"
                  data-testid={`transaction-item-${transaction.id}`}
                >
                  <div
                    className={`flex items-center justify-center h-10 w-10 rounded-full ${
                      transaction.type === "income"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-5 w-5" />
                    ) : (
                      <TrendingDown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid={`text-description-${transaction.id}`}>
                      {transaction.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(transaction.category, transaction.type)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        {getPaymentIcon(transaction.paymentMethod)}
                        {paymentMethodLabels[transaction.paymentMethod as PaymentMethod]}
                      </Badge>
                      {transaction.cardOperator && (
                        <Badge variant="secondary" className="text-xs">
                          {cardOperatorLabels[transaction.cardOperator as CardOperator]}
                        </Badge>
                      )}
                      {transaction.installments && transaction.installments > 1 && (
                        <Badge variant="outline" className="text-xs">
                          {transaction.currentInstallment}/{transaction.installments}
                        </Badge>
                      )}
                      {transaction.dueDate && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                          Venc: {format(new Date(transaction.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.createdAt), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold whitespace-nowrap ${
                        transaction.type === "income" ? "text-green-500" : "text-red-500"
                      }`}
                      data-testid={`text-amount-${transaction.id}`}
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                      data-testid={`button-edit-${transaction.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`button-delete-${transaction.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover transação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A transação será permanentemente removida.
                            {transaction.installments && transaction.installments > 1 && !transaction.parentTransactionId && (
                              <span className="block mt-2 font-medium text-destructive">
                                Atenção: Todas as parcelas serão removidas.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(transaction.id)}
                            className="bg-destructive text-destructive-foreground"
                            data-testid="button-confirm-delete"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <EditTransactionDialog
        transaction={editingTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </>
  );
}
