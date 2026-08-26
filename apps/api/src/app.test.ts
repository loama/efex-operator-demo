import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { createApp, resolveRequestLimit } from "./app";
import type { ModelResponse } from "./assistant";
import { createDatabase, seedDatabase, type EfexDatabase } from "./database";
import { answerKapsoWebhook } from "./kapso";
import { createTreasuryService } from "./service";

let db: EfexDatabase;
let app: ReturnType<typeof createApp>["app"];
const originalWebhookSecret = process.env.KAPSO_WEBHOOK_SECRET;
const originalPhoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
const originalPublicApiOrigin = process.env.PUBLIC_API_ORIGIN;
const originalPublicAppOrigin = process.env.PUBLIC_APP_ORIGIN;
const originalWebOrigin = process.env.WEB_ORIGIN;
const originalRequestLimit = process.env.DEMO_REQUEST_LIMIT;

beforeEach(() => {
  db = createDatabase(":memory:");
  seedDatabase(db);
  app = createApp(db).app;
});

afterEach(() => {
  if (originalWebhookSecret) process.env.KAPSO_WEBHOOK_SECRET = originalWebhookSecret;
  else delete process.env.KAPSO_WEBHOOK_SECRET;
  if (originalPhoneNumberId) process.env.KAPSO_PHONE_NUMBER_ID = originalPhoneNumberId;
  else delete process.env.KAPSO_PHONE_NUMBER_ID;
  if (originalPublicApiOrigin) process.env.PUBLIC_API_ORIGIN = originalPublicApiOrigin;
  else delete process.env.PUBLIC_API_ORIGIN;
  if (originalPublicAppOrigin) process.env.PUBLIC_APP_ORIGIN = originalPublicAppOrigin;
  else delete process.env.PUBLIC_APP_ORIGIN;
  if (originalWebOrigin) process.env.WEB_ORIGIN = originalWebOrigin;
  else delete process.env.WEB_ORIGIN;
  if (originalRequestLimit) process.env.DEMO_REQUEST_LIMIT = originalRequestLimit;
  else delete process.env.DEMO_REQUEST_LIMIT;
  db.close();
});

