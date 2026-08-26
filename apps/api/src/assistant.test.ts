import { beforeEach, describe, expect, test } from "bun:test";
import { createDatabase, seedDatabase, type EfexDatabase } from "./database";
import { createAzureOpenAIRequester, createGroundedAssistant, type ModelRequest } from "./assistant";
import { createTreasuryService } from "./service";

let db: EfexDatabase;

beforeEach(() => {
  db = createDatabase(":memory:");
  seedDatabase(db);
});

describe("grounded assistant", () => {
  test("sends Azure Responses requests to the configured v1 endpoint", async () => {
    let receivedPath = "";
    let receivedKey = "";
    let receivedBody: Record<string, unknown> = {};
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        receivedPath = new URL(request.url).pathname;
        receivedKey = request.headers.get("api-key") ?? "";
        receivedBody = await request.json() as Record<string, unknown>;
        return Response.json({
          id: "response_azure",
          output_text: "",
          output: [{ type: "function_call", call_id: "call_dashboard", name: "get_dashboard", arguments: "{}" }],
        });
      },
    });

    try {
      const request = createAzureOpenAIRequester("azure-secret", `${server.url}openai/v1`);
      const response = await request({
        model: "efex-router",
        instructions: "Route this request.",
        input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "Saldo" }] }],
        tools: [],
        reasoning: { effort: "low" },
        toolChoice: "required",
        parallelToolCalls: false,
        store: false,
      });

      expect(receivedPath).toBe("/openai/v1/responses");
      expect(receivedKey).toBe("azure-secret");
      expect(receivedBody.model).toBe("efex-router");
      expect(response.output[0]).toEqual({
        type: "function_call",
        callId: "call_dashboard",
        name: "get_dashboard",
        arguments: "{}",
      });
    } finally {
      server.stop(true);
    }
  });

  test("prefers Azure environment configuration for the grounded assistant", async () => {
    let receivedModel = "";
    const server = Bun.serve({
      port: 0,
      async fetch(request) {
        const body = await request.json() as { model?: string };
        receivedModel = body.model ?? "";
        return Response.json({
          id: "response_azure_environment",
          output_text: "",
          output: [{ type: "function_call", call_id: "call_dashboard", name: "get_dashboard", arguments: "{}" }],
        });
      },
    });
    const previous = {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_BASE_URL,
      model: process.env.AZURE_OPENAI_MODEL,
      openAIKey: process.env.OPENAI_API_KEY,
    };

    try {
      process.env.AZURE_OPENAI_API_KEY = "azure-secret";
      process.env.AZURE_OPENAI_BASE_URL = `${server.url}openai/v1`;
      process.env.AZURE_OPENAI_MODEL = "efex-router";
      delete process.env.OPENAI_API_KEY;
      const assistant = createGroundedAssistant(createTreasuryService(db));

      const answer = await assistant("¿Cuál es mi saldo?");

      expect(receivedModel).toBe("efex-router");
      expect(answer.text).toContain("940,897.41");
    } finally {
      server.stop(true);
      if (previous.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
      else process.env.AZURE_OPENAI_API_KEY = previous.apiKey;
      if (previous.baseUrl === undefined) delete process.env.AZURE_OPENAI_BASE_URL;
      else process.env.AZURE_OPENAI_BASE_URL = previous.baseUrl;
      if (previous.model === undefined) delete process.env.AZURE_OPENAI_MODEL;
      else process.env.AZURE_OPENAI_MODEL = previous.model;
      if (previous.openAIKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous.openAIKey;
    }
  });

  test("uses the deterministic assistant when the Azure deployment is incomplete", async () => {
    let requests = 0;
    const server = Bun.serve({
      port: 0,
      fetch() {
        requests += 1;
        return Response.json({});
      },
    });
    const previous = {
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      baseUrl: process.env.AZURE_OPENAI_BASE_URL,
      model: process.env.AZURE_OPENAI_MODEL,
      openAIKey: process.env.OPENAI_API_KEY,
    };

    try {
      process.env.AZURE_OPENAI_API_KEY = "azure-secret";
      process.env.AZURE_OPENAI_BASE_URL = `${server.url}openai/v1`;
      delete process.env.AZURE_OPENAI_MODEL;
      process.env.OPENAI_API_KEY = "legacy-key-must-not-be-used";
      const assistant = createGroundedAssistant(createTreasuryService(db));

      const answer = await assistant("¿Cuál es mi saldo?");

      expect(requests).toBe(0);
      expect(answer.text).toContain("940,897.41");
    } finally {
      server.stop(true);
      if (previous.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
      else process.env.AZURE_OPENAI_API_KEY = previous.apiKey;
      if (previous.baseUrl === undefined) delete process.env.AZURE_OPENAI_BASE_URL;
      else process.env.AZURE_OPENAI_BASE_URL = previous.baseUrl;
      if (previous.model === undefined) delete process.env.AZURE_OPENAI_MODEL;
      else process.env.AZURE_OPENAI_MODEL = previous.model;
      if (previous.openAIKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previous.openAIKey;
    }
  });

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
