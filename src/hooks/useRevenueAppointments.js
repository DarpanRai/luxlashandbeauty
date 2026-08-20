import { useMemo } from "react";

// Broader than "completed" — any appointment with an advance already collected
// counts toward revenue too (just the advance, not the full total; see
// getRevenueContribution), even if it's since been cancelled — a cancellation
// doesn't refund an advance that was already taken.
export function useRevenueAppointments(customers, serviceMap) {
  return useMemo(
    () =>
      customers.filter(
        (c) =>
          ((c.serviceId && serviceMap[c.serviceId]) || c.lashRemoval || c.refillId) &&
          (c.status === "completed" || Number(c.advance) > 0)
      ),
    [customers, serviceMap]
  );
}
