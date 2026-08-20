import { useMemo, useState } from "react";
import { Wallet, Receipt, TrendingUp, CheckCircle2 } from "lucide-react";
import { CATEGORY } from "../../constants/categories.js";
import { useCompletedAppointments } from "../../hooks/useCompletedAppointments.js";
import { useRevenueAppointments } from "../../hooks/useRevenueAppointments.js";
import { useMonthSelector } from "../../hooks/useMonthSelector.js";
import { useRevenueTrend } from "../../hooks/useRevenueTrend.js";
import { useMonthlyKpis } from "../../hooks/useMonthlyKpis.js";
import { getMonthKey, getMonthLabel, getMonthOptions, getYearOptions, getYearMonths } from "../../utils/date.js";
import { formatMoney, getAdvanceMonth, getRevenueSplit, getRevenueForMonth } from "../../utils/format.js";
import { REFILL_MAP } from "../../constants/refills.js";
import { getNow } from "../../lib/dateProvider.js";
import KpiCard from "./KpiCard.tsx";
import RevenueCostChart from "../charts/RevenueCostChart.jsx";

export default function CategoryDashboard({ category, customers, serviceMap, products, sellItems }) {
  const meta = CATEGORY[category];
  // "Completed" stays the strict truth for the completed-count KPI and service cost.
  // "Revenue" appointments are broader: completed, or upcoming with an advance collected.
  const completedAppointments = useCompletedAppointments(customers, serviceMap);
  const revenueAppointments = useRevenueAppointments(customers, serviceMap);
  const { selectedMonth, setSelectedMonth } = useMonthSelector(revenueAppointments);
  const trend = useRevenueTrend(completedAppointments, revenueAppointments, serviceMap);

  const monthOptions = useMemo(
    () => getMonthOptions([
      ...revenueAppointments.map((c) => getMonthKey(c.appointmentDate)),
      ...revenueAppointments.map((c) => getAdvanceMonth(c)),
      ...products.map((p) => getMonthKey(p.date)),
      ...sellItems.map((p) => getMonthKey(p.date)),
    ]),
    [revenueAppointments, products, sellItems]
  );

  const [selectedYear, setSelectedYear] = useState(() => getNow().getFullYear());
  const yearOptions = useMemo(
    () => getYearOptions([
      ...revenueAppointments.map((c) => Number(getMonthKey(c.appointmentDate).slice(0, 4)) || undefined),
      ...revenueAppointments.map((c) => Number(getAdvanceMonth(c).slice(0, 4)) || undefined),
      ...products.map((p) => Number(getMonthKey(p.date).slice(0, 4)) || undefined),
      ...sellItems.map((p) => Number(getMonthKey(p.date).slice(0, 4)) || undefined),
    ]),
    [revenueAppointments, products, sellItems]
  );
  const YEAR_MONTHS = useMemo(() => getYearMonths(selectedYear), [selectedYear]);

  const monthAppointments = useMemo(
    () => completedAppointments.filter((c) => getMonthKey(c.appointmentDate) === selectedMonth),
    [completedAppointments, selectedMonth]
  );
  // An appointment counts toward this month if it recognizes any revenue here — either
  // its advance was collected this month, or it was completed this month (or both, if
  // the advance and the appointment land in the same month).
  const monthRevenueAppointments = useMemo(
    () => revenueAppointments.filter((c) => getRevenueForMonth(c, serviceMap[c.serviceId], selectedMonth) > 0),
    [revenueAppointments, serviceMap, selectedMonth]
  );
  const kpis = useMonthlyKpis(monthAppointments, serviceMap);
  const monthServiceRevenue = useMemo(
    () => monthRevenueAppointments.reduce((sum, c) => sum + getRevenueForMonth(c, serviceMap[c.serviceId], selectedMonth), 0),
    [monthRevenueAppointments, serviceMap, selectedMonth]
  );
  const totalCost = useMemo(
    () => products.filter((p) => getMonthKey(p.date) === selectedMonth).reduce((sum, p) => sum + (Number(p.cost) || 0), 0),
    [products, selectedMonth]
  );
  const totalSales = useMemo(
    () => sellItems.filter((p) => getMonthKey(p.date) === selectedMonth).reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    [sellItems, selectedMonth]
  );
  const totalRevenue = monthServiceRevenue + totalSales;
  const totalProfit = totalRevenue - totalCost;

  const breakdown = useMemo(() => {
    const totals = {};
    monthRevenueAppointments.forEach((c) => {
      const service = serviceMap[c.serviceId];
      const refill = c.refillId ? REFILL_MAP[c.refillId] : null;
      const key = service ? service.id : refill ? c.refillId : "lash-removal";
      const name = service ? service.name : refill ? `${refill.group} — ${refill.duration}` : "Lash removal only";
      if (!totals[key]) totals[key] = { name, revenue: 0, count: 0 };
      totals[key].revenue += getRevenueForMonth(c, service, selectedMonth);
      totals[key].count += 1;
    });
    return Object.values(totals).sort((a, b) => b.revenue - a.revenue);
  }, [monthRevenueAppointments, serviceMap, selectedMonth]);

  const yearRevenueByMonth = useMemo(() => {
    const appointmentTotals = {};
    revenueAppointments.forEach((c) => {
      const service = serviceMap[c.serviceId];
      getRevenueSplit(c, service).forEach((entry) => {
        if (!entry.month.startsWith(String(selectedYear))) return;
        appointmentTotals[entry.month] = (appointmentTotals[entry.month] || 0) + entry.amount;
      });
    });
    return YEAR_MONTHS.map((m) => {
      const salesForMonth = sellItems.filter((p) => getMonthKey(p.date) === m).reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      const expenses = products.filter((p) => getMonthKey(p.date) === m).reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
      const revenue = (appointmentTotals[m] || 0) + salesForMonth;
      return { month: m, revenue, expenses, profit: revenue - expenses };
    });
  }, [revenueAppointments, serviceMap, products, sellItems, selectedYear, YEAR_MONTHS]);
  const yearTotalRevenue = useMemo(() => yearRevenueByMonth.reduce((sum, m) => sum + m.revenue, 0), [yearRevenueByMonth]);
  const yearTotalExpenses = useMemo(() => yearRevenueByMonth.reduce((sum, m) => sum + m.expenses, 0), [yearRevenueByMonth]);
  const yearTotalProfit = yearTotalRevenue - yearTotalExpenses;

  return (
    <>
      <div className="dash-controls" style={{ marginBottom: 14 }}>
        <select className="input month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          {monthOptions.map((m) => (<option key={m} value={m}>{getMonthLabel(m)}</option>))}
        </select>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<Wallet size={18} />} label={`${meta.label} revenue`} value={formatMoney(totalRevenue)} accent={meta.accent} />
        <KpiCard icon={<Receipt size={18} />} label="Total expenses" value={formatMoney(totalCost)} accent="var(--staff)" />
        <KpiCard icon={<TrendingUp size={18} />} label="Net profit" value={formatMoney(totalProfit)} accent="var(--primary)" />
        <KpiCard icon={<CheckCircle2 size={18} />} label="Completed" value={kpis.count} accent="var(--whatsapp)" />
      </div>

      <div className="panel">
        <div className="panel-title">Revenue vs. cost — last 6 months</div>
        {trend.length === 0 ? (
          <div className="empty-inline">No completed {meta.label.toLowerCase()} appointments yet.</div>
        ) : (
          <RevenueCostChart data={trend} revenueColor={meta.accent} costColor="var(--staff)" height={250} />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">Service breakdown — {getMonthLabel(selectedMonth)}</div>
        {breakdown.length === 0 ? (
          <div className="empty-inline">No data for this month yet.</div>
        ) : (
          <table className="data-table">
            <thead><tr><th>Service</th><th>Bookings</th><th>Revenue</th></tr></thead>
            <tbody>
              {breakdown.map((p) => (
                <tr key={p.name}>
                  <td>{p.name}</td><td>{p.count}</td><td>{formatMoney(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="dash-controls" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>Full year {selectedYear} revenue — {meta.label}</div>
          <select className="input month-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
        <table className="data-table">
          <thead><tr><th>Month</th><th>Revenue</th><th>Expenses</th><th>Profit</th></tr></thead>
          <tbody>
            {yearRevenueByMonth.map((m) => (
              <tr key={m.month}>
                <td>{getMonthLabel(m.month)}</td>
                <td>{formatMoney(m.revenue)}</td>
                <td>{formatMoney(m.expenses)}</td>
                <td className="profit-cell">{formatMoney(m.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kpi-grid" style={{ marginTop: 14 }}>
        <KpiCard icon={<Wallet size={18} />} label={`Total ${selectedYear} revenue — ${meta.label}`} value={formatMoney(yearTotalRevenue)} accent={meta.accent} />
        <KpiCard icon={<Receipt size={18} />} label={`Total ${selectedYear} expenses — ${meta.label}`} value={formatMoney(yearTotalExpenses)} accent="var(--staff)" />
        <KpiCard icon={<TrendingUp size={18} />} label={`Total ${selectedYear} profit — ${meta.label}`} value={formatMoney(yearTotalProfit)} accent="var(--primary)" />
      </div>
    </>
  );
}
