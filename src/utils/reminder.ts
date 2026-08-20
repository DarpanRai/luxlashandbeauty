import { addOneMonth, daysUntil } from "./date.js";
import type { Customer } from "../types/index.js";

// Post-service outreach only applies to the two lash-lift services (not the extension
// sets) — lifts/tints fade on a predictable schedule and benefit from a touch-up nudge;
// extension sets don't follow the same cadence.
export const FOLLOW_UP_SERVICE_IDS = ["s-l1", "s-l2"];

export const FOLLOW_WINDOW_START_DAYS = 28; // ~4 weeks after the service
export const REMINDER_WINDOW_START_DAYS = 42; // ~6 weeks after the service
export const RESEND_AFTER_DAYS = 30;

// Still the ~1-month "your refill is due" date referenced in the reminder message text,
// even though the reminder itself now fires later, once the 6-7 week stage begins.
export const getRefillDate = (appointmentDate: string): string => addOneMonth(appointmentDate);

const daysSince = (dateStr?: string): number => (dateStr ? -daysUntil(dateStr) : Infinity);

const isLocked = (sent: boolean | undefined, sentAt: string | undefined): boolean =>
  !!sent && daysSince(sentAt) < RESEND_AFTER_DAYS;

// Stays "sent" (locked) until 30 days have passed since sending — or until the customer rebooks, which hides outreach entirely.
export const isFollowLocked = (customer: Pick<Customer, "followSent" | "followSentAt">): boolean =>
  isLocked(customer.followSent, customer.followSentAt);

export const isReminderLocked = (customer: Pick<Customer, "reminderSent" | "reminderSentAt">): boolean =>
  isLocked(customer.reminderSent, customer.reminderSentAt);

// True once a later appointment (a rebook) exists for this same record.
export const isSuperseded = (customer: Pick<Customer, "id">, allCustomers: Pick<Customer, "rebookedFromId">[]): boolean =>
  (allCustomers || []).some((c) => c.rebookedFromId === customer.id);

export type FollowUpStage = "follow" | "reminder" | null;

// Which stage of post-service outreach (if any) applies to this appointment right now.
// Scoped to the two lash-lift services, and only once the service has actually been
// completed: ~4 weeks out is a "how's it holding up" follow-up, ~6+ weeks out is the
// refill reminder (unbounded past 6 weeks, so it keeps showing until acted on).
export const getFollowUpStage = (
  customer: Pick<Customer, "id" | "serviceId" | "status" | "appointmentDate">,
  allCustomers: Pick<Customer, "rebookedFromId">[]
): FollowUpStage => {
  if (customer.status !== "completed") return null;
  if (!FOLLOW_UP_SERVICE_IDS.includes(customer.serviceId)) return null;
  if (isSuperseded(customer, allCustomers)) return null;
  const elapsed = daysSince(customer.appointmentDate);
  if (elapsed >= REMINDER_WINDOW_START_DAYS) return "reminder";
  if (elapsed >= FOLLOW_WINDOW_START_DAYS) return "follow";
  return null;
};

// The four extension-set services (not the lash-lift services above) shed and need an
// infill well before a lift would, then eventually a full redo — a different cadence,
// tracked separately from FOLLOW_UP_SERVICE_IDS.
export const INFILL_SERVICE_IDS = ["s-l3", "s-l4", "s-l5", "s-l6"];

// The appointment date itself is day 1 of week 1 (elapsed 0), so week N starts at
// elapsed day (N-1)*7 — week 2 starts at elapsed 7, week 3 ends at elapsed 20 (the day
// before week 4 starts at elapsed 21).
export const INFILL_WINDOW_START_DAYS = 7; // starting day of week 2 — infill still tops up the existing set
export const WEEK3_START_DAYS = INFILL_WINDOW_START_DAYS + 7; // 14 — starting day of week 3
export const FULLSET_WINDOW_START_DAYS = 21; // starting day of week 4 — too shed to infill, needs a full new set

export type InfillWeekBucket = "week2" | "week3" | null;

