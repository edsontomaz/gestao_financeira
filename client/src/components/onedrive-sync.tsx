import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/contexts/profile-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Cloud, CloudUpload, CloudDownload, RefreshCw, User, CheckCircle2 } from "lucide-react";
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

interface OneDriveStatus {
  connected: boolean;
  user?: {
    name: string;
    email: string;
  };
}

export function OneDriveSync() {
  const { toast } = useToast();
  const { profile, profileLabel } = useProfile();
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);

  const statusQuery = useQuery<OneDriveStatus>({
    queryKey: ["/api/onedrive/status"],
    refetchInterval: 30000,
  });

  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/onedrive/backup?profile=${profile}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup realizado!",
        description: `${data.count} transações de ${profileLabel} salvas no OneDrive.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro no backup",
        description: error.message || "Não foi possível fazer o backup.",
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/onedrive/restore?profile=${profile}`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", profile] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary", profile] });
      toast({
        title: "Restauração concluída!",
        description: `${data.count} transações de ${profileLabel} restauradas do OneDrive.`,
      });
      setIsRestoreDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro na restauração",
        description: error.message || "Não foi possível restaurar os dados.",
        variant: "destructive",
      });
    },
  });

  const isConnected = statusQuery.data?.connected;
  const userName = statusQuery.data?.user?.name;

  if (statusQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Verificando conexão...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            OneDrive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            OneDrive não está conectado. Configure a integração para fazer backup automático das suas transações.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" />
          OneDrive
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Conectado como</span>
          <span className="font-medium">{userName}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => backupMutation.mutate()}
            disabled={backupMutation.isPending}
            className="gap-1"
            data-testid="button-onedrive-backup"
          >
            {backupMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            Fazer Backup
          </Button>

          <AlertDialog open={isRestoreDialogOpen} onOpenChange={setIsRestoreDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                data-testid="button-onedrive-restore"
              >
                <CloudDownload className="h-4 w-4" />
                Restaurar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar dados do OneDrive?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação irá substituir todas as transações atuais pelos dados salvos no OneDrive. 
                  Você perderá quaisquer transações que não foram salvas no backup.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                  data-testid="button-confirm-restore"
                >
                  {restoreMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Restaurando...
                    </>
                  ) : (
                    "Restaurar"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <p className="text-xs text-muted-foreground">
          Os dados de {profileLabel} são salvos na pasta "FinanceApp/{profileLabel === "Edson" ? "Edson" : "Tais"}" do seu OneDrive.
        </p>
      </CardContent>
    </Card>
  );
}