describe("EFEX demo API", () => {
  test("uses a safe request limit when configuration is invalid", () => {
    expect(resolveRequestLimit(undefined)).toBe(120);
    expect(resolveRequestLimit("not a number")).toBe(120);
    expect(resolveRequestLimit("0")).toBe(120);
    expect(resolveRequestLimit("10001")).toBe(120);
    expect(resolveRequestLimit("240")).toBe(240);
  });

  test("allows the configured production web origin", async () => {
    const webOrigin = "https://efex-operator-demo-loama.onrender.com";
    process.env.WEB_ORIGIN = webOrigin;
    app = createApp(db).app;
    const response = await app.request("/v1/dashboard", {
      method: "OPTIONS",
      headers: {
        Origin: webOrigin,
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(webOrigin);
  });

  test("returns a seeded dashboard", async () => {
    const response = await app.request("/v1/dashboard");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.company.name).toBe("Asteria Imports");
    expect(body.accounts).toHaveLength(2);
  });

  test("limits public API requests by client", async () => {
    process.env.DEMO_REQUEST_LIMIT = "2";
    app = createApp(db).app;
    const headers = { "X-Forwarded-For": "203.0.113.10" };
    expect((await app.request("/v1/dashboard", { headers })).status).toBe(200);
    expect((await app.request("/v1/dashboard", { headers })).status).toBe(200);
    const limited = await app.request("/v1/dashboard", { headers });
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
  });

  test("creates a beneficiary and persists it", async () => {
    const response = await app.request("/v1/beneficiaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Café Bruma",
        country: "México",
        bank: "Banorte",
        currency: "MXN",
        accountNumber: "00001234",
        reference: "BRUMA 01",
      }),
    });
    expect(response.status).toBe(201);
    const list = await (await app.request("/v1/beneficiaries")).json();
    expect(list.some((item: { name: string }) => item.name === "Café Bruma")).toBe(true);
  });

  test("creates and submits a simulated payment", async () => {
    const created = await app.request("/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        beneficiaryId: "beneficiary_frutella",
        sourceCurrency: "USD",
        destinationCurrency: "MXN",
        sourceAmount: 25000,
        reference: "Invoice 1088",
      }),
    });
    expect(created.status).toBe(201);
    const payment = await created.json();
    expect(payment.status).toBe("draft");
    expect(payment.destinationAmount).toBe(428000);

    const submitted = await app.request(`/v1/payments/${payment.id}/submit`, { method: "POST" });
    expect(submitted.status).toBe(200);
    expect((await submitted.json()).status).toBe("processing");
  });

  test("rejects invalid payment input", async () => {
    const response = await app.request("/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryId: "beneficiary_frutella", sourceAmount: 0 }),
    });
    expect(response.status).toBe(400);
  });

  test("returns a client error for malformed JSON", async () => {
    const response = await app.request("/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBeString();
  });

  test("rejects a destination currency that conflicts with the beneficiary", async () => {
    const response = await app.request("/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryId: "beneficiary_global_foods", sourceCurrency: "USD", destinationCurrency: "MXN", sourceAmount: 100, reference: "Currency check" }),
    });
    expect(response.status).toBe(422);
  });

  test("rejects a payment over the available demo balance", async () => {
    const response = await app.request("/v1/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beneficiaryId: "beneficiary_frutella", sourceCurrency: "USD", destinationCurrency: "MXN", sourceAmount: 900000, reference: "Funds check" }),
    });
    expect(response.status).toBe(422);
  });

  test("rejects aggregate payment reservations over the available balance", async () => {
    const input = { beneficiaryId: "beneficiary_frutella", sourceCurrency: "USD", destinationCurrency: "MXN", sourceAmount: 500000, reference: "Reservation check" };
    const first = await app.request("/v1/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    const second = await app.request("/v1/payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
    expect(first.status).toBe(201);
    expect(second.status).toBe(422);
  });

  test("answers assistant questions with app actions", async () => {
    const response = await app.request("/v1/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "¿Cuál es mi saldo?" }),
    });
    const body = await response.json();
    expect(body.text).toContain("saldo consolidado");
    expect(body.action.route).toBe("/accounts");

    const beneficiaries = await app.request("/v1/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Muéstrame mis beneficiarios" }),
    });
    const beneficiaryAnswer = await beneficiaries.json();
    expect(beneficiaryAnswer.action.route).toBe("/beneficiaries");
  });

  test("serves grounded model answers through the assistant endpoint", async () => {
    const responses: ModelResponse[] = [
      {
        id: "response_tool",
        outputText: "",
        output: [{ type: "function_call", callId: "call_payments", name: "list_payments", arguments: "{}" }],
      },
    ];
    app = createApp(db, { modelRequester: async () => responses.shift()! }).app;

    const response = await app.request("/v1/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "¿Cuál es el estado de mi último pago?" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.text).toContain("Global Foods LLC");
    expect(body.action.route).toBe("/payments");
  });

  test("simulates an inbound WhatsApp message without credentials", async () => {
    const response = await app.request("/v1/whatsapp/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Necesito mi estado de cuenta" }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.delivered).toBe(false);
    expect(body.response.attachment.kind).toBe("pdf");
  });

  test("rejects unsigned Kapso webhooks", async () => {
    const response = await app.request("/webhooks/kapso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "whatsapp.message.received", data: {} }),
    });
    expect(response.status).toBe(401);
  });

  test("deduplicates concurrent Kapso messages and persists the claim", async () => {
    const service = createTreasuryService(db);
    const payload = { message: { id: "wamid.100", type: "text", text: { body: "saldo" } }, phone_number_id: "demo_number" };
    const concurrent = await Promise.all([answerKapsoWebhook(service, payload), answerKapsoWebhook(service, payload)]);
    expect(concurrent.flat().filter((answer) => answer.duplicate).length).toBe(1);
    const restartedService = createTreasuryService(db);
    const repeated = await answerKapsoWebhook(restartedService, payload);
    expect(repeated[0]?.duplicate).toBe(true);
  });

  test("reclaims a stale Kapso processing lease after a process interruption", () => {
    const service = createTreasuryService(db);
    expect(service.claimKapsoMessage("wamid.stale").claimed).toBe(true);
    expect(service.claimKapsoMessage("wamid.stale").claimed).toBe(false);
    db.prepare("UPDATE kapso_deliveries SET updated_at = ? WHERE message_id = ?").run("2020-01-01T00:00:00.000Z", "wamid.stale");

    const restarted = createTreasuryService(db);

    expect(restarted.claimKapsoMessage("wamid.stale").claimed).toBe(true);
  });

  test("resumes a Kapso document retry without resending text", async () => {
    process.env.KAPSO_PHONE_NUMBER_ID = "demo_number";
    process.env.PUBLIC_API_ORIGIN = "https://demo.example";
    const service = createTreasuryService(db);
    const payload = {
      message: { id: "wamid.document", type: "text", text: { body: "Necesito mi estado de cuenta" }, kapso: { phone_number: "5215550100", phone_number_id: "demo_number" } },
      phone_number_id: "demo_number",
    };
    let textSends = 0;
    let documentSends = 0;
    const delivery = {
      sendText: async () => { textSends += 1; },
      sendDocument: async () => { documentSends += 1; if (documentSends === 1) throw new Error("Document transport failed"); },
    };
    await expect(answerKapsoWebhook(service, payload, delivery)).rejects.toThrow("Document transport failed");
    const retried = await answerKapsoWebhook(service, payload, delivery);
    expect(retried[0]?.delivered).toBe(true);
    expect(textSends).toBe(0);
    expect(documentSends).toBe(2);
  });

  test("releases a Kapso claim when assistant processing fails", async () => {
    const service = createTreasuryService(db);
    const payload = { message: { id: "wamid.model_failure", type: "text", text: { body: "saldo" } }, phone_number_id: "demo_number" };
    const failingAssistant = async () => {
      throw new Error("Assistant failed");
    };

    await expect(answerKapsoWebhook(service, payload, undefined, failingAssistant)).rejects.toThrow("Assistant failed");
    const retried = await answerKapsoWebhook(service, payload);

    expect(retried[0]?.duplicate).not.toBe(true);
    expect(retried[0]).toMatchObject({ response: { action: { route: "/accounts" } } });
  });

  test("isolates a failed event from the rest of a Kapso batch", async () => {
    const service = createTreasuryService(db);
    const payload = {
      type: "whatsapp.message.received",
      batch: true,
      data: [
        { message: { id: "wamid.batch_failure", type: "text", text: { body: "fallar" } }, phone_number_id: "demo_number" },
        { message: { id: "wamid.batch_success", type: "text", text: { body: "saldo" } }, phone_number_id: "demo_number" },
      ],
    };
    const responder = async (message: string) => {
      if (message === "fallar") throw new Error("Assistant failed");
      return service.assistant(message);
    };

    await expect(answerKapsoWebhook(service, payload, undefined, responder)).rejects.toThrow("Assistant failed");
    const retried = await answerKapsoWebhook(service, payload);

    expect(retried.find((answer) => answer.messageId === "wamid.batch_failure")?.duplicate).not.toBe(true);
    expect(retried.find((answer) => answer.messageId === "wamid.batch_success")?.duplicate).toBe(true);
  });

  test("sends an interactive WhatsApp action without generating an image", async () => {
    process.env.KAPSO_PHONE_NUMBER_ID = "demo_number";
    process.env.PUBLIC_APP_ORIGIN = "https://efex.example";
    const service = createTreasuryService(db);
    const payload = {
      message: { id: "wamid.action", type: "text", text: { body: "¿Cuál es mi saldo?" }, kapso: { phone_number: "5215550100", phone_number_id: "demo_number" } },
      phone_number_id: "demo_number",
    };
    let textSends = 0;
    const actions: Array<{ bodyText: string; parameters: { displayText: string; url: string } }> = [];
    const delivery = {
      sendText: async () => { textSends += 1; },
      sendDocument: async () => {},
      sendInteractiveCtaUrl: async (input: { bodyText: string; parameters: { displayText: string; url: string } }) => { actions.push(input); },
    };

    await answerKapsoWebhook(service, payload, delivery);

    expect(textSends).toBe(0);
    expect(actions[0]?.bodyText).toContain("saldo consolidado");
    expect(actions[0]?.parameters.url).toBe("https://efex.example/accounts");
  });

  test("rejects signed malformed Kapso payloads", async () => {
    const secret = "test webhook secret";
    process.env.KAPSO_WEBHOOK_SECRET = secret;
    const request = async (body: string) => app.request("/webhooks/kapso", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": "whatsapp.message.received",
        "X-Webhook-Signature": createHmac("sha256", secret).update(body).digest("hex"),
      },
      body,
    });
    expect((await request("not json")).status).toBe(400);
    expect((await request(JSON.stringify({ type: "whatsapp.message.received", data: {} }))).status).toBe(400);
    const oversizedBatch = Array.from({ length: 11 }, (_, index) => ({
      message: { id: `wamid.${index}`, type: "text", text: { body: "saldo" } },
      phone_number_id: "demo_number",
    }));
    expect((await request(JSON.stringify({ type: "whatsapp.message.received", batch: true, data: oversizedBatch }))).status).toBe(400);
  });

  test("acknowledges a valid Kapso webhook after processing succeeds", async () => {
    const secret = "test webhook secret";
    process.env.KAPSO_WEBHOOK_SECRET = secret;
    const created = createApp(db, {
      modelRequester: async () => ({
        id: "response_tool",
        outputText: "",
        output: [{ type: "function_call", callId: "call_dashboard", name: "get_dashboard", arguments: "{}" }],
      }),
    });
    app = created.app;
    const body = JSON.stringify({
      type: "whatsapp.message.received",
      data: {
        message: { id: "wamid.fast_ack", type: "text", text: { body: "Hola" } },
        phone_number_id: "demo_number",
      },
    });

    const response = await app.request("/webhooks/kapso", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": "whatsapp.message.received",
        "X-Webhook-Signature": createHmac("sha256", secret).update(body).digest("hex"),
      },
      body,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, processed: 1 });
  });

  test("returns a retryable error when Kapso delivery fails", async () => {
    const secret = "test webhook secret";
    process.env.KAPSO_WEBHOOK_SECRET = secret;
    process.env.KAPSO_PHONE_NUMBER_ID = "demo_number";
    let sends = 0;
    const created = createApp(db, {
      kapsoDeliveryClient: {
        sendText: async () => {
          sends += 1;
          if (sends === 1) throw new Error("Kapso transport failed");
        },
        sendDocument: async () => {},
      },
    });
    const body = JSON.stringify({
      type: "whatsapp.message.received",
      data: {
        message: {
          id: "wamid.route_retry",
          type: "text",
          text: { body: "Hola" },
          kapso: { phone_number: "5215550100", phone_number_id: "demo_number" },
        },
        phone_number_id: "demo_number",
      },
    });
    const request = () => created.app.request("/webhooks/kapso", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": "whatsapp.message.received",
        "X-Webhook-Signature": createHmac("sha256", secret).update(body).digest("hex"),
      },
      body,
    });

    expect((await request()).status).toBe(503);
    expect((await request()).status).toBe(200);
    expect(sends).toBe(2);
  });

  test("blocks public demo reset", async () => {
    const response = await app.request("https://demo.example/v1/demo/reset", { method: "POST" });
    expect(response.status).toBe(403);
  });

  test("downloads a valid synthetic PDF statement", async () => {
    const response = await app.request("/v1/statements/statement_1/download");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const signature = new TextDecoder().decode((await response.arrayBuffer()).slice(0, 4));
    expect(signature).toBe("%PDF");
  });
});
