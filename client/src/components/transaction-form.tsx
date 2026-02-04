import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  insertTransactionSchema,
  paymentMethods,
  paymentMethodLabels,
  cardOperators,
  cardOperatorLabels,
  incomeCategories,
  incomeCategoryLabels,
  expenseCategories,
  expenseCategoryLabels,
  type InsertTransaction,
  type PaymentMethod,
} from "@shared/schema";
import { Plus, TrendingUp, TrendingDown, CreditCard, Banknote, CalendarIcon, X } from "lucide-react";
import { useLocation } from "wouter";
import { useProfile } from "@/contexts/profile-context";
import { z } from "zod";

const formSchema = insertTransactionSchema.extend({
  installments: z.number().min(1).max(48).default(1),
  dueDate: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export function TransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { profile } = useProfile();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      paymentMethod: "pix",
      category: "other_expense",
      installments: 1,
      dueDate: "",
    },
  });

  const watchType = form.watch("type");
  const watchPaymentMethod = form.watch("paymentMethod");

  const showCardOperator = watchPaymentMethod === "credit_card" || watchPaymentMethod === "debit_card";
  const showInstallments = watchPaymentMethod === "credit_card";

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", `/api/transactions?profile=${profile}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", profile] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary", profile] });
      toast({
        title: "Sucesso!",
        description: "Transação registrada com sucesso.",
      });
      form.reset({
        type: "expense",
        amount: 0,
        description: "",
        paymentMethod: "pix",
        category: "other_expense",
        installments: 1,
        dueDate: "",
      });
      onSuccess?.();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível registrar a transação.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const getPaymentIcon = (method: PaymentMethod) => {
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
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-form-title">
          <Plus className="h-5 w-5" />
          Nova Transação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={field.value === "expense" ? "destructive" : "outline"}
                      className="w-full"
                      onClick={() => {
                        field.onChange("expense");
                        form.setValue("category", "other_expense");
                      }}
                      data-testid="button-type-expense"
                    >
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Despesa
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "income" ? "default" : "outline"}
                      className="w-full"
                      onClick={() => {
                        field.onChange("income");
                        form.setValue("category", "other_income");
                      }}
                      data-testid="button-type-income"
                    >
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Receita
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-amount"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva a transação..."
                      className="resize-none"
                      {...field}
                      data-testid="input-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {watchType === "income"
                        ? incomeCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                              {incomeCategoryLabels[cat]}
                            </SelectItem>
                          ))
                        : expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                              {expenseCategoryLabels[cat]}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meio de Pagamento</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value !== "credit_card") {
                        form.setValue("installments", 1);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Selecione o meio de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method} data-testid={`option-payment-${method}`}>
                          <div className="flex items-center gap-2">
                            {getPaymentIcon(method)}
                            {paymentMethodLabels[method]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showCardOperator && (
              <FormField
                control={form.control}
                name="cardOperator"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operadora / Banco</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-card-operator">
                          <SelectValue placeholder="Selecione a operadora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cardOperators.map((operator) => (
                          <SelectItem key={operator} value={operator} data-testid={`option-operator-${operator}`}>
                            {cardOperatorLabels[operator]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {showInstallments && (
              <>
                <FormField
                  control={form.control}
                  name="installments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número de Parcelas</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={String(field.value || 1)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-installments">
                            <SelectValue placeholder="Selecione o número de parcelas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={String(num)} data-testid={`option-installment-${num}`}>
                              {num}x {num > 1 ? `(${(form.watch("amount") / num).toFixed(2)} cada)` : "(à vista)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            className="pl-10"
                            {...field}
                            data-testid="input-due-date"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  form.reset();
                  setLocation("/");
                }}
                data-testid="button-cancel-transaction"
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={mutation.isPending}
                data-testid="button-submit-transaction"
              >
                <Plus className="h-4 w-4 mr-2" />
                {mutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
