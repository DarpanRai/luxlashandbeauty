import { ADDON_MAP } from "../constants/addons.js";
import { REFILL_MAP } from "../constants/refills.js";
import type { Customer, Service } from "../types/index.js";

export const formatMoney = (amount: number | string | undefined | null): string =>
  `Nrs ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const LASH_REMOVAL_PRICE = 500;

// service is optional — a customer can book lash removal or a refill on its own with no main service selected.
export const getServicePrice = (customer: Pick<Customer, "discount">, service?: Pick<Service, "price">): number =>
  Math.max(0, (service?.price || 0) - (customer.discount || 0));

export const getAddonsTotal = (customer: Pick<Customer, "addonIds">): number =>
  (customer.addonIds || []).reduce((sum, id) => sum + (ADDON_MAP[id]?.price || 0), 0);

export const getLashRemovalTotal = (customer: Pick<Customer, "lashRemoval">): number =>
  customer.lashRemoval ? LASH_REMOVAL_PRICE : 0;

export const getRefillTotal = (customer: Pick<Customer, "refillId">): number =>
  (customer.refillId && REFILL_MAP[customer.refillId]?.price) || 0;

// The total revenue for an appointment — service price minus discount, plus add-ons, plus
// lash removal and/or a refill if added. An advance payment is already part of this total
// (collected early), never added on top of it.
export const getCustomerRevenue = (
  customer: Pick<Customer, "discount" | "addonIds" | "lashRemoval" | "refillId">,
  service?: Pick<Service, "price">
): number =>
  getServicePrice(customer, service) + getAddonsTotal(customer) + getLashRemovalTotal(customer) + getRefillTotal(customer);

// What's still owed: the total minus whatever advance has already been collected. Never negative.
export const getDueAmount = (
  customer: Pick<Customer, "discount" | "addonIds" | "advance" | "lashRemoval" | "refillId">,
  service?: Pick<Service, "price">
): number => Math.max(0, getCustomerRevenue(customer, service) - (Number(customer.advance) || 0));

// The month the advance was actually collected — falls back to the appointment's own
// month for records with no advanceDate (no advance taken, or legacy data from before
// advanceDate existed), so old bookings keep behaving exactly as before.
export const getAdvanceMonth = (customer: Pick<Customer, "advanceDate" | "appointmentDate">): string =>
  (customer.advanceDate || customer.appointmentDate || "").slice(0, 7);

export interface RevenueSplitEntry {
  month: string;
  amount: number;
}

// Splits an appointment's recognized revenue across the month the advance was actually
// collected and the month the service is scheduled/completed — instead of dumping the
// whole amount into one month. An appointment booked in August with a Rs 3,000 advance
// for an October visit recognizes Rs 3,000 in August the moment the advance is taken;
// the remaining balance is recognized in October, but only once the appointment is
// actually completed (not merely booked or upcoming). If both dates land in the same
// month, the two amounts simply merge into a single entry.
export const getRevenueSplit = (
  customer: Pick<
    Customer,
    "status" | "discount" | "addonIds" | "advance" | "lashRemoval" | "refillId" | "advanceDate" | "appointmentDate"
  >,
  service?: Pick<Service, "price">
): RevenueSplitEntry[] => {
  const total = getCustomerRevenue(customer, service);
  const advanceAmt = Math.min(Number(customer.advance) || 0, total);
  const entries: RevenueSplitEntry[] = [];
  const add = (month: string, amount: number) => {
    if (amount <= 0 || !month) return;
    const existing = entries.find((e) => e.month === month);
    if (existing) existing.amount += amount;
    else entries.push({ month, amount });
  };
  add(getAdvanceMonth(customer), advanceAmt);
  if (customer.status === "completed") add((customer.appointmentDate || "").slice(0, 7), total - advanceAmt);
  return entries;
};

// How much of an appointment's revenue is recognized in one specific month.
export const getRevenueForMonth = (
  customer: Parameters<typeof getRevenueSplit>[0],
  service: Pick<Service, "price"> | undefined,
  monthKey: string
): number => getRevenueSplit(customer, service).find((e) => e.month === monthKey)?.amount || 0;
