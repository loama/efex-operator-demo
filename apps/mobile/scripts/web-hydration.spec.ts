import { expect, test, type Page } from "@playwright/test";

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function stubApi(page: Page, options: { longNumbers?: boolean } = {}) {
  await page.route("**/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const amount = options.longNumbers ? 987_654_321_098.76 : 900_000;
    const body = pathname === "/v1/dashboard"
      ? {
          accounts: [{
            accountNumber: "•••• 1208",
            available: amount,
            balance: amount,
            currency: "USD",
            id: "account_usd",
            name: "Cuenta global USD",
          }],
          activity: options.longNumbers ? [{
            amount,
            createdAt: "2026-08-26T10:00:00.000Z",
            currency: "USD",
            direction: "out",
            id: "activity_large",
            status: "processing",
            subtitle: "Referencia extensa de demostración",
            title: "Pago internacional con monto amplio",
          }] : [],
          company: { contactName: "Santiago Bustamante", name: "Asteria Imports" },
          demoReceivedUsd: amount,
          demoSentUsd: amount,
          totalUsd: amount,
        }
      : pathname === "/v1/payments"
        ? [{
            beneficiaryId: "beneficiary_large",
            beneficiaryName: "Proveedor internacional con nombre extenso",
            createdAt: "2026-08-26T10:00:00.000Z",
            destinationAmount: amount,
            destinationCurrency: "ARS",
            fee: 0,
            id: "payment_large",
            rate: 1325,
            reference: "Invoice 1088",
            sourceAmount: amount,
            sourceCurrency: "USD",
            status: "processing",
            updatedAt: "2026-08-26T10:00:00.000Z",
          }]
        : pathname === "/v1/assistant"
          ? {
              action: { label: "Ver cuentas", route: "/accounts" },
              id: "assistant_test_response",
              text: "Tu saldo demo está disponible.",
            }
      : [];

    await route.fulfill({
      body: JSON.stringify(body),
      contentType: "application/json",
      status: 200,
    });
  });
}

test.describe("desktop static routes", () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  for (const pathname of ["/", "/access", "/accounts", "/statements", "/payments/new"]) {
    test(`${pathname} hydrates into the desktop layout`, async ({ page }) => {
      await stubApi(page);
      const errors = captureErrors(page);

      await page.goto(pathname, { waitUntil: "networkidle" });

      expect(errors).toEqual([]);
      await expect(page.getByText("Asteria Imports", { exact: true })).toBeVisible();
      await expect(page.getByText("PRÓXIMAMENTE", { exact: true })).toBeVisible();
      await expect(page.getByText("DEMO", { exact: true })).toHaveCount(0);
    });
  }
});

test("home hydrates into the phone layout", async ({ page }) => {
  await stubApi(page);
  const errors = captureErrors(page);
  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/", { waitUntil: "networkidle" });

  expect(errors).toEqual([]);
  await expect(page.getByText("DEMO", { exact: true })).toBeVisible();
  await expect(page.getByText("Asteria Imports", { exact: true })).toHaveCount(0);
  await expect(page.getByText("PRÓXIMAMENTE", { exact: true })).toHaveCount(0);
});

test("currency fields stay formatted while typing", async ({ page }) => {
  await stubApi(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/convert", { waitUntil: "networkidle" });

  const amount = page.getByLabel("Monto a convertir");
  await expect(amount).toHaveValue("25,000.00");
  await amount.focus();
  await expect(amount).toHaveValue("25,000");
  await amount.fill("12345.6");
  await expect(amount).toHaveValue("12,345.6");
  await amount.press("Tab");
  await expect(amount).toHaveValue("12,345.60");
});

test("assistant sends when Web Crypto is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: undefined });
  });
  await stubApi(page);
  const errors = captureErrors(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/assistant", { waitUntil: "networkidle" });

  await page.getByLabel("Mensaje al asistente").fill("¿Cuál es mi saldo?");
  await page.getByLabel("Enviar mensaje").click();

  await page.waitForTimeout(100);
  expect(errors).toEqual([]);
  await expect(page.getByText("Tu saldo demo está disponible.", { exact: true })).toBeVisible();
});

test("assistant sends through the demo API", async ({ page }) => {
  await stubApi(page);
  const errors = captureErrors(page);
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/assistant", { waitUntil: "networkidle" });

  await page.getByLabel("Mensaje al asistente").fill("¿Cuál es mi saldo?");
  await page.getByLabel("Enviar mensaje").click();

  await page.waitForTimeout(100);
  expect(errors).toEqual([]);
  await expect(page.getByText("Tu saldo demo está disponible.", { exact: true })).toBeVisible();
});

test("assistant offers an explicit keyboard dismiss control", async ({ page }) => {
  await stubApi(page);
  await page.setViewportSize({ height: 500, width: 390 });
  await page.goto("/assistant", { waitUntil: "networkidle" });

  const input = page.getByLabel("Mensaje al asistente");
  await input.click();
  await expect(page.getByLabel("Cerrar teclado")).toBeVisible();
  await page.getByLabel("Cerrar teclado").click();
  await expect(input).not.toBeFocused();
});

test("long monetary values stay inside phone layouts", async ({ page }) => {
  await stubApi(page, { longNumbers: true });
  await page.setViewportSize({ height: 844, width: 390 });

  for (const pathname of ["/", "/accounts", "/payments", "/activity"]) {
    await page.goto(pathname, { waitUntil: "networkidle" });
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${pathname} should not overflow horizontally`).toBeLessThanOrEqual(dimensions.clientWidth);

    if (pathname === "/payments") {
      const amount = page.getByText("$987.65B", { exact: true });
      await expect(amount).toBeVisible();
      const amountBox = await amount.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right };
      });
      const statusGeometry = await page.getByText("En proceso", { exact: true }).evaluate((element) => {
        const textBox = element.getBoundingClientRect();
        const badgeBox = element.parentElement!.getBoundingClientRect();
        return {
          centerOffset: Math.abs((textBox.top + textBox.height / 2) - (badgeBox.top + badgeBox.height / 2)),
          left: badgeBox.left,
        };
      });
      expect(amountBox.right, "the amount should leave room for the status badge").toBeLessThanOrEqual(statusGeometry.left - 8);
      expect(statusGeometry.centerOffset, "the status text should be vertically centered").toBeLessThanOrEqual(1);
    }
    if (pathname === "/activity") await expect(page.getByText("$987.65B", { exact: true })).toBeVisible();
  }
});
