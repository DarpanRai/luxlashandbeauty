import { useMemo } from "react";

export function useCompletedAppointments(customers, serviceMap) {
  return useMemo(
    () =>
      customers.filter(
        (c) => c.status === "completed" && ((c.serviceId && serviceMap[c.serviceId]) || c.lashRemoval || c.refillId)
      ),
    [customers, serviceMap]
  );
}
