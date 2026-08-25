import { z } from "zod";

export const currencySchema = z.enum(["USD", "MXN"]);
export type Currency = z.infer<typeof currencySchema>;

export const accountSchema = z.object({
  id: z.string(),
  currency: currencySchema,
  name: z.string(),
  balance: z.number(),
  available: z.number(),
  accountNumber: z.string(),
});
export type Account = z.infer<typeof accountSchema>;

export const beneficiarySchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  bank: z.string(),
  currency: currencySchema,
  accountNumber: z.string(),
  reference: z.string(),
  status: z.enum(["active", "pending"]),
  createdAt: z.string(),
});
export type Beneficiary = z.infer<typeof beneficiarySchema>;

export const createBeneficiarySchema = z.object({
  name: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(60),
  bank: z.string().trim().min(2).max(80),
  currency: currencySchema,
  accountNumber: z.string().trim().min(4).max(34),
  reference: z.string().trim().min(2).max(40),
});
export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;

export const paymentStatusSchema = z.enum(["draft", "processing", "approved"]);
export const paymentSchema = z.object({
  id: z.string(),
  beneficiaryId: z.string(),
  beneficiaryName: z.string(),
  sourceCurrency: currencySchema,
  destinationCurrency: currencySchema,
  sourceAmount: z.number(),
  destinationAmount: z.number(),
  fee: z.number(),
  rate: z.number(),
  reference: z.string(),
  status: paymentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Payment = z.infer<typeof paymentSchema>;

export const createPaymentSchema = z.object({
  beneficiaryId: z.string().min(1),
  sourceCurrency: currencySchema,
  destinationCurrency: currencySchema,
  sourceAmount: z.number().positive().max(1_000_000),
  reference: z.string().trim().min(2).max(80),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const quoteSchema = z.object({
  sourceCurrency: currencySchema,
  destinationCurrency: currencySchema,
  sourceAmount: z.number(),
  destinationAmount: z.number(),
  rate: z.number(),
  fee: z.number(),
  expiresAt: z.string(),
});
export type Quote = z.infer<typeof quoteSchema>;

export const activitySchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  amount: z.number(),
  currency: currencySchema,
  direction: z.enum(["in", "out"]),
  status: z.enum(["approved", "processing"]),
  createdAt: z.string(),
});
export type Activity = z.infer<typeof activitySchema>;

export const statementSchema = z.object({
  id: z.string(),
  month: z.string(),
  year: z.number(),
  accountId: z.string(),
  status: z.literal("available"),
  downloadUrl: z.string(),
});
export type Statement = z.infer<typeof statementSchema>;

export const dashboardSchema = z.object({
  company: z.object({ name: z.string(), contactName: z.string() }),
  totalUsd: z.number(),
  receivedThisMonth: z.number(),
  sentThisMonth: z.number(),
  accounts: z.array(accountSchema),
  activity: z.array(activitySchema),
});
export type Dashboard = z.infer<typeof dashboardSchema>;

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(500),
});
export const assistantResponseSchema = z.object({
  id: z.string(),
  text: z.string(),
  action: z
    .object({
      label: z.string(),
      route: z.string(),
    })
    .optional(),
  attachment: z
    .object({
      label: z.string(),
      url: z.string(),
      kind: z.literal("pdf"),
    })
    .optional(),
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

export const apiErrorSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
