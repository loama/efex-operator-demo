import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createApp } from "./app";
import { createDatabase, seedDatabase, type EfexDatabase } from "./database";
import { answerKapsoWebhook, resetKapsoIdempotencyForTests } from "./kapso";

let db: EfexDatabase;
let app: ReturnType<typeof createApp>["app"];

beforeEach(() => {
  resetKapsoIdempotencyForTests();
  db = createDatabase(":memory:");
  seedDatabase(db);
  app = createApp(db).app;
});

afterEach(() => db.close());

describe("EFEX demo API", () => {
  test("returns a seeded dashboard", async () => {
    const response = await app.request("/v1/dashboard");
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.company.name).toBe("Asteria Imports");
    expect(body.accounts).toHaveLength(2);
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

  test("answers assistant questions with app actions", async () => {
    const response = await app.request("/v1/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "¿Cuál es mi saldo?" }),
    });
    const body = await response.json();
    expect(body.text).toContain("saldo consolidado");
    expect(body.action.route).toBe("/accounts");
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

  test("deduplicates repeated Kapso messages", async () => {
    const service = createApp(db).service;
    const payload = { message: { id: "wamid.100", type: "text", text: { body: "saldo" } }, phone_number_id: "demo_number" };
    const first = await answerKapsoWebhook(service, payload);
    const second = await answerKapsoWebhook(service, payload);
    expect(first[0]?.duplicate).toBeUndefined();
    expect(second[0]?.duplicate).toBe(true);
  });

  test("blocks public demo reset unless explicitly enabled", async () => {
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
