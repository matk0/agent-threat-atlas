import type { Locale } from "./i18n";

const dayMs = 24 * 60 * 60 * 1000;

const dateLocales: Record<Locale, string> = {
  en: "en-US",
  sk: "sk-SK",
};

export function formatDate(iso: string, locale: Locale = "en") {
  const d = new Date(iso);
  return d.toLocaleDateString(dateLocales[locale], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function daysSinceDate(iso: string, now = new Date()) {
  const diff = utcDayStart(now) - isoDateUtcStart(iso);
  return Math.max(0, Math.floor(diff / dayMs));
}

function utcDayStart(date: Date) {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date.");
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function isoDateUtcStart(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }

  return timestamp;
}
