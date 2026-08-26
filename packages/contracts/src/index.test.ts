import { describe, expect, test } from "bun:test";
import { createBeneficiarySchema, createPaymentSchema, currencySchema } from "./index";

describe("contract validation", () => {
  test("accepts a complete beneficiary", () => {
    const result = createBeneficiarySchema.safeParse({
      name: "Frutella Company",
      country: "México",
      bank: "BBVA México",
      currency: "MXN",
      accountNumber: "8842",
      reference: "FRUTELLA 01",
    });
    expect(result.success).toBe(true);
  });

  test("rejects unsafe payment amounts", () => {
    const result = createPaymentSchema.safeParse({
      beneficiaryId: "beneficiary_1",
      sourceCurrency: "USD",
      destinationCurrency: "MXN",
      sourceAmount: 0,
      reference: "Invoice 1004",
    });
    expect(result.success).toBe(false);
  });

  test("accepts the six demo conversion currencies", () => {
    expect(["USD", "MXN", "EUR", "COP", "UYU", "ARS"].every((currency) => currencySchema.safeParse(currency).success)).toBe(true);
  });
});
