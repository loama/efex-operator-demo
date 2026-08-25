import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
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
  z.object({ type: z.string().optional(), data: z.union([eventDataSchema, z.array(eventDataSchema)]), batch: z.boolean().optional() }).passthrough(),
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

type DeliveryClient = {
  sendText: (input: { phoneNumberId: string; to: string; body: string; previewUrl: boolean }) => Promise<unknown>;
  sendDocument: (input: { phoneNumberId: string; to: string; document: { link: string; filename: string; caption: string } }) => Promise<unknown>;
};

export async function answerKapsoWebhook(service: TreasuryService, payload: unknown, deliveryClient?: DeliveryClient) {
  const events = parseKapsoMessages(payload);
  const answers = [];
  for (const event of events) {
    const text = event.message.text?.body;
    if (!text) continue;
    const to = event.message.kapso?.phone_number ?? event.conversation?.phone_number;
    const eventPhoneNumberId = event.phone_number_id ?? event.message.kapso?.phone_number_id;
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
    if (phoneNumberId && eventPhoneNumberId && phoneNumberId !== eventPhoneNumberId) {
      answers.push({ messageId: event.message.id, rejected: true, delivered: false });
      continue;
    }
    const claim = service.claimKapsoMessage(event.message.id);
    if (!claim.claimed) {
      answers.push({ messageId: event.message.id, duplicate: true, delivered: false });
      continue;
    }
    const response = service.assistant(text);
    const suffix = response.action ? `\n\n${response.action.label}: ${response.action.route}` : "";

    try {
      if ((deliveryClient || process.env.KAPSO_API_KEY) && phoneNumberId && to) {
        let client = deliveryClient;
        if (!client) {
          const { WhatsAppClient } = await import("@kapso/whatsapp-cloud-api");
          client = new WhatsAppClient({ baseUrl: "https://app.kapso.ai/api/meta/", kapsoApiKey: process.env.KAPSO_API_KEY! }).messages;
        }
        if (!claim.textSent) {
          await client.sendText({ phoneNumberId, to, body: `${response.text}${suffix}`, previewUrl: false });
          service.markKapsoTextSent(event.message.id);
        }
        if (response.attachment && process.env.PUBLIC_API_ORIGIN && !claim.documentSent) {
          await client.sendDocument({
            phoneNumberId,
            to,
            document: {
              link: `${process.env.PUBLIC_API_ORIGIN}${response.attachment.url}`,
              filename: "estado-de-cuenta-demo.pdf",
              caption: response.attachment.label,
            },
          });
          service.markKapsoDocumentSent(event.message.id);
        }
      }
      service.completeKapsoMessage(event.message.id);
    } catch (error) {
      service.failKapsoMessage(event.message.id);
      throw error;
    }
    answers.push({ messageId: event.message.id, response, delivered: Boolean((deliveryClient || process.env.KAPSO_API_KEY) && phoneNumberId && to) });
  }
  return answers;
}
