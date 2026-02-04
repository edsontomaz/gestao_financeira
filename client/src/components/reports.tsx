import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Transaction,
  paymentMethodLabels,
  cardOperatorLabels,
  incomeCategoryLabels,
  expenseCategoryLabels,
  type PaymentMethod,
  type CardOperator,
  type IncomeCategory,
  type ExpenseCategory,
} from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PieChart as PieChartIcon, BarChart3, CreditCard, Landmark } from "lucide-react";

const COLORS = [
  "hsl(142, 70%, 45%)",
  "hsl(199, 89%, 48%)",
  "hsl(280, 65%, 60%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(200, 70%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(320, 65%, 50%)",
];

export function Reports({
  transactions,
  isLoading,
}: {
  transactions?: Transaction[];
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
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Relatórios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const expenses = transactions?.filter((t) => t.type === "expense") || [];
  const incomes = transactions?.filter((t) => t.type === "income") || [];

  const expensesByPaymentMethod = paymentMethodLabels
    ? Object.entries(paymentMethodLabels).map(([key, label]) => {
        const total = expenses
          .filter((t) => t.paymentMethod === key)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: label, value: total, key };
      }).filter((item) => item.value > 0)
    : [];

  const expensesByOperator = cardOperatorLabels
    ? Object.entries(cardOperatorLabels).map(([key, label]) => {
        const total = expenses
          .filter((t) => t.cardOperator === key)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: label, value: total, key };
      }).filter((item) => item.value > 0)
    : [];

  const incomesByCategory = incomeCategoryLabels
    ? Object.entries(incomeCategoryLabels).map(([key, label]) => {
        const total = incomes
          .filter((t) => t.category === key)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: label, value: total, key };
      }).filter((item) => item.value > 0)
    : [];

  const expensesByCategory = expenseCategoryLabels
    ? Object.entries(expenseCategoryLabels).map(([key, label]) => {
        const total = expenses
          .filter((t) => t.category === key)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: label, value: total, key };
      }).filter((item) => item.value > 0)
    : [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].payload.name || label}</p>
          <p className="text-primary font-bold">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderPieChart = (data: { name: string; value: number }[], title: string, icon: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
        </div>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="truncate">{item.name}</span>
                <span className="ml-auto font-medium text-muted-foreground">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderBarChart = (data: { name: string; value: number }[], title: string, icon: React.ReactNode) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        {icon}
        {title}
      </div>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8">
          <p className="text-muted-foreground text-sm">Sem dados disponíveis</p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="hsl(142, 70%, 45%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          Relatórios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="payment" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="payment" data-testid="tab-payment">
              <CreditCard className="h-4 w-4 mr-2 hidden sm:inline" />
              Pagamento
            </TabsTrigger>
            <TabsTrigger value="operator" data-testid="tab-operator">
              <Landmark className="h-4 w-4 mr-2 hidden sm:inline" />
              Operadora
            </TabsTrigger>
            <TabsTrigger value="income" data-testid="tab-income">
              <PieChartIcon className="h-4 w-4 mr-2 hidden sm:inline" />
              Receitas
            </TabsTrigger>
            <TabsTrigger value="expense" data-testid="tab-expense">
              <BarChart3 className="h-4 w-4 mr-2 hidden sm:inline" />
              Despesas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="payment" className="mt-4">
            {renderPieChart(
              expensesByPaymentMethod,
              "Despesas por Meio de Pagamento",
              <CreditCard className="h-4 w-4" />
            )}
          </TabsContent>
          <TabsContent value="operator" className="mt-4">
            {renderPieChart(
              expensesByOperator,
              "Despesas por Operadora / Banco",
              <Landmark className="h-4 w-4" />
            )}
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            {renderBarChart(
              incomesByCategory,
              "Receitas por Categoria",
              <PieChartIcon className="h-4 w-4" />
            )}
          </TabsContent>
          <TabsContent value="expense" className="mt-4">
            {renderBarChart(
              expensesByCategory,
              "Despesas por Categoria",
              <BarChart3 className="h-4 w-4" />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
