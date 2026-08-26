export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function normalizeCurrencyInput(input: string) {
  const cleaned = input.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  const commaParts = cleaned.split(",");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const commasAreGrouping = lastDot < 0 && commaParts.length > 1 && commaParts.slice(1).every((part) => part.length === 3);
  const decimalIndex = commasAreGrouping ? -1 : Math.max(lastComma, lastDot);
  const integerSource = decimalIndex >= 0 ? cleaned.slice(0, decimalIndex) : cleaned;
  const fractionSource = decimalIndex >= 0 ? cleaned.slice(decimalIndex + 1) : "";
  const integerDigits = integerSource.replace(/\D/g, "").replace(/^0+(?=\d)/, "") || "0";
  const fractionDigits = fractionSource.replace(/\D/g, "").slice(0, 2);

  return decimalIndex >= 0 ? `${integerDigits}.${fractionDigits}` : integerDigits;
}

export function parseCurrencyInput(input: string) {
  const normalized = normalizeCurrencyInput(input);
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

export function formatCurrencyInput(input: string) {
  const amount = parseCurrencyInput(input);
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function formatCurrencyInputForEditing(input: string) {
  const normalized = normalizeCurrencyInput(input);
  if (!normalized) return "";
  const [integerPart, fractionPart] = normalized.split(".");
  const groupedInteger = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(integerPart));
  return normalized.includes(".") ? `${groupedInteger}.${fractionPart ?? ""}` : groupedInteger;
}

export function normalizeCurrencyInputChange(input: string, previousValue: string) {
  const previousFormatted = formatCurrencyInputForEditing(previousValue);
  if (input.startsWith(previousFormatted) && input.length === previousFormatted.length + 1) {
    const appended = input.at(-1) ?? "";
    if (/\d/.test(appended)) return normalizeCurrencyInput(`${previousValue}${appended}`);
    if ((appended === "." || appended === ",") && !previousValue.includes(".")) return `${previousValue}.`;
  }
  if (previousFormatted.startsWith(input) && input.length === previousFormatted.length - 1) {
    return previousValue.slice(0, -1);
  }
  return normalizeCurrencyInput(input);
}

export function compactMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const magnitude = Math.abs(amount);
  const compact = magnitude >= 1_000_000_000_000
    ? `${trimDecimal(amount / 1_000_000_000_000)}T`
    : magnitude >= 1_000_000_000
      ? `${trimDecimal(amount / 1_000_000_000)}B`
      : magnitude >= 1_000_000
        ? `${trimDecimal(amount / 1_000_000)}M`
        : magnitude >= 1_000
          ? `${trimDecimal(amount / 1_000)}K`
          : trimDecimal(amount);
  return `${symbol}${compact}`;
}

function trimDecimal(value: number) {
  const rounded = Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
