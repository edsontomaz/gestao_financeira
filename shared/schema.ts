import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const paymentMethods = ["credit_card", "debit_card", "pix", "cash"] as const;
export type PaymentMethod = typeof paymentMethods[number];

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  credit_card: "Cartão de Crédito",
  debit_card: "Cartão de Débito",
  pix: "PIX",
  cash: "Dinheiro",
};

export const cardOperators = [
  "santander",
  "c6",
  "porto",
  "mercado_pago",
  "nubank",
  "itau",
  "bradesco",
  "caixa",
  "banco_do_brasil",
  "inter",
  "next",
  "picpay",
  "other"
] as const;
export type CardOperator = typeof cardOperators[number];

export const cardOperatorLabels: Record<CardOperator, string> = {
  santander: "Santander",
  c6: "C6 Bank",
  porto: "Porto Seguro",
  mercado_pago: "Mercado Pago",
  nubank: "Nubank",
  itau: "Itaú",
  bradesco: "Bradesco",
  caixa: "Caixa",
  banco_do_brasil: "Banco do Brasil",
  inter: "Inter",
  next: "Next",
  picpay: "PicPay",
  other: "Outro",
};

export const transactionTypes = ["income", "expense"] as const;
export type TransactionType = typeof transactionTypes[number];

export const profiles = ["edson", "tais"] as const;
export type Profile = typeof profiles[number];

export const profileLabels: Record<Profile, string> = {
  edson: "Edson",
  tais: "Taís",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "Receita",
  expense: "Despesa",
};

export const incomeCategories = [
  "salary",
  "freelance",
  "investments",
  "rent",
  "other_income"
] as const;
export type IncomeCategory = typeof incomeCategories[number];

export const incomeCategoryLabels: Record<IncomeCategory, string> = {
  salary: "Salário",
  freelance: "Freelance",
  investments: "Investimentos",
  rent: "Aluguel",
  other_income: "Outros",
};

export const expenseCategories = [
  "food",
  "transport",
  "health",
  "education",
  "entertainment",
  "shopping",
  "bills",
  "housing",
  "reimbursement",
  "other_expense"
] as const;
export type ExpenseCategory = typeof expenseCategories[number];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  food: "Alimentação",
  transport: "Transporte",
  health: "Saúde",
  education: "Educação",
  entertainment: "Entretenimento",
  shopping: "Compras",
  bills: "Contas",
  housing: "Moradia",
  reimbursement: "Reembolso",
  other_expense: "Outros",
};

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  cardOperator?: CardOperator;
  category: IncomeCategory | ExpenseCategory;
  createdAt: string;
  installments?: number;
  currentInstallment?: number;
  parentTransactionId?: string;
  dueDate?: string;
  profile: Profile;
}

export const insertTransactionSchema = z.object({
  type: z.enum(transactionTypes),
  amount: z.number().positive("O valor deve ser positivo"),
  description: z.string().min(1, "Descrição é obrigatória"),
  paymentMethod: z.enum(paymentMethods),
  cardOperator: z.enum(cardOperators).optional(),
  category: z.union([z.enum(incomeCategories), z.enum(expenseCategories)]),
  installments: z.number().min(1).max(48).optional(),
  currentInstallment: z.number().min(1).optional(),
  parentTransactionId: z.string().optional(),
  createdAt: z.string().optional(),
  dueDate: z.string().optional(),
  profile: z.enum(profiles).optional(),
});

export const updateTransactionSchema = insertTransactionSchema.partial();

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;
