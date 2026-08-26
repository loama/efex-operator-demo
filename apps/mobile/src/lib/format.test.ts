import { describe, expect, test } from "bun:test";
import { compactMoney, formatCurrencyInput, initials, money, normalizeCurrencyInput, parseCurrencyInput } from "./format";

describe("formatters", () => {
  test("formats currency with cents", () => expect(money(25000, "USD")).toBe("$25,000.00"));
  test("formats a currency field with grouping and cents", () => {
    expect(formatCurrencyInput("25000")).toBe("25,000.00");
    expect(formatCurrencyInput("25000.5")).toBe("25,000.50");
  });
  test("normalizes either decimal separator for editing", () => {
    expect(normalizeCurrencyInput("25000,5")).toBe("25000.5");
    expect(normalizeCurrencyInput("$ 25 000.50 USD")).toBe("25000.50");
    expect(normalizeCurrencyInput("25,000")).toBe("25000");
    expect(normalizeCurrencyInput("25,000.50")).toBe("25000.50");
  });
  test("parses normalized input without treating grouping as invalid", () => {
    expect(parseCurrencyInput("25000.50")).toBe(25000.5);
    expect(Number.isNaN(parseCurrencyInput(""))).toBe(true);
  });
  test("creates compact initials", () => expect(initials("Frutella Company")).toBe("FC"));
  test("uses deterministic compact currency", () => expect(compactMoney(350000, "USD")).toBe("$350K"));
});
