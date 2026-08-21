import { getNow } from "../lib/dateProvider.js";

export const getTodayISO = (): string => getNow().toISOString().slice(0, 10);

export const getMonthKey = (dateStr?: string): string => (dateStr ? dateStr.slice(0, 7) : "");

export const getMonthLabel = (monthKey?: string): string => {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

export const addOneMonth = (dateStr?: string): string => {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const daysUntil = (dateStr?: string): number => {
  if (!dateStr) return Infinity;
  const target = new Date(`${dateStr}T00:00:00`);
  const today = getNow();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const daysBetween = (fromDateStr: string, toDateStr: string): number => {
  const from = new Date(`${fromDateStr}T00:00:00`);
  const to = new Date(`${toDateStr}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatDisplayDate = (dateStr?: string, fallback = "—"): string => {
  if (!dateStr) return fallback;
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// timeStr is "HH:MM" (24hr), the shape <input type="time"> gives back.
export const formatDisplayTime = (timeStr?: string, fallback = "—"): string => {
  if (!timeStr) return fallback;
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return fallback;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

// The studio started operating in August 2026 — nothing before that is real data, so it's
// deliberately excluded everywhere (month/year selectors, the full-year table, and date
// pickers), even if a rolling window would otherwise reach back into it.
export const PROJECT_START_YEAR = 2026;
export const PROJECT_START_MONTH = `${PROJECT_START_YEAR}-08`; // 2026-08
export const PROJECT_START_DATE = `${PROJECT_START_MONTH}-01`; // 2026-08-01 — used as a date-input min

// Every month with real data stays selectable forever, not just the current
// year — plus the last 12 rolling months so recent-but-empty months are
// still pickable before any data exists in them. Never reaches earlier than PROJECT_START_MONTH.
export const getMonthOptions = (existingMonths: (string | undefined | null)[]): string[] => {
  const set = new Set(existingMonths.filter((m): m is string => !!m && m >= PROJECT_START_MONTH));
  const now = getNow();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (key < PROJECT_START_MONTH) continue;
    set.add(key);
  }
  return [...set].sort().reverse();
};

// Every year with real data stays selectable forever, plus the current year. Never earlier than PROJECT_START_YEAR.
export const getYearOptions = (existingYears: (number | undefined | null)[]): number[] => {
  const set = new Set(existingYears.filter((y): y is number => !!y && y >= PROJECT_START_YEAR));
  set.add(Math.max(getNow().getFullYear(), PROJECT_START_YEAR));
  return [...set].sort((a, b) => b - a);
};

// For the project's start year, only August onward — the studio didn't exist before that,
// so Jan-Jul 2026 never appear as rows even though the rest of the year does month-by-month.
export const getYearMonths = (year: number): string[] =>
  Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`).filter(
    (m) => m >= PROJECT_START_MONTH
  );
