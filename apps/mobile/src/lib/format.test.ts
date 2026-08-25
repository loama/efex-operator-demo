import { describe, expect, test } from "bun:test";
import { compactMoney, initials, money } from "./format";

describe("formatters", () => {
  test("formats currency with cents", () => expect(money(25000, "USD")).toBe("$25,000.00"));
  test("creates compact initials", () => expect(initials("Frutella Company")).toBe("FC"));
  test("uses deterministic compact currency", () => expect(compactMoney(350000, "USD")).toBe("$350K"));
});