// Which half of the infill window a given elapsed-day count falls in — "week2" (day
// 7-13) or "week3" (day 14-20). Outside the infill window entirely: null.
const infillWeekBucket = (elapsed: number): InfillWeekBucket => {
  if (elapsed >= FULLSET_WINDOW_START_DAYS) return null;
  if (elapsed >= WEEK3_START_DAYS) return "week3";
  if (elapsed >= INFILL_WINDOW_START_DAYS) return "week2";
  return null;
};

// Which infill sub-window applies to this appointment right now. Week 2 and week 3 each
// get their own send, tracked in infillWeek2SentAt / infillWeek3SentAt, so a customer who
// gets both keeps both dates on record instead of the later one overwriting the earlier.
export const getInfillWeekBucket = (customer: Pick<Customer, "appointmentDate">): InfillWeekBucket =>
  infillWeekBucket(daysSince(customer.appointmentDate));

// Infill doesn't use the usual 30-day rolling lock — each week bucket (2 and 3) has its
// own sent date, so sending in week 2 doesn't lock week 3's send, and vice versa.
export const isInfillLocked = (
  customer: Pick<Customer, "appointmentDate" | "infillWeek2SentAt" | "infillWeek3SentAt">
): boolean => {
  const bucket = getInfillWeekBucket(customer);
  if (bucket === "week2") return !!customer.infillWeek2SentAt;
  if (bucket === "week3") return !!customer.infillWeek3SentAt;
  return false;
};

// Full set offers resend every 2-3 weeks, not the standard 30-day cadence — the lashes
// keep shedding while the customer stays away, so the nudge repeats faster than a
// once-a-month check-in would. Re-sending at exactly 14 days keeps the customer inside
// the 2-3 week window on every cycle (each unlock happens 14 days after the last send,
// well inside the "2-3 weeks" ask, rather than drifting toward the 21-day edge).
export const FULLSET_RESEND_AFTER_DAYS = 14;

// Every full set send is appended, not overwritten, so the full history stays visible —
// but only the most recent one matters for the lock/resend cadence.
export const getLastFullsetSentAt = (customer: Pick<Customer, "fullsetSentDates">): string | undefined => {
  const dates = customer.fullsetSentDates || [];
  return dates.length > 0 ? dates[dates.length - 1] : undefined;
};

// Locked only until FULLSET_RESEND_AFTER_DAYS have passed since the last send — then it
// re-opens on its own, and keeps cycling every 2-3 weeks indefinitely. The only thing
// that permanently stops it is the customer rebooking (isSuperseded, checked in
// getExtensionStage) — a fresh appointment record starts its own cadence from day 1,
// so this reads each appointment's own sent history rather than any global timer.
export const isFullsetLocked = (customer: Pick<Customer, "fullsetSentDates">): boolean => {
  const lastSentAt = getLastFullsetSentAt(customer);
  return !!lastSentAt && daysSince(lastSentAt) < FULLSET_RESEND_AFTER_DAYS;
};

export type ExtensionStage = "infill" | "fullset" | null;

// Which stage of post-service outreach (if any) applies to an extension-set appointment
// right now. Start of week 2 through end of week 3 (elapsed day 7-20): an infill nudge.
// Start of week 4 on (elapsed day 21+, unbounded): the lashes have shed too much to
// infill, so it switches to a full-set-with-free-removal offer.
export const getExtensionStage = (
  customer: Pick<Customer, "id" | "serviceId" | "status" | "appointmentDate">,
  allCustomers: Pick<Customer, "rebookedFromId">[]
): ExtensionStage => {
  if (customer.status !== "completed") return null;
  if (!INFILL_SERVICE_IDS.includes(customer.serviceId)) return null;
  if (isSuperseded(customer, allCustomers)) return null;
  const elapsed = daysSince(customer.appointmentDate);
  if (elapsed >= FULLSET_WINDOW_START_DAYS) return "fullset";
  if (elapsed >= INFILL_WINDOW_START_DAYS) return "infill";
  return null;
};
