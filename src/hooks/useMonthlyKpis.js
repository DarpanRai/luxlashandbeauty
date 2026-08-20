import { useMemo } from "react";
import { getCustomerRevenue } from "../utils/format.js";

export function useMonthlyKpis(monthAppointments, serviceMap) {
  return useMemo(() => {
    const revenue = monthAppointments.reduce((sum, c) => sum + getCustomerRevenue(c, serviceMap[c.serviceId]), 0);
    const cost = monthAppointments.reduce((sum, c) => sum + (serviceMap[c.serviceId]?.cost || 0), 0);
    return { revenue, cost, profit: revenue - cost, count: monthAppointments.length };
  }, [monthAppointments, serviceMap]);
}
