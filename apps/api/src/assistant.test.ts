import { beforeEach, describe, expect, test } from "bun:test";
import { createDatabase, seedDatabase, type EfexDatabase } from "./database";
import { createGroundedAssistant, type ModelRequest } from "./assistant";
import { createTreasuryService } from "./service";

let db: EfexDatabase;

beforeEach(() => {
  db = createDatabase(":memory:");
  seedDatabase(db);
});

describe("grounded assistant", () => {
  test("uses the model only to select a typed server answer", async () => {
    const requests: ModelRequest[] = [];
    const assistant = createGroundedAssistant(createTreasuryService(db), {
      request: async (input) => {
        requests.push(input);
        return {
          id: "response_tool",
          outputText: "The balance is $12,000,000.",
          output: [{ type: "function_call", callId: "call_dashboard", name: "get_dashboard", arguments: "{}" }],
        };
      },
    });

    const answer = await assistant("¿Cuál es mi saldo disponible?");

    expect(requests).toHaveLength(1);
    expect(requests[0]?.toolChoice).toBe("required");
    expect(JSON.stringify(requests[0])).not.toContain("940897.41");
    expect(answer.text).toContain("940,897.41");
    expect(answer.text).not.toContain("12,000,000");
    expect(answer.action?.route).toBe("/accounts");
  });

  test("falls back when the model selects an unrelated tool for a known intent", async () => {
    const service = createTreasuryService(db);
    const assistant = createGroundedAssistant(service, {
      request: async () => ({
        id: "response_wrong_tool",
        outputText: "",
        output: [{ type: "function_call", callId: "call_beneficiaries", name: "list_beneficiaries", arguments: "{}" }],
      }),
    });

    const answer = await assistant("¿Cuál es mi saldo?");

    expect(answer.text).toContain("saldo consolidado");
    expect(answer.action?.route).toBe("/accounts");
  });

  test("uses the deterministic answer if the model request fails", async () => {
    const service = createTreasuryService(db);
    const assistant = createGroundedAssistant(service, {
      request: async () => {
        throw new Error("Model transport unavailable");
      },
    });

    const answer = await assistant("¿Cuál es mi saldo?");

    expect(answer.text).toContain("saldo consolidado");
    expect(answer.action?.route).toBe("/accounts");
  });

  test("renders quote arguments with deterministic treasury math", async () => {
    const service = createTreasuryService(db);
    const assistant = createGroundedAssistant(service, {
      request: async () => ({
        id: "response_quote",
        outputText: "",
        output: [{
          type: "function_call",
          callId: "call_quote",
          name: "get_quote",
          arguments: JSON.stringify({ sourceCurrency: "USD", destinationCurrency: "MXN", sourceAmount: 25000 }),
        }],
      }),
    });

    const answer = await assistant("Convierte 25,000 USD a MXN");

    expect(answer.text).toContain("428,000.00 MXN");
    expect(answer.action?.route).toBe("/convert");
  });

  test("answers for a named payment instead of the newest payment", async () => {
    const service = createTreasuryService(db);
    const assistant = createGroundedAssistant(service, {
      request: async () => ({
        id: "response_payment",
        outputText: "",
        output: [{
          type: "function_call",
          callId: "call_payment",
          name: "list_payments",
          arguments: JSON.stringify({ beneficiaryName: null, paymentId: null }),
        }],
      }),
    });

    const answer = await assistant("¿Cuál es el estado del pago a Frutella Company?");

    expect(answer.text).toContain("Frutella Company");
    expect(answer.text).toContain("aprobado");
    expect(answer.text).not.toContain("Global Foods LLC");
  });

  test("returns the requested statement month", async () => {
    const service = createTreasuryService(db);
    const assistant = createGroundedAssistant(service, {
      request: async () => ({
        id: "response_statement",
        outputText: "",
        output: [{
          type: "function_call",
          callId: "call_statement",
          name: "list_statements",
          arguments: JSON.stringify({ month: null, year: null }),
        }],
      }),
    });

    const answer = await assistant("Envíame el estado de cuenta de abril de 2026");

    expect(answer.text).toContain("abril 2026");
    expect(answer.attachment?.url).toContain("statement_2");
  });
});
