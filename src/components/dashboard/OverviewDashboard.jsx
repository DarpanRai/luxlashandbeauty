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
import { getNow } from "../../lib/dateProvider.js";
import KpiCard from "./KpiCard.tsx";
import RevenueCostChart from "../charts/RevenueCostChart.jsx";

export default function OverviewDashboard({ customers, services, products, sellItems, studioExpenses = [], staffSalaries = [], staffIncentives = [] }) {
  const serviceMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  // "Completed" stays the strict truth for the completed-count KPI and service cost.
  // "Revenue" appointments are broader: completed, or any appointment with an advance collected.
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
      ...studioExpenses.map((p) => getMonthKey(p.date)),
      ...staffSalaries.map((r) => r.month),
      ...staffIncentives.map((r) => r.month),
    ]),
    [revenueAppointments, products, sellItems, studioExpenses, staffSalaries, staffIncentives]
  );

  const [selectedYear, setSelectedYear] = useState(() => getNow().getFullYear());
  const yearOptions = useMemo(
    () => getYearOptions([
      ...revenueAppointments.map((c) => Number(getMonthKey(c.appointmentDate).slice(0, 4)) || undefined),
      ...revenueAppointments.map((c) => Number(getAdvanceMonth(c).slice(0, 4)) || undefined),
      ...products.map((p) => Number(getMonthKey(p.date).slice(0, 4)) || undefined),
      ...sellItems.map((p) => Number(getMonthKey(p.date).slice(0, 4)) || undefined),
      ...studioExpenses.map((p) => Number(getMonthKey(p.date).slice(0, 4)) || undefined),
      ...staffSalaries.map((r) => Number((r.month || "").slice(0, 4)) || undefined),
      ...staffIncentives.map((r) => Number((r.month || "").slice(0, 4)) || undefined),
    ]),
    [revenueAppointments, products, sellItems, studioExpenses, staffSalaries, staffIncentives]
  );
  const YEAR_MONTHS = useMemo(() => getYearMonths(selectedYear), [selectedYear]);

  const monthAppointments = useMemo(
    () => completedAppointments.filter((c) => getMonthKey(c.appointmentDate) === selectedMonth),
    [completedAppointments, selectedMonth]
  );
  // An appointment counts toward this month if it recognizes any revenue here — either
  // its advance was collected this month, or it was completed this month (or both).
  const monthRevenueAppointments = useMemo(
    () => revenueAppointments.filter((c) => getRevenueForMonth(c, serviceMap[c.serviceId], selectedMonth) > 0),
    [revenueAppointments, serviceMap, selectedMonth]
  );
  const kpis = useMonthlyKpis(monthAppointments, serviceMap);
  const monthServiceRevenue = useMemo(
    () => monthRevenueAppointments.reduce((sum, c) => sum + getRevenueForMonth(c, serviceMap[c.serviceId], selectedMonth), 0),
    [monthRevenueAppointments, serviceMap, selectedMonth]
  );
  const totalProductCost = useMemo(
    () => products.filter((p) => getMonthKey(p.date) === selectedMonth).reduce((sum, p) => sum + (Number(p.cost) || 0), 0),
    [products, selectedMonth]
  );
  const totalStudioExpenses = useMemo(
    () => studioExpenses.filter((p) => getMonthKey(p.date) === selectedMonth).reduce((sum, p) => sum + (Number(p.cost) || 0), 0),
    [studioExpenses, selectedMonth]
  );
  const totalSalaries = useMemo(
    () => staffSalaries.filter((r) => r.month === selectedMonth).reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [staffSalaries, selectedMonth]
  );
  const totalIncentives = useMemo(
    () => staffIncentives.filter((r) => r.month === selectedMonth).reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [staffIncentives, selectedMonth]
  );
  const totalExpenses = totalProductCost + totalStudioExpenses + totalSalaries + totalIncentives;
  const totalSales = useMemo(
    () => sellItems.filter((p) => getMonthKey(p.date) === selectedMonth).reduce((sum, p) => sum + (Number(p.price) || 0), 0),
    [sellItems, selectedMonth]
  );
  const totalRevenue = monthServiceRevenue + totalSales;
  const totalProfit = totalRevenue - totalExpenses;

  const byCategory = useMemo(() => {
    const totals = { makeup: { revenue: 0, cost: 0, count: 0 }, luxlash: { revenue: 0, cost: 0, count: 0 } };
    monthAppointments.forEach((c) => {
      if (totals[c.category]) totals[c.category].count += 1;
    });
    monthRevenueAppointments.forEach((c) => {
      const service = serviceMap[c.serviceId];
      if (!totals[c.category]) return;
      totals[c.category].revenue += getRevenueForMonth(c, service, selectedMonth);
    });
    ["makeup", "luxlash"].forEach((cat) => {
      totals[cat].revenue += sellItems
        .filter((p) => p.category === cat && getMonthKey(p.date) === selectedMonth)
        .reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      totals[cat].cost = products
        .filter((p) => p.category === cat && getMonthKey(p.date) === selectedMonth)
        .reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    });
    return totals;
  }, [monthAppointments, monthRevenueAppointments, serviceMap, products, sellItems, selectedMonth]);

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
      const salariesForMonth = staffSalaries.filter((r) => r.month === m).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const incentivesForMonth = staffIncentives.filter((r) => r.month === m).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const productCostForMonth = products.filter((p) => getMonthKey(p.date) === m).reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
      const studioExpensesForMonth = studioExpenses.filter((p) => getMonthKey(p.date) === m).reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
      const salesForMonth = sellItems.filter((p) => getMonthKey(p.date) === m).reduce((sum, p) => sum + (Number(p.price) || 0), 0);
      const expenses = productCostForMonth + studioExpensesForMonth + salariesForMonth + incentivesForMonth;
      const revenue = (appointmentTotals[m] || 0) + salesForMonth;
      return { month: m, revenue, expenses, profit: revenue - expenses };
    });
  }, [revenueAppointments, serviceMap, staffSalaries, staffIncentives, products, studioExpenses, sellItems, selectedYear, YEAR_MONTHS]);
  const yearTotalRevenue = useMemo(() => yearRevenueByMonth.reduce((sum, m) => sum + m.revenue, 0), [yearRevenueByMonth]);
  const yearTotalExpenses = useMemo(() => yearRevenueByMonth.reduce((sum, m) => sum + m.expenses, 0), [yearRevenueByMonth]);
  const yearTotalProfit = yearTotalRevenue - yearTotalExpenses;

  return (
    <div className="view">
      <div className="view-header view-header--sticky">
        <div>
          <h1 className="page-title">Studio Dashboard</h1>
          <p className="page-sub">Combined revenue and cost across Makeup and LuxLash</p>
        </div>
        <select className="input month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
      </div>

      <div className="kpi-grid">
        <KpiCard icon={<Wallet size={18} />} label="Total revenue" value={formatMoney(totalRevenue)} accent="var(--primary)" />
        <KpiCard icon={<Receipt size={18} />} label="Total expenses" value={formatMoney(totalExpenses)} accent="var(--luxlash)" />
        <KpiCard icon={<TrendingUp size={18} />} label="Net profit" value={formatMoney(totalProfit)} accent="var(--makeup)" />
        <KpiCard icon={<CheckCircle2 size={18} />} label="Completed appts." value={kpis.count} accent="var(--staff)" />
      </div>

      <div className="panel">
        <div className="panel-title">Revenue vs. cost — last 6 months</div>
        {trend.length === 0 ? (
          <div className="empty-inline">No completed appointments yet. Mark an appointment "Completed" in Makeup or LuxLash to see trends here.</div>
        ) : (
          <RevenueCostChart data={trend} revenueColor="var(--primary)" costColor="var(--luxlash)" height={260} />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">By category — {getMonthLabel(selectedMonth)}</div>
        <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Category</th><th>Bookings</th><th>Revenue</th><th>Cost</th><th>Profit</th></tr></thead>
          <tbody>
            {["makeup", "luxlash"].map((cat) => (
              <tr key={cat}>
                <td><span className="chip" style={{ background: CATEGORY[cat].tint, color: CATEGORY[cat].text }}>{CATEGORY[cat].label}</span></td>
                <td>{byCategory[cat].count}</td>
                <td>{formatMoney(byCategory[cat].revenue)}</td>
                <td>{formatMoney(byCategory[cat].cost)}</td>
                <td className="profit-cell">{formatMoney(byCategory[cat].revenue - byCategory[cat].cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="panel">
        <div className="dash-controls" style={{ justifyContent: "space-between", marginBottom: 10 }}>
          <div className="panel-title" style={{ marginBottom: 0 }}>Full year {selectedYear} revenue — Studio</div>
          <select className="input month-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
        </div>
        <div className="table-scroll">
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
      </div>
      <div className="kpi-grid" style={{ marginTop: 14 }}>
        <KpiCard icon={<Wallet size={18} />} label={`Total ${selectedYear} revenue — Studio`} value={formatMoney(yearTotalRevenue)} accent="var(--primary)" />
        <KpiCard icon={<Receipt size={18} />} label={`Total ${selectedYear} expenses — Studio`} value={formatMoney(yearTotalExpenses)} accent="var(--luxlash)" />
        <KpiCard icon={<TrendingUp size={18} />} label={`Total ${selectedYear} profit — Studio`} value={formatMoney(yearTotalProfit)} accent="var(--makeup)" />
      </div>
    </div>
  );
}
