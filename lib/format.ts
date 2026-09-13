import type { RequestCurrency } from "@/lib/db/schema";

export type { RequestCurrency };

export function formatDate(value: Date | number) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(value);
}

export function resolveCurrency(currency?: string | null): RequestCurrency {
  return currency === "JPY" ? "JPY" : "PHP";
}

export function formatGroupedAmount(
  amount: number,
  currency: RequestCurrency = "PHP",
) {
  return new Intl.NumberFormat("en-US", {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(currency === "JPY" ? Math.round(amount) : amount);
}

export function formatAmount(
  amount: number | null | undefined,
  currency?: string | null,
) {
  if (amount == null) return "—";
  const code = resolveCurrency(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "code",
    minimumFractionDigits: code === "JPY" ? 0 : 2,
    maximumFractionDigits: code === "JPY" ? 0 : 2,
    useGrouping: true,
  }).format(code === "JPY" ? Math.round(amount) : amount);
}

export function parseAmountInput(value: string) {
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
