import { createBeneficiarySchema, createPaymentSchema, assistantRequestSchema, currencySchema } from "@efex/contracts";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { z, ZodError } from "zod";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createDatabase, ensureSeeded, seedDatabase, type EfexDatabase } from "./database";
import { createTreasuryService, TreasuryValidationError } from "./service";
import { answerKapsoWebhook, parseKapsoMessages, verifyKapsoSignature, type KapsoDeliveryClient } from "./kapso";
import { createGroundedAssistant, type ModelRequester } from "./assistant";

const quoteQuerySchema = z.object({
  sourceCurrency: currencySchema,
  destinationCurrency: currencySchema,
  sourceAmount: z.coerce.number().positive().max(1_000_000),
});

export function resolveRequestLimit(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : 120;
}

type AppOptions = {
  modelRequester?: ModelRequester;
  kapsoDeliveryClient?: KapsoDeliveryClient;
};

export function createApp(database?: EfexDatabase, options: AppOptions = {}) {
  const db = database ?? createDatabase();
  ensureSeeded(db);
  const service = createTreasuryService(db);
  const assistant = createGroundedAssistant(service, { request: options.modelRequester });
  const app = new Hono();
  const configuredOrigins = new Set(
    (process.env.WEB_ORIGIN ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
  const requestLimit = resolveRequestLimit(process.env.DEMO_REQUEST_LIMIT);
  const rateLimitWindowMs = 60_000;
  const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();
  let lastRateLimitPrune = Date.now();

  function consumeRateLimit(key: string, maximum: number, now: number) {
    const current = rateLimitBuckets.get(key);
    if (!current || current.resetAt <= now) {
      rateLimitBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
      return true;
    }
    if (current.count >= maximum) return false;
    current.count += 1;
    return true;
  }

  app.use("*", logger());
  app.use("/v1/*", cors({
    origin: (origin) =>
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || configuredOrigins.has(origin)
        ? origin
        : "",
    allowMethods: ["GET", "POST", "OPTIONS"],
  }));
  app.use("/v1/*", async (context, next) => {
    if (context.req.method === "OPTIONS") return next();
    const now = Date.now();
    if (now - lastRateLimitPrune >= rateLimitWindowMs) {
      for (const [key, bucket] of rateLimitBuckets) {
        if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
      }
      lastRateLimitPrune = now;
    }
    const forwarded = context.req.header("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .at(-1);
    const clientKey = `client:${forwarded ?? "local"}`;
    const allowedForClient = consumeRateLimit(clientKey, requestLimit, now);
    const allowedGlobally = allowedForClient ? consumeRateLimit("global", requestLimit * 10, now) : true;
    if (!allowedForClient || !allowedGlobally) {
      context.header("Retry-After", "60");
      return context.json({ error: "El servicio demo recibió demasiadas solicitudes. Intenta de nuevo en un minuto." }, 429);
    }
    await next();
  });

  app.get("/health", (context) => context.json({ ok: true, service: "efex-demo-api" }));
  app.get("/v1/dashboard", (context) => context.json(service.dashboard()));
  app.get("/v1/beneficiaries", (context) => context.json(service.listBeneficiaries()));
  app.post("/v1/beneficiaries", zValidator("json", createBeneficiarySchema), (context) =>
    context.json(service.createBeneficiary(context.req.valid("json")), 201),
  );
  app.get("/v1/payments", (context) => context.json(service.listPayments()));
  app.post("/v1/payments", zValidator("json", createPaymentSchema), (context) => {
    try {
      return context.json(service.createPayment(context.req.valid("json")), 201);
    } catch (error) {
      const status = error instanceof TreasuryValidationError ? 422 : 404;
      return context.json({ error: error instanceof Error ? error.message : "Unable to create payment" }, status);
    }
  });
  app.post("/v1/payments/:id/submit", (context) => {
    const payment = service.submitPayment(context.req.param("id"));
    return payment ? context.json(payment) : context.json({ error: "Draft payment not found" }, 404);
  });
  app.get("/v1/quotes", zValidator("query", quoteQuerySchema), (context) => {
    const query = context.req.valid("query");
    return context.json(service.quote(query.sourceCurrency, query.destinationCurrency, query.sourceAmount));
  });
  app.get("/v1/statements", (context) => context.json(service.statements()));
  app.get("/v1/statements/:id/download", async (context) => {
    const statement = service.statements().find((item) => item.id === context.req.param("id"));
    if (!statement) return context.json({ error: "Statement not found" }, 404);
    const document = await PDFDocument.create();
    const page = document.addPage([612, 792]);
    const regular = await document.embedFont(StandardFonts.Helvetica);
    const bold = await document.embedFont(StandardFonts.HelveticaBold);
    page.drawText("EFEX DEMO", { x: 52, y: 720, font: bold, size: 22, color: rgb(0.07, 0.07, 0.07) });
    page.drawRectangle({ x: 52, y: 700, width: 64, height: 4, color: rgb(0.96, 0.97, 0.48) });
    page.drawText("Estado de cuenta sintetico", { x: 52, y: 650, font: bold, size: 18 });
    page.drawText(`${statement.month} ${statement.year}`, { x: 52, y: 620, font: regular, size: 13 });
    page.drawText("Cuenta global USD", { x: 52, y: 575, font: bold, size: 12 });
    page.drawText(`Saldo inicial     USD ${statement.openingBalance.toFixed(2)}`, { x: 52, y: 545, font: regular, size: 11 });
    page.drawText(`Entradas demo     USD ${statement.incoming.toFixed(2)}`, { x: 52, y: 520, font: regular, size: 11 });
    page.drawText(`Salidas demo      USD ${statement.outgoing.toFixed(2)}`, { x: 52, y: 495, font: regular, size: 11 });
    page.drawText(`Saldo final       USD ${statement.closingBalance.toFixed(2)}`, { x: 52, y: 470, font: bold, size: 11 });
    page.drawText("Este documento usa datos sinteticos y no representa fondos reales.", { x: 52, y: 90, font: regular, size: 10, color: rgb(0.4, 0.4, 0.4) });
    const bytes = await document.save();
    context.header("Content-Disposition", `attachment; filename=efex-demo-${statement.id}.pdf`);
    context.header("Content-Type", "application/pdf");
    return context.body(bytes.buffer as ArrayBuffer);
  });
  app.post("/v1/assistant", zValidator("json", assistantRequestSchema), async (context) =>
    context.json(await assistant(context.req.valid("json").message)),
  );
  app.post("/v1/whatsapp/simulate", zValidator("json", assistantRequestSchema), async (context) =>
    context.json({ channel: "whatsapp", delivered: false, response: await assistant(context.req.valid("json").message) }),
  );
  app.post("/webhooks/kapso", async (context) => {
    const rawBody = await context.req.text();
    if (!verifyKapsoSignature(rawBody, context.req.header("x-webhook-signature"), process.env.KAPSO_WEBHOOK_SECRET)) {
      return context.json({ error: "Invalid webhook signature" }, 401);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
      parseKapsoMessages(payload);
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof ZodError) return context.json({ error: "Invalid webhook payload" }, 400);
      throw error;
    }
    const eventType = context.req.header("x-webhook-event") ?? (payload as { type?: string }).type;
    if (eventType !== "whatsapp.message.received") return context.json({ ok: true, processed: 0 });
    try {
      const answers = await answerKapsoWebhook(service, payload, options.kapsoDeliveryClient, assistant);
      return context.json({ ok: true, processed: answers.length });
    } catch (error) {
      console.error("Kapso delivery failed", error);
      return context.json({ error: "Kapso delivery is temporarily unavailable" }, 503);
    }
  });
  app.post("/v1/demo/reset", (context) => {
    const hostname = new URL(context.req.url).hostname;
    if (!["localhost", "127.0.0.1"].includes(hostname)) {
      return context.json({ error: "Demo reset is disabled on this host" }, 403);
    }
    seedDatabase(db);
    return context.json({ ok: true });
  });

  app.onError((error, context) => {
    if (error instanceof HTTPException) return context.json({ error: error.message || "Invalid request" }, error.status);
    console.error(error);
    return context.json({ error: "Unexpected demo service error" }, 500);
  });

  return { app, db, service };
}
