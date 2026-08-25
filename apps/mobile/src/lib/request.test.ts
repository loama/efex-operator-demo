import { afterEach, describe, expect, test } from "bun:test";
import { requestJson } from "./request";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("API request", () => {
  test("uses a stable message for a non JSON gateway response", async () => {
    globalThis.fetch = (() => Promise.resolve(new Response("Bad gateway", { status: 502 }))) as typeof fetch;
    await expect(requestJson("https://demo.example", "/v1/dashboard")).rejects.toThrow("El servicio demo no está disponible. Intenta de nuevo.");
  });

  test("uses a stable message for a network failure", async () => {
    globalThis.fetch = (() => Promise.reject(new TypeError("Failed to fetch"))) as typeof fetch;
    await expect(requestJson("https://demo.example", "/v1/dashboard")).rejects.toThrow("El servicio demo no está disponible. Intenta de nuevo.");
  });

  test("preserves a safe JSON API error", async () => {
    globalThis.fetch = (() => Promise.resolve(Response.json({ error: "Monto fuera del límite demo" }, { status: 422 }))) as typeof fetch;
    await expect(requestJson("https://demo.example", "/v1/dashboard")).rejects.toThrow("Monto fuera del límite demo");
  });
});
