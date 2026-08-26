import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { AssistantResponse } from "@efex/contracts";
import type { TreasuryService } from "./service";

const messageSchema = z.object({
  id: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  kapso: z.object({ phone_number: z.string().optional(), phone_number_id: z.string().optional() }).passthrough().optional(),
}).passthrough();

const eventDataSchema = z.object({
  message: messageSchema,
  conversation: z.object({ phone_number: z.string().optional() }).passthrough().optional(),
  phone_number_id: z.string().optional(),
}).passthrough();

const webhookSchema = z.union([
  eventDataSchema,
  z.object({ type: z.string().optional(), data: z.union([eventDataSchema, z.array(eventDataSchema).min(1).max(10)]), batch: z.boolean().optional() }).passthrough(),
]);

export function verifyKapsoSignature(rawBody: string, signature: string | undefined, secret: string | undefined) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function parseKapsoMessages(payload: unknown) {
  const parsed = webhookSchema.parse(payload);
  if ("data" in parsed) return Array.isArray(parsed.data) ? parsed.data : [parsed.data];
  return [parsed];
}

export type KapsoDeliveryClient = {
  sendText: (input: { phoneNumberId: string; to: string; body: string; previewUrl: boolean }) => Promise<unknown>;
  sendDocument: (input: { phoneNumberId: string; to: string; document: { link: string; filename: string; caption: string } }) => Promise<unknown>;
  sendInteractiveCtaUrl?: (input: {
    phoneNumberId: string;
    to: string;
    bodyText: string;
    footerText?: string;
    parameters: { displayText: string; url: string };
  }) => Promise<unknown>;
};

type AssistantResponder = (message: string) => Promise<AssistantResponse>;

export async function answerKapsoWebhook(
  service: TreasuryService,
  payload: unknown,
  deliveryClient?: KapsoDeliveryClient,
  respond: AssistantResponder = async (message) => service.assistant(message),
) {
  const events = parseKapsoMessages(payload);
  const settled = await Promise.allSettled(events.map(async (event) => {
    const text = event.message.text?.body;
    if (!text) return undefined;
    const to = event.message.kapso?.phone_number ?? event.conversation?.phone_number;
    const eventPhoneNumberId = event.phone_number_id ?? event.message.kapso?.phone_number_id;
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
    if (phoneNumberId && eventPhoneNumberId && phoneNumberId !== eventPhoneNumberId) {
      return { messageId: event.message.id, rejected: true, delivered: false };
    }
    const claim = service.claimKapsoMessage(event.message.id);
    if (!claim.claimed) {
      return { messageId: event.message.id, duplicate: true, delivered: false };
    }

    try {
      const response = await respond(text);
      const actionUrl = response.action && process.env.PUBLIC_APP_ORIGIN
        ? new URL(response.action.route, process.env.PUBLIC_APP_ORIGIN).toString()
        : undefined;
      const suffix = response.action ? `\n\n${response.action.label}: ${actionUrl ?? response.action.route}` : "";
      if ((deliveryClient || process.env.KAPSO_API_KEY) && phoneNumberId && to) {
        let client = deliveryClient;
        if (!client) {
          const { WhatsAppClient } = await import("@kapso/whatsapp-cloud-api");
          const fetchWithDeadline: typeof fetch = Object.assign(
            async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
              const headers = new Headers(init?.headers);
              headers.set("X-Idempotency-Key", event.message.id);
              return fetch(input, { ...init, headers, signal: AbortSignal.timeout(4_000) });
            },
            { preconnect: fetch.preconnect },
          );
          client = new WhatsAppClient({
            baseUrl: "https://api.kapso.ai/meta/whatsapp",
            kapsoApiKey: process.env.KAPSO_API_KEY!,
            fetch: fetchWithDeadline,
          }).messages;
        }
        const documentUrl = response.attachment && process.env.PUBLIC_API_ORIGIN
          ? `${process.env.PUBLIC_API_ORIGIN}${response.attachment.url}`
          : undefined;
        if (documentUrl) {
          if (!claim.documentSent) {
            await client.sendDocument({
              phoneNumberId,
              to,
              document: {
                link: documentUrl,
                filename: "estado-de-cuenta-demo.pdf",
                caption: `${response.text}\n\n${response.attachment!.label}`,
              },
            });
            service.markKapsoDocumentSent(event.message.id);
            service.markKapsoTextSent(event.message.id);
          }
        } else if (!claim.textSent) {
          if (response.action && actionUrl && client.sendInteractiveCtaUrl) {
            await client.sendInteractiveCtaUrl({
              phoneNumberId,
              to,
              bodyText: response.text,
              footerText: "EFEX demo con datos sintéticos",
              parameters: { displayText: response.action.label, url: actionUrl },
            });
          } else {
            await client.sendText({ phoneNumberId, to, body: `${response.text}${suffix}`, previewUrl: false });
          }
          service.markKapsoTextSent(event.message.id);
        }
      }
      service.completeKapsoMessage(event.message.id);
      return { messageId: event.message.id, response, delivered: Boolean((deliveryClient || process.env.KAPSO_API_KEY) && phoneNumberId && to) };
    } catch (error) {
      service.failKapsoMessage(event.message.id);
      throw error;
    }
  }));
  const errors = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (errors.length) {
    const first = errors[0]?.reason;
    throw new AggregateError(errors.map((result) => result.reason), first instanceof Error ? first.message : "Kapso processing failed");
  }
  return settled.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
}
