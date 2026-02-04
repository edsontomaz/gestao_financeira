import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  updateTransactionSchema,
  paymentMethods,
  paymentMethodLabels,
  cardOperators,
  cardOperatorLabels,
  incomeCategories,
  incomeCategoryLabels,
  expenseCategories,
  expenseCategoryLabels,
  type Transaction,
  type UpdateTransaction,
  type PaymentMethod,
} from "@shared/schema";
import { TrendingUp, TrendingDown, CreditCard, Banknote, Pencil } from "lucide-react";
import { useEffect } from "react";
import { useProfile } from "@/contexts/profile-context";

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditTransactionDialog({ transaction, open, onOpenChange }: EditTransactionDialogProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  
  const form = useForm<UpdateTransaction>({
    resolver: zodResolver(updateTransactionSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      paymentMethod: "pix",
      category: "other_expense",
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        paymentMethod: transaction.paymentMethod,
        cardOperator: transaction.cardOperator,
        category: transaction.category,
      });
    }
  }, [transaction, form]);

  const watchType = form.watch("type");
  const watchPaymentMethod = form.watch("paymentMethod");

  const showCardOperator = watchPaymentMethod === "credit_card" || watchPaymentMethod === "debit_card";

  const mutation = useMutation({
    mutationFn: async (data: UpdateTransaction) => {
      const response = await apiRequest("PUT", `/api/transactions/${transaction?.id}?profile=${profile}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", profile] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary", profile] });
      toast({
        title: "Sucesso!",
        description: "Transação atualizada com sucesso.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a transação.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateTransaction) => {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Transação
          </DialogTitle>
          <DialogDescription>
            Altere os dados da transação abaixo.
          </DialogDescription>
        </DialogHeader>
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
                      data-testid="edit-button-type-expense"
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
                      data-testid="edit-button-type-income"
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
                      data-testid="edit-input-amount"
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
                      data-testid="edit-input-description"
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
                      <SelectTrigger data-testid="edit-select-category">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {watchType === "income"
                        ? incomeCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {incomeCategoryLabels[cat]}
                            </SelectItem>
                          ))
                        : expenseCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="edit-select-payment-method">
                        <SelectValue placeholder="Selecione o meio de pagamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
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
                        <SelectTrigger data-testid="edit-select-card-operator">
                          <SelectValue placeholder="Selecione a operadora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cardOperators.map((operator) => (
                          <SelectItem key={operator} value={operator}>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-edit">
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
