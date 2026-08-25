export function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

export function compactMoney(amount: number, currency: string) {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const compact = amount >= 1_000_000 ? `${trimDecimal(amount / 1_000_000)}M` : amount >= 1_000 ? `${trimDecimal(amount / 1_000)}K` : trimDecimal(amount);
  return `${symbol}${compact}`;
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}

export function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
