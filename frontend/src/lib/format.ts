import type { EntryCategory, EntryStatus } from "./types";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined) return "—";
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(value);
}

export function formatCompactMoney(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDate(iso: string, opts: { year?: boolean } = {}): string {
  const date = new Date(`${iso}T00:00:00`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    ...(opts.year === false ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short" })
    .format(new Date(year, month - 1, 1))
    .toUpperCase();
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "··";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const STATUS_META: Record<EntryStatus, { dot: string; text: string; bg: string; label: string }> = {
  DRAFT: { dot: "bg-slateblue", text: "text-slateblue", bg: "bg-slateblue/10", label: "Draft" },
  ACTIVE: { dot: "bg-lime", text: "text-lime", bg: "bg-lime/10", label: "Active" },
  SETTLED: { dot: "bg-teal", text: "text-teal", bg: "bg-teal/10", label: "Settled" },
  ARCHIVED: { dot: "bg-faint", text: "text-faint", bg: "bg-white/[0.04]", label: "Archived" },
};

export const CATEGORY_ACCENT: Record<EntryCategory, string> = {
  OPERATIONS: "bg-lime",
  FINANCE: "bg-teal",
  ENGINEERING: "bg-slateblue",
  PRODUCT: "bg-amber",
  MARKETING: "bg-rose",
  PEOPLE: "bg-[#c9a6f0]",
  OTHER: "bg-faint",
};
