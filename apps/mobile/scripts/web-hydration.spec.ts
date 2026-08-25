import { expect, test, type Page } from "@playwright/test";

function captureErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("desktop static routes", () => {
  test.use({ viewport: { height: 900, width: 1440 } });

  for (const pathname of ["/", "/access", "/accounts", "/statements", "/payments/new"]) {
    test(`${pathname} hydrates into the desktop layout`, async ({ page }) => {
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
  const errors = captureErrors(page);
  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/", { waitUntil: "networkidle" });

  expect(errors).toEqual([]);
  await expect(page.getByText("DEMO", { exact: true })).toBeVisible();
  await expect(page.getByText("Asteria Imports", { exact: true })).toHaveCount(0);
  await expect(page.getByText("PRÓXIMAMENTE", { exact: true })).toHaveCount(0);
});
