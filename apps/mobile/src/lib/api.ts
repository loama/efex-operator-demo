import type { AssistantResponse, Beneficiary, CreateBeneficiaryInput, CreatePaymentInput, Currency, Dashboard, Payment, Quote, Statement } from "@efex/contracts";
import { Platform } from "react-native";
import { requestJson } from "./request";

const defaultOrigin = Platform.OS === "android" ? "http://10.0.2.2:8787" : "http://127.0.0.1:8787";
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL ?? defaultOrigin;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return requestJson<T>(API_ORIGIN, path, init);
}

export const api = {
  dashboard: () => request<Dashboard>("/v1/dashboard"),
  beneficiaries: () => request<Beneficiary[]>("/v1/beneficiaries"),
  createBeneficiary: (input: CreateBeneficiaryInput) => request<Beneficiary>("/v1/beneficiaries", { method: "POST", body: JSON.stringify(input) }),
  payments: () => request<Payment[]>("/v1/payments"),
  createPayment: (input: CreatePaymentInput) => request<Payment>("/v1/payments", { method: "POST", body: JSON.stringify(input) }),
  submitPayment: (id: string) => request<Payment>(`/v1/payments/${id}/submit`, { method: "POST" }),
  quote: (sourceAmount: number, sourceCurrency: Currency = "USD", destinationCurrency: Currency = "MXN") => request<Quote>(`/v1/quotes?sourceAmount=${encodeURIComponent(sourceAmount)}&sourceCurrency=${sourceCurrency}&destinationCurrency=${destinationCurrency}`),
  statements: () => request<Statement[]>("/v1/statements"),
  assistant: (message: string) => request<AssistantResponse>("/v1/assistant", { method: "POST", body: JSON.stringify({ message }) }),
  reset: () => request<{ ok: true }>("/v1/demo/reset", { method: "POST" }),
};
