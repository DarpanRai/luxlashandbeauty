export type Category = "makeup" | "luxlash";

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Service {
  id: string;
  category: Category;
  name: string;
  price: number;
  cost: number;
}

export interface Customer {
  id: string;
  category: Category;
  name: string;
  address: string;
  phone: string;
  email?: string;
  instagram?: string;
  /** Optional — drives the birthday reminder shown on the customer card only. */
  birthday?: string; // YYYY-MM-DD
  appointmentDate: string; // YYYY-MM-DD — the date the service is/was booked FOR
  /** The date this appointment record was first created — the date it was booked ON. Set once, never changes on edits. */
  bookingDate?: string; // YYYY-MM-DD
  serviceId: string;
  /** Rs 500 lash removal, addable on its own — when true, serviceId is no longer required (LuxLash only). */
  lashRemoval?: boolean;
  /** A refill option id (see constants/refills.js) — when set, serviceId is no longer required (LuxLash only). */
  refillId?: string;
  discount: number;
  /** Amount already collected upfront — a portion of the total, not added on top of it. */
  advance: number;
  /** The date the advance was actually collected — may be well before appointmentDate. Revenue from the advance is recognized in this month, not the appointment's month. */
  advanceDate?: string; // YYYY-MM-DD
  addonIds: string[];
  status: AppointmentStatus;
  reminderSent?: boolean;
  reminderSentAt?: string; // YYYY-MM-DD
  followSent?: boolean;
  followSentAt?: string; // YYYY-MM-DD
  infillWeek2SentAt?: string; // YYYY-MM-DD
  infillWeek3SentAt?: string; // YYYY-MM-DD
  /** Full set offers resend every 2-3 weeks indefinitely — every send date is kept, not just the latest. */
  fullsetSentDates?: string[]; // YYYY-MM-DD[]
  isRebooking?: boolean;
  rebookedFromId?: string;
}

export interface Product {
  id: string;
  category: Category | "studio";
  name: string;
  brand?: string;
  cost: number;
  date: string; // YYYY-MM-DD — the month it's counted in for expense totals
}

export interface SellItem {
  id: string;
  category: Category;
  name: string;
  brand: string;
  price: number;
  date: string; // YYYY-MM-DD — the month it's counted in for revenue totals
}

export type StaffStatus = "active" | "inactive";

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  joinedDate: string; // YYYY-MM-DD
  status: StaffStatus;
  documents?: string[]; // data: URIs
}

export interface StaffSalaryRecord {
  id: string;
  staffId: string;
  month: string; // YYYY-MM
  amount: number | string;
}

export interface Addon {
  id: string;
  category: Category;
  name: string;
  price: number;
}

export interface CategoryMeta {
  label: string;
  accent: string;
  tint: string;
  text: string;
}
