import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/contexts/profile-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileSpreadsheet, Check, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import type { Transaction } from "@shared/schema";
import {
  paymentMethodLabels,
  cardOperatorLabels,
  incomeCategoryLabels,
  expenseCategoryLabels,
  transactionTypeLabels,
  paymentMethods,
  cardOperators,
  incomeCategories,
  expenseCategories,
  transactionTypes,
} from "@shared/schema";

const reversePaymentMethodLabels = Object.fromEntries(
  Object.entries(paymentMethodLabels).map(([k, v]) => [v, k])
);

const reverseCardOperatorLabels = Object.fromEntries(
  Object.entries(cardOperatorLabels).map(([k, v]) => [v, k])
);

const reverseIncomeCategoryLabels = Object.fromEntries(
  Object.entries(incomeCategoryLabels).map(([k, v]) => [v, k])
);

const reverseExpenseCategoryLabels = Object.fromEntries(
  Object.entries(expenseCategoryLabels).map(([k, v]) => [v, k])
);

const reverseTransactionTypeLabels = Object.fromEntries(
  Object.entries(transactionTypeLabels).map(([k, v]) => [v, k])
);

interface ImportItem {
  type: string;
  amount: number;
  description: string;
  category: string;
  paymentMethod: string;
  cardOperator?: string;
  installments: number;
  currentInstallment: number;
  dateKey: string;
  isDuplicate?: boolean;
}

function parseExcelDate(dateValue: any): string {
  if (!dateValue) return "";
  if (typeof dateValue === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    return date.toISOString().split("T")[0];
  }
  const dateStr = String(dateValue);
  const brParts = dateStr.split("/");
  if (brParts.length === 3) {
    return `${brParts[2]}-${brParts[1].padStart(2, "0")}-${brParts[0].padStart(2, "0")}`;
  }
  if (dateStr.includes("-") && dateStr.length >= 10) {
    return dateStr.substring(0, 10);
  }
  return "";
}

