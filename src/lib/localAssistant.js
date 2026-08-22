// Local, rule-based intent parser for the "Let Me Help You" chat widget.
// No external API, no cost, no key. Deliberately not real NLU — it only
// recognizes a specific set of phrasings (appointments, customers, expenses,
// staff, sell items). Anything else falls through to the widget's "I can
// only help with..." fallback rather than pretending to understand.
import { getNow } from "./dateProvider.ts";

export const STAFF_ROLES = [
  "Makeup Artist - Senior",
  "Makeup Artist - Master",
  "Luxlash Artist",
  "Brows Artist",
  "Receptionist",
  "Intern",
];

const has = (text, ...words) => words.some((w) => text.includes(w));

export function extractCategory(text) {
  const t = text.toLowerCase();
  if (has(t, "luxlash", "lux lash", "lux-lash", "lash")) return "luxlash";
  if (has(t, "makeup", "make up", "make-up")) return "makeup";
  if (has(t, "studio", "overall", "general")) return "studio";
  return null;
}

export function extractRole(text) {
  const t = text.toLowerCase();
  return STAFF_ROLES.find((r) => t.includes(r.toLowerCase())) || null;
}

export function extractNumber(text) {
  const match = text.match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function extractYesNo(text) {
  const t = text.toLowerCase().trim();
  if (/\b(no|nope|nah|don'?t)\b/.test(t)) return false;
  if (/\b(yes|yeah|yep|sure|ok|okay)\b/.test(t) || extractNumber(text) != null) return true;
  return null;
}

// Best-effort "name" out of a free-text reply like "lash glue 500" — strips
// whatever tokens were already matched elsewhere plus common filler words.
export function extractNameGuess(text, exclude = []) {
  let t = text;
  exclude.forEach((token) => {
    if (token) t = t.replace(new RegExp(String(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
  });
  t = t.replace(/\b(cost|price|nrs?|rs\.?|for|it'?s|is|the|item|name|of)\b/gi, "");
  t = t.replace(/[,.-]+/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

// Pulls a phone number (a run of 7+ digits, optionally with +/-/spaces) out of
// free text; whatever's left over (trimmed of stray punctuation) is the address.
export function extractPhoneAndAddress(text) {
  const match = text.match(/(\+?\d[\d\s-]{6,}\d)/);
  if (!match) return { phone: null, address: text.trim() };
  const phone = match[1].replace(/\s+/g, "");
  const address = (text.slice(0, match.index) + text.slice(match.index + match[0].length))
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return { phone, address };
}

// Returns an ISO date, or null if nothing recognizable was said.
export function extractDateGuess(text) {
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const t = text.toLowerCase();
  const now = getNow();
  if (has(t, "tomorrow")) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  }
  if (has(t, "today")) return now.toISOString().slice(0, 10);
  return null;
}

// Returns "HH:MM", "" if the user explicitly skipped, or null if unparseable.
export function extractTimeGuess(text) {
  const t = text.toLowerCase().trim();
  if (/\b(skip|none|later|no time)\b/.test(t)) return "";
  const ampm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    if (ampm[3] === "pm" && h < 12) h += 12;
    if (ampm[3] === "am" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const iso = t.match(/(\d{1,2}):(\d{2})/);
  if (iso) return `${iso[1].padStart(2, "0")}:${iso[2]}`;
  return null;
}

// Matches a reply against a numbered list — either a 1-based index, or a
// case-insensitive substring of the item's label.
export function matchByIndexOrLabel(text, items, labelOf) {
  const t = text.trim();
  if (/^\d+$/.test(t)) {
    const num = parseInt(t, 10);
    if (num >= 1 && num <= items.length) return items[num - 1];
  }
  const lower = t.toLowerCase();
  return items.find((it) => labelOf(it).toLowerCase().includes(lower)) || null;
}

const MONTH_NAMES = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sept: "09",
  sep: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

// Returns a "YYYY-MM" month key from things like "August", "aug 2026",
// "2026-08", "this month", "last month" — or null if nothing matched, so the
// caller can default to the current month.
export function extractMonthGuess(text) {
  const t = text.toLowerCase();
  const isoMatch = t.match(/(\d{4})-(\d{2})\b/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const now = getNow();
  if (has(t, "last month")) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  if (has(t, "this month")) return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const yearMatch = t.match(/\b(20\d{2})\b/);
  for (const [name, mm] of Object.entries(MONTH_NAMES)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      return `${yearMatch ? yearMatch[1] : now.getFullYear()}-${mm}`;
    }
  }
  return null;
}

// Decides which flow (if any) a fresh message is starting — only called when
// there's no multi-step action already in progress. "Add/create/book" wins
// over a bare mention of "appointment" so "book an appointment" routes to
// add_customer while "show tomorrow's appointments" still lists them.
export function detectIntent(text) {
  const t = text.toLowerCase();
  const wantsToAdd = has(t, "add", "new", "record", "log", "create", "book");

  const mentionsCustomer = has(t, "customer", "client");
  const mentionsAppointment = has(t, "appointment", "appointments", "booking", "bookings");
  if (wantsToAdd && (mentionsCustomer || mentionsAppointment)) {
    return { type: "add_customer" };
  }

  const mentionsExpense = has(t, "expense", "expenses", "cost", "costs", "spent", "spend", "purchase", "bought", "bill");
  if (wantsToAdd && mentionsExpense) return { type: "add_expense" };

  const mentionsStaff = has(t, "staff", "employee", "team member", "receptionist", "intern");
  if (wantsToAdd && mentionsStaff) return { type: "add_staff" };

  const mentionsSale = has(t, "sell", "sale", "sold", "sales");
  if (wantsToAdd && mentionsSale) return { type: "add_sell_item" };

  // Stock levels — open to both roles, unlike the owner-only listings below.
  const mentionsStock = has(t, "stock", "stocks", "inventory");
  if (mentionsStock) return { type: "list_stock", category: extractCategory(t) || "all" };

  // Everything below is read-only listing — owner-only, gated by the caller.
  const mentionsSalary = has(t, "salary", "salaries", "incentive", "incentives");
  if (mentionsSalary) return { type: "list_salary", month: extractMonthGuess(t) };

  if (mentionsExpense) return { type: "list_expenses", month: extractMonthGuess(t), category: extractCategory(t) || "all" };

  if (mentionsSale) return { type: "list_sales", month: extractMonthGuess(t), category: extractCategory(t) || "all" };

  if (mentionsStaff) return { type: "list_staff" };

  if (mentionsAppointment) {
    let when = "all_upcoming";
    if (has(t, "tomorrow")) when = "tomorrow";
    else if (has(t, "today")) when = "today";
    else if (has(t, "this week", "week")) when = "this_week";
    return { type: "list_appointments", when, category: extractCategory(t) || "all" };
  }

  return null;
}
