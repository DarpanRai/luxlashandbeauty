import { useEffect, useMemo, useState } from "react";
import { getMonthKey, getTodayISO } from "../utils/date.js";

export function useMonthSelector(completedAppointments) {
  const months = useMemo(() => {
    const set = new Set(completedAppointments.map((c) => getMonthKey(c.appointmentDate)));
    return [...set].filter(Boolean).sort();
  }, [completedAppointments]);

  const [selectedMonth, setSelectedMonth] = useState("");

  useEffect(() => {
    if (months.length && !months.includes(selectedMonth)) setSelectedMonth(months[months.length - 1]);
    else if (!months.length) setSelectedMonth(getMonthKey(getTodayISO()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  return { months, selectedMonth, setSelectedMonth };
}
