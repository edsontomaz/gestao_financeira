import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTransactionSchema, updateTransactionSchema, profiles, type Profile } from "@shared/schema";
import { randomUUID } from "crypto";
import { 
  saveTransactionsToOneDrive, 
  loadTransactionsFromOneDrive, 
  getOneDriveUserInfo 
} from "./onedrive";

function getProfileFromQuery(query: any): Profile {
  const profile = query.profile as string;
  if (profiles.includes(profile as Profile)) {
    return profile as Profile;
  }
  return "edson"; // default profile
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/transactions", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transactions = await storage.getAllTransactions(profile);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar transações" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transaction = await storage.getTransactionById(req.params.id, profile);
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar transação" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const parsed = insertTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      const data = parsed.data;
      
      if (data.paymentMethod === "credit_card" && data.installments && data.installments > 1) {
        const parentId = randomUUID();
        const installmentAmount = Math.round((data.amount / data.installments) * 100) / 100;
        const transactions = [];
        
        const baseDate = data.dueDate ? new Date(data.dueDate) : new Date();
        
        for (let i = 1; i <= data.installments; i++) {
          const installmentDate = new Date(baseDate);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          
          const installmentData = {
            ...data,
            amount: installmentAmount,
            currentInstallment: i,
            parentTransactionId: i === 1 ? undefined : parentId,
            createdAt: new Date().toISOString(),
            dueDate: installmentDate.toISOString(),
            description: `${data.description} (${i}/${data.installments})`,
          };
          
          if (i === 1) {
            const transaction = await storage.createTransactionWithId(parentId, installmentData, profile);
            transactions.push(transaction);
          } else {
            const transaction = await storage.createTransaction(installmentData, profile);
            transactions.push(transaction);
          }
        }
        
        res.status(201).json(transactions);
      } else {
        const transaction = await storage.createTransaction({
          ...data,
          installments: 1,
          currentInstallment: 1,
        }, profile);
        res.status(201).json(transaction);
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao criar transação" });
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const parsed = updateTransactionSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Dados inválidos", details: parsed.error.errors });
      }
      
      const transaction = await storage.updateTransaction(req.params.id, parsed.data, profile);
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar transação" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transaction = await storage.getTransactionById(req.params.id, profile);
      if (!transaction) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }
      
      if (transaction.installments && transaction.installments > 1 && !transaction.parentTransactionId) {
        await storage.deleteTransactionsByParentId(req.params.id, profile);
      }
      
      const deleted = await storage.deleteTransaction(req.params.id, profile);
      if (!deleted) {
        return res.status(404).json({ error: "Transação não encontrada" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Erro ao remover transação" });
    }
  });

  app.get("/api/summary", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const summary = await storage.getSummary(profile);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar resumo" });
    }
  });

  app.get("/api/export", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transactions = await storage.getAllTransactions(profile);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Erro ao exportar transações" });
    }
  });

  app.post("/api/import", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transactions = req.body;
      if (!Array.isArray(transactions)) {
        return res.status(400).json({ error: "Dados inválidos. Esperado um array de transações." });
      }
      
      const imported = [];
      for (const t of transactions) {
        const parsed = insertTransactionSchema.safeParse(t);
        if (parsed.success) {
          const transaction = await storage.createTransaction(parsed.data, profile);
          imported.push(transaction);
        }
      }
      
      res.status(201).json({ imported: imported.length, transactions: imported });
    } catch (error) {
      res.status(500).json({ error: "Erro ao importar transações" });
    }
  });

  // OneDrive sync endpoints
  app.get("/api/onedrive/status", async (_req, res) => {
    try {
      const userInfo = await getOneDriveUserInfo();
      if (userInfo) {
        res.json({ connected: true, user: userInfo });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      res.json({ connected: false });
    }
  });

  app.post("/api/onedrive/backup", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const transactions = await storage.getAllTransactions(profile);
      await saveTransactionsToOneDrive(transactions, profile);
      res.json({ 
        success: true, 
        message: "Backup realizado com sucesso",
        count: transactions.length 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: "Erro ao fazer backup no OneDrive", 
        details: error.message 
      });
    }
  });

  app.post("/api/onedrive/restore", async (req, res) => {
    try {
      const profile = getProfileFromQuery(req.query);
      const cloudTransactions = await loadTransactionsFromOneDrive(profile);
      
      if (!cloudTransactions || cloudTransactions.length === 0) {
        return res.status(404).json({ 
          error: "Nenhum backup encontrado no OneDrive" 
        });
      }
      
      // Clear current transactions for this profile and import from cloud
      await storage.clearAllTransactions(profile);
      
      // Map old IDs to new IDs for parent-child relationships
      const idMap = new Map<string, string>();
      
      // First pass: create transactions without parentTransactionId and build ID map
      // Process parent transactions first (those without parentTransactionId)
      const parentTransactions = cloudTransactions.filter(t => !t.parentTransactionId);
      const childTransactions = cloudTransactions.filter(t => t.parentTransactionId);
      
      let imported = 0;
      
      // Import parent transactions first, preserving their original IDs
      for (const t of parentTransactions) {
        const originalId = t.id;
        const parsed = insertTransactionSchema.safeParse(t);
        if (parsed.success && originalId) {
          const transaction = await storage.createTransactionWithId(originalId, parsed.data, profile);
          idMap.set(originalId, transaction.id);
          imported++;
        }
      }
      
      // Import child transactions, mapping parentTransactionId to new IDs
      for (const t of childTransactions) {
        const parsed = insertTransactionSchema.safeParse(t);
        if (parsed.success) {
          const newParentId = t.parentTransactionId ? idMap.get(t.parentTransactionId) : undefined;
          const transactionData = {
            ...parsed.data,
            parentTransactionId: newParentId || t.parentTransactionId,
          };
          await storage.createTransaction(transactionData, profile);
          imported++;
        }
      }
      
      res.json({ 
        success: true, 
        message: "Restauração concluída com sucesso",
        count: imported 
      });
    } catch (error: any) {
      res.status(500).json({ 
        error: "Erro ao restaurar do OneDrive", 
        details: error.message 
      });
    }
  });

  return httpServer;
}
