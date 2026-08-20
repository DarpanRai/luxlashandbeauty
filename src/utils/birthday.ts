import { getNow } from "../lib/dateProvider.js";

// Shows up starting this many days before the birthday — 5 days out for a Aug 20
// birthday means it starts appearing on Aug 15.
export const BIRTHDAY_WINDOW_DAYS = 5;

// Days until the next occurrence of this birthday (month + day only — the stored year is
// just whatever the customer was born, never compared). Rolls over to next year once this
// year's date has already passed. 0 means today.
export const daysUntilNextBirthday = (birthday?: string): number | null => {
  if (!birthday) return null;
  const bd = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(bd.getTime())) return null;
  const today = getNow();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
  next.setHours(0, 0, 0, 0);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const formatBirthdayShort = (birthday?: string): string => {
  if (!birthday) return "";
  return new Date(`${birthday}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export type BirthdayReminder = { isToday: boolean; message: string } | null;

// Card-only reminder — no send action, no lock/history, just a live badge. Visible from
// BIRTHDAY_WINDOW_DAYS out through the day itself, then disappears until next year.
export const getBirthdayReminder = (name: string, birthday?: string): BirthdayReminder => {
  const days = daysUntilNextBirthday(birthday);
  if (days === null || days < 0 || days > BIRTHDAY_WINDOW_DAYS) return null;
  if (days === 0) return { isToday: true, message: `🎂 It's ${name}'s birthday today!` };
  return { isToday: false, message: `🎂 ${name}'s birthday is on ${formatBirthdayShort(birthday)}` };
};
