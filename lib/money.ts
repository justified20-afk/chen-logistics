/**
 * Money is stored and computed exclusively in **integer minor units** (kobo for
 * NGN). The server always recomputes totals — client supplied totals are never
 * trusted.
 */

export const MINOR_UNITS_PER_MAJOR = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_UNITS_PER_MAJOR);
}

export function toMajor(minor: number): number {
  return minor / MINOR_UNITS_PER_MAJOR;
}

export function addMinor(...values: number[]): number {
  return values.reduce((total, value) => total + Math.round(value), 0);
}

export function multiplyMinor(minor: number, quantity: number): number {
  return Math.round(minor * quantity);
}

export function formatMoney(minor: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(Math.round(minor));
  const major = Math.floor(abs / MINOR_UNITS_PER_MAJOR);
  const cents = String(abs % MINOR_UNITS_PER_MAJOR).padStart(2, "0");
  return `${sign}${symbol}${major.toLocaleString("en-US")}.${cents}`;
}

export function formatMoneyCompact(minor: number, currency = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : currency === "USD" ? "$" : `${currency} `;
  const major = toMajor(minor);
  if (Math.abs(major) >= 1_000_000) return `${symbol}${(major / 1_000_000).toFixed(1)}M`;
  if (Math.abs(major) >= 1_000) return `${symbol}${(major / 1_000).toFixed(1)}k`;
  return formatMoney(minor, currency);
}

/** Parses user input ("1,250.50", "₦1250") into minor units. Returns null when invalid. */
export function parseMoneyToMinor(input: string | number | undefined | null): number | null {
  if (input === undefined || input === null || input === "") return null;
  const raw = typeof input === "number" ? String(input) : input;
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return toMinor(value);
}
