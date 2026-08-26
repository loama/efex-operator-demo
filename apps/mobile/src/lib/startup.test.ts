import { expect, test } from "bun:test";

test("releases startup after fonts fail or time out", async () => {
  const startup = await import("./startup").catch(() => ({ shouldMountApp: undefined }));

  expect(startup.shouldMountApp).toBeFunction();
  if (!startup.shouldMountApp) return;

  expect(startup.shouldMountApp({ fontsLoaded: true, fontsFailed: false, timedOut: false })).toBe(true);
  expect(startup.shouldMountApp({ fontsLoaded: false, fontsFailed: true, timedOut: false })).toBe(true);
  expect(startup.shouldMountApp({ fontsLoaded: false, fontsFailed: false, timedOut: true })).toBe(true);
  expect(startup.shouldMountApp({ fontsLoaded: false, fontsFailed: false, timedOut: false })).toBe(false);
});
