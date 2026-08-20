import { useMemo, useState } from "react";
import { Package, Wallet, LayoutList, Pencil } from "lucide-react";
import ProductsPanel from "../products/ProductsPanel.jsx";
import { generateId } from "../../utils/id.js";
import { formatMoney } from "../../utils/format.js";
import { getMonthKey, getMonthLabel, getMonthOptions, getTodayISO } from "../../utils/date.js";
import { useToast } from "../../context/ToastContext.jsx";

const META = { label: "Studio", accent: "var(--staff)" };

export default function GeneralExpensesPage({ role, items, onItemsChange, staff, staffSalaries, setStaffSalaries }) {
  const salaryVisible = role !== "staff";
  const [subTab, setSubTab] = useState("items");
  const [salaryMonth, setSalaryMonth] = useState(() => getMonthKey(getTodayISO()));
  const [editingStaffId, setEditingStaffId] = useState(null);
  const notify = useToast();

  const monthOptions = useMemo(() => getMonthOptions(staffSalaries.map((r) => r.month)), [staffSalaries]);

  const getSalaryFor = (staffId) => staffSalaries.find((r) => r.staffId === staffId && r.month === salaryMonth);

  const monthRecords = useMemo(() => staffSalaries.filter((r) => r.month === salaryMonth), [staffSalaries, salaryMonth]);
  const totalSalaries = useMemo(() => monthRecords.reduce((sum, r) => sum + (Number(r.amount) || 0), 0), [monthRecords]);

  const handleSalaryChange = (staffId, value) => {
    const existing = getSalaryFor(staffId);
    if (existing) {
      setStaffSalaries(staffSalaries.map((r) => (r.id === existing.id ? { ...r, amount: value } : r)));
    } else {
      setStaffSalaries([...staffSalaries, { id: generateId(), staffId, month: salaryMonth, amount: value }]);
    }
  };

  const handleSalaryBlur = () => {
    setEditingStaffId(null);
    notify("Salary updated");
  };

  return (
    <div className="view">
      <div className="view-header view-header--sticky">
        <div>
          <h1 className="page-title" style={{ color: "var(--staff-dark)" }}>Expenses</h1>
          <p className="page-sub">Studio-wide expenses and staff salaries</p>
        </div>
        <div className="sub-tabs">
          <button className={`sub-tab ${subTab === "items" ? "active" : ""}`} style={subTab === "items" ? { background: "var(--staff-tint, #E1EEE7)", color: "var(--staff-dark)" } : {}} onClick={() => setSubTab("items")}>
            <Package size={15} /> Items
          </button>
          {salaryVisible && (
            <button className={`sub-tab ${subTab === "salary" ? "active" : ""}`} style={subTab === "salary" ? { background: "var(--staff-tint, #E1EEE7)", color: "var(--staff-dark)" } : {}} onClick={() => setSubTab("salary")}>
              <Wallet size={15} /> Salary
            </button>
          )}
        </div>
      </div>

      {subTab === "items" || !salaryVisible ? (
        <ProductsPanel category="studio" meta={META} products={items} onChange={onItemsChange} />
      ) : (
        <div className="view">
          {staff.length === 0 ? (
            <div className="empty-state">
              <LayoutList size={28} />
              <div className="empty-title">No staff added yet</div>
              <div className="empty-sub">Add staff members first to set their salary.</div>
            </div>
          ) : (
            <>
              <div className="view-header" style={{ marginTop: 0, marginBottom: 14 }}>
                <p className="page-sub" style={{ margin: 0 }}>Set each staff member's salary for the selected month</p>
                <select className="input month-select" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)}>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>{getMonthLabel(m)}</option>
                  ))}
                </select>
              </div>
              <div className="table-scroll">
              <table className="data-table">
                <thead><tr><th>Name</th><th>Role</th><th>Salary — {getMonthLabel(salaryMonth)}</th><th>Status</th></tr></thead>
                <tbody>
                  {staff.map((s) => {
                    const record = getSalaryFor(s.id);
                    const isPaid = Number(record?.amount) > 0;
                    const isEditing = editingStaffId === s.id;
                    return (
                      <tr key={s.id}>
                        <td style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>{s.name}</td>
                        <td>{s.role}</td>
                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              type="number"
                              step="0.01"
                              autoFocus
                              style={{ maxWidth: 140 }}
                              value={record?.amount ?? ""}
                              placeholder="0.00"
                              onChange={(e) => handleSalaryChange(s.id, e.target.value)}
                              onBlur={handleSalaryBlur}
                              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                            />
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span>{record?.amount ? formatMoney(record.amount) : "—"}</span>
                              <button type="button" className="icon-btn" onClick={() => setEditingStaffId(s.id)}><Pencil size={14} /></button>
                            </div>
                          )}
                        </td>
                        <td>
                          <span
                            className="chip"
                            style={{
                              background: isPaid ? "#E1EEE7" : "#F5E6E1",
                              color: isPaid ? "#276148" : "#B3452F",
                            }}
                          >
                            {isPaid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
              <div className="panel" style={{ marginTop: 14 }}>
                <div className="panel-title">Total salaries — {getMonthLabel(salaryMonth)}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalSalaries)}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
