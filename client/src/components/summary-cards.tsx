import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, CalendarClock } from "lucide-react";

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
  futureExpenses: number;
}

export function SummaryCards({
  data,
  isLoading,
}: {
  data?: SummaryData;
  isLoading: boolean;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Receitas",
      value: data?.totalIncome || 0,
      icon: TrendingUp,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      subtitle: "mês atual",
    },
    {
      title: "Despesas",
      value: data?.totalExpenses || 0,
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      subtitle: "mês atual",
    },
    {
      title: "Saldo",
      value: data?.balance || 0,
      icon: Wallet,
      color: (data?.balance || 0) >= 0 ? "text-green-500" : "text-red-500",
      bgColor: (data?.balance || 0) >= 0 ? "bg-green-500/10" : "bg-red-500/10",
      subtitle: "mês atual",
    },
    {
      title: "Despesas Futuras",
      value: data?.futureExpenses || 0,
      icon: CalendarClock,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      subtitle: "próximos meses",
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index} data-testid={`card-summary-${card.title.toLowerCase().replace(" ", "-")}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-md ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {formatCurrency(card.value)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {card.subtitle}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