function formatDateKey(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

function getTransactionKey(item: { type: string; amount: number; description: string; category: string; paymentMethod: string; cardOperator?: string; installments?: number; currentInstallment?: number; dateKey?: string }): string {
  return [
    item.type,
    item.amount.toFixed(2),
    item.description.toLowerCase().trim(),
    item.category,
    item.paymentMethod,
    item.cardOperator || "",
    item.installments || 1,
    item.currentInstallment || 1,
    item.dateKey || "",
  ].join("|");
}

function isDuplicateTransaction(item: ImportItem, existing: Transaction[]): boolean {
  const itemKey = getTransactionKey(item);
  return existing.some(t => getTransactionKey({
    type: t.type,
    amount: t.amount,
    description: t.description,
    category: t.category,
    paymentMethod: t.paymentMethod,
    cardOperator: t.cardOperator || undefined,
    installments: t.installments || 1,
    currentInstallment: t.currentInstallment || 1,
    dateKey: formatDateKey(t.createdAt),
  }) === itemKey);
}

export function ImportExport() {
  const { toast } = useToast();
  const { profile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const { data: transactions, isLoading: transactionsLoading, isError: transactionsError } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", profile],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?profile=${profile}`);
      return res.json();
    },
  });
  
  const transactionsReady = !transactionsLoading && !transactionsError && transactions !== undefined;

  const duplicateCount = importPreview.filter(item => item.isDuplicate).length;
  const newItemsCount = importPreview.filter(item => !item.isDuplicate).length;

  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await apiRequest("POST", `/api/import?profile=${profile}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", profile] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary", profile] });
      toast({
        title: "Importação concluída!",
        description: `${data.imported} transações importadas com sucesso.`,
      });
      setImportDialogOpen(false);
      setImportPreview([]);
    },
    onError: () => {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar as transações.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: "Nenhuma transação",
        description: "Não há transações para exportar.",
        variant: "destructive",
      });
      return;
    }

    const exportData = transactions.map((t) => ({
      Tipo: transactionTypeLabels[t.type],
      Valor: t.amount,
      Descrição: t.description,
      Categoria: t.type === "income" 
        ? incomeCategoryLabels[t.category as keyof typeof incomeCategoryLabels] || t.category
        : expenseCategoryLabels[t.category as keyof typeof expenseCategoryLabels] || t.category,
      "Meio de Pagamento": paymentMethodLabels[t.paymentMethod],
      "Operadora/Banco": t.cardOperator ? cardOperatorLabels[t.cardOperator] : "",
      "Parcelas": t.installments || 1,
      "Parcela Atual": t.currentInstallment || 1,
      Data: new Date(t.createdAt).toLocaleDateString("pt-BR"),
      "Vencimento": t.dueDate ? new Date(t.dueDate).toLocaleDateString("pt-BR") : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");
    
    const colWidths = [
      { wch: 10 },
      { wch: 12 },
      { wch: 40 },
      { wch: 15 },
      { wch: 18 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
    ];
    worksheet["!cols"] = colWidths;

    XLSX.writeFile(workbook, `transacoes_${new Date().toISOString().split("T")[0]}.xlsx`);

    toast({
      title: "Exportação concluída!",
      description: `${transactions.length} transações exportadas para Excel.`,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!transactionsReady) {
      toast({
        title: "Aguarde",
        description: transactionsError 
          ? "Erro ao carregar dados. Atualize a página e tente novamente."
          : "Carregando dados existentes. Tente novamente em alguns segundos.",
        variant: "destructive",
      });
      return;
    }

    setImportError(null);
    setImportPreview([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const existingTransactions = transactions || [];
        const seenInFile = new Set<string>();
        
        const parsedData: ImportItem[] = jsonData.map((row: any) => {
          const type = reverseTransactionTypeLabels[row["Tipo"]] || row["Tipo"] || "expense";
          const category = type === "income"
            ? reverseIncomeCategoryLabels[row["Categoria"]] || row["Categoria"] || "other_income"
            : reverseExpenseCategoryLabels[row["Categoria"]] || row["Categoria"] || "other_expense";
          
          const item: ImportItem = {
            type,
            amount: parseFloat(row["Valor"]) || 0,
            description: row["Descrição"] || "",
            category,
            paymentMethod: reversePaymentMethodLabels[row["Meio de Pagamento"]] || row["Meio de Pagamento"] || "pix",
            cardOperator: row["Operadora/Banco"] ? reverseCardOperatorLabels[row["Operadora/Banco"]] || row["Operadora/Banco"] : undefined,
            installments: parseInt(row["Parcelas"]) || 1,
            currentInstallment: parseInt(row["Parcela Atual"]) || 1,
            dateKey: parseExcelDate(row["Data"]),
          };
          
          const itemKey = getTransactionKey(item);
          
          if (seenInFile.has(itemKey)) {
            item.isDuplicate = true;
          } else if (isDuplicateTransaction(item, existingTransactions)) {
            item.isDuplicate = true;
          } else {
            item.isDuplicate = false;
            seenInFile.add(itemKey);
          }
          
          return item;
        });

        setImportPreview(parsedData);
        setImportDialogOpen(true);
      } catch (error) {
        setImportError("Erro ao ler o arquivo. Verifique se é um arquivo Excel válido.");
        toast({
          title: "Erro ao ler arquivo",
          description: "Verifique se o arquivo é um Excel válido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmImport = () => {
    const itemsToImport = importPreview.filter(item => !item.isDuplicate);
    if (itemsToImport.length > 0) {
      importMutation.mutate(itemsToImport);
    } else {
      toast({
        title: "Nenhuma transação nova",
        description: "Todas as transações do arquivo já existem.",
        variant: "destructive",
      });
      setImportDialogOpen(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg" data-testid="text-import-export-title">
          <FileSpreadsheet className="h-5 w-5" />
          Importar / Exportar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
              className="hidden"
              data-testid="input-import-file"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Exporte suas transações para Excel ou importe de um arquivo existente.
        </p>

        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Confirmar Importação
              </DialogTitle>
              <DialogDescription>
                {newItemsCount > 0 ? (
                  <>
                    {newItemsCount} transações novas serão importadas.
                    {duplicateCount > 0 && (
                      <span className="text-amber-500 ml-1">
                        ({duplicateCount} duplicadas serão ignoradas)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-500">
                    Todas as {importPreview.length} transações já existem e serão ignoradas.
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="text-amber-600 dark:text-amber-400">
                  Duplicatas identificadas por: tipo, valor, descrição, categoria, meio de pagamento, operadora, parcelas e data.
                </span>
              </div>
            )}
            
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {importPreview.slice(0, 15).map((item, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between text-sm p-2 rounded ${
                    item.isDuplicate 
                      ? "bg-amber-500/10 opacity-60 line-through" 
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.isDuplicate ? (
                      <AlertCircle className="h-3 w-3 text-amber-500" />
                    ) : (
                      <Check className="h-3 w-3 text-green-500" />
                    )}
                    <span className={item.type === "income" ? "text-green-500" : "text-red-500"}>
                      {item.type === "income" ? "+" : "-"}
                    </span>
                    <span className="truncate max-w-[180px]">{item.description}</span>
                  </div>
                  <span className="font-medium">
                    R$ {item.amount.toFixed(2)}
                  </span>
                </div>
              ))}
              {importPreview.length > 15 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ... e mais {importPreview.length - 15} transações
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={confirmImport} 
                disabled={importMutation.isPending || newItemsCount === 0}
                data-testid="button-confirm-import"
              >
                {importMutation.isPending ? "Importando..." : `Importar ${newItemsCount} transações`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
