import { type User, type InsertUser, type Transaction, type InsertTransaction, type UpdateTransaction, type Profile } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllTransactions(profile: Profile): Promise<Transaction[]>;
  getTransactionById(id: string, profile?: Profile): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction, profile: Profile): Promise<Transaction>;
  createTransactionWithId(id: string, transaction: InsertTransaction, profile: Profile): Promise<Transaction>;
  updateTransaction(id: string, transaction: UpdateTransaction, profile?: Profile): Promise<Transaction | undefined>;
  deleteTransaction(id: string, profile?: Profile): Promise<boolean>;
  deleteTransactionsByParentId(parentId: string, profile?: Profile): Promise<number>;
  clearAllTransactions(profile: Profile): Promise<void>;
  getSummary(profile: Profile): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    futureExpenses: number;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private transactions: Map<string, Transaction>;

  constructor() {
    this.users = new Map();
    this.transactions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllTransactions(profile: Profile): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values())
      .filter((t) => t.profile === profile);
    return transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getTransactionById(id: string, profile?: Profile): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (transaction && profile && transaction.profile !== profile) {
      return undefined;
    }
    return transaction;
  }

  async createTransaction(insertTransaction: InsertTransaction, profile: Profile): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      profile,
      createdAt: insertTransaction.createdAt || new Date().toISOString(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async createTransactionWithId(id: string, insertTransaction: InsertTransaction, profile: Profile): Promise<Transaction> {
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      profile,
      createdAt: insertTransaction.createdAt || new Date().toISOString(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: string, updateData: UpdateTransaction, profile?: Profile): Promise<Transaction | undefined> {
    const existing = this.transactions.get(id);
    if (!existing) return undefined;
    if (profile && existing.profile !== profile) return undefined;
    
    const updated: Transaction = {
      ...existing,
      ...updateData,
    };
    this.transactions.set(id, updated);
    return updated;
  }

  async deleteTransaction(id: string, profile?: Profile): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (transaction && profile && transaction.profile !== profile) {
      return false;
    }
    return this.transactions.delete(id);
  }

  async deleteTransactionsByParentId(parentId: string, profile?: Profile): Promise<number> {
    let count = 0;
    const entries = Array.from(this.transactions.entries());
    for (const [id, transaction] of entries) {
      if (transaction.parentTransactionId === parentId) {
        if (profile && transaction.profile !== profile) continue;
        this.transactions.delete(id);
        count++;
      }
    }
    return count;
  }

  async clearAllTransactions(profile: Profile): Promise<void> {
    const entries = Array.from(this.transactions.entries());
    for (const [id, transaction] of entries) {
      if (transaction.profile === profile) {
        this.transactions.delete(id);
      }
    }
  }

  async getSummary(profile: Profile): Promise<{
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    transactionCount: number;
    futureExpenses: number;
  }> {
    const transactions = Array.from(this.transactions.values())
      .filter((t) => t.profile === profile);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const getTransactionDate = (t: Transaction): string => {
      return t.dueDate || t.createdAt;
    };
    
    const isCurrentMonth = (t: Transaction) => {
      const date = new Date(getTransactionDate(t));
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    };
    
    const isFutureMonth = (t: Transaction) => {
      const date = new Date(getTransactionDate(t));
      const transactionMonth = date.getFullYear() * 12 + date.getMonth();
      const currentMonthValue = currentYear * 12 + currentMonth;
      return transactionMonth > currentMonthValue;
    };
    
    const totalIncome = transactions
      .filter((t) => t.type === "income" && isCurrentMonth(t))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter((t) => t.type === "expense" && isCurrentMonth(t))
      .reduce((sum, t) => sum + t.amount, 0);
    
    const futureExpenses = transactions
      .filter((t) => t.type === "expense" && isFutureMonth(t))
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      transactionCount: transactions.length,
      futureExpenses,
    };
  }
}

export const storage = new MemStorage();
