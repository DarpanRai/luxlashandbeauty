import { useMemo } from "react";
import { getMonthKey, getMonthLabel } from "../utils/date.js";
import { getRevenueSplit } from "../utils/format.js";

// completedAppointments drives cost (a service's cost is only real once it's actually performed).
// revenueAppointments drives revenue (also counts an upcoming appointment's collected advance,
// split across the month it was collected and the month the appointment is completed).
export function useRevenueTrend(completedAppointments, revenueAppointments, serviceMap) {
  return useMemo(() => {
    const totalsByMonth = {};
    const bucket = (key) => {
      if (!totalsByMonth[key]) totalsByMonth[key] = { month: key, revenue: 0, cost: 0 };
      return totalsByMonth[key];
    };
    completedAppointments.forEach((c) => {
      const service = serviceMap[c.serviceId];
      bucket(getMonthKey(c.appointmentDate)).cost += service?.cost || 0;
    });
    revenueAppointments.forEach((c) => {
      const service = serviceMap[c.serviceId];
      getRevenueSplit(c, service).forEach((entry) => {
        bucket(entry.month).revenue += entry.amount;
      });
    });
    return Object.values(totalsByMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map((m) => ({ ...m, label: getMonthLabel(m.month) }));
  }, [completedAppointments, revenueAppointments, serviceMap]);
}
