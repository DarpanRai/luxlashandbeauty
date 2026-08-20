import { useMemo, useState } from "react";
import { Plus, Search, Package } from "lucide-react";
import { generateId } from "../../utils/id.js";
import { formatMoney } from "../../utils/format.js";
import { getMonthKey, getMonthLabel, getMonthOptions, getTodayISO, formatDisplayDate } from "../../utils/date.js";
import ProductFormModal from "./ProductFormModal.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function ProductsPanel({ category, meta, products, onChange }) {
  const isStudio = category === "studio";
  const addLabel = isStudio ? "Add items" : "Add product";
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(getTodayISO()));
  const notify = useToast();

  const handleSave = (data) => {
    onChange([...products, { id: generateId(), category, name: data.name.trim(), brand: data.brand.trim(), price: 0, cost: Number(data.cost) || 0, date: data.date }]);
    notify("Expense added");
    setFormOpen(false);
  };

  const openAddForm = () => {
    setFormOpen(true);
  };

  const monthOptions = useMemo(() => getMonthOptions(products.map((p) => getMonthKey(p.date))), [products]);

  const monthProducts = useMemo(() => products.filter((p) => getMonthKey(p.date) === selectedMonth), [products, selectedMonth]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monthProducts;
    return monthProducts.filter((p) => p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q));
  }, [monthProducts, query]);

  const totalCost = useMemo(() => monthProducts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0), [monthProducts]);

  return (
    <div className="view">
      <div className="view-header" style={{ marginTop: 0, marginBottom: 14 }}>
        <div className="search-row" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or brand" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{getMonthLabel(m)}</option>
          ))}
        </select>
        <button className="btn btn-primary" style={{ background: meta.accent }} onClick={openAddForm}>
          <Plus size={16} /> {addLabel}
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="empty-state">
          <Package size={28} />
          <div className="empty-title">No {meta.label.toLowerCase()} expenses in {getMonthLabel(selectedMonth)}</div>
          <div className="empty-sub">Add an expense with its name, {isStudio ? "" : "brand name, "}cost, and date.</div>
          <button className="btn btn-primary" style={{ background: meta.accent }} onClick={openAddForm}>
            <Plus size={16} /> {addLabel}
          </button>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead><tr><th>Name</th>{!isStudio && <th>Brand name</th>}<th>Cost</th><th>Date</th></tr></thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  {!isStudio && <td>{p.brand || "—"}</td>}
                  <td>{formatMoney(p.cost)}</td>
                  <td>{formatDisplayDate(p.date, "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel" style={{ marginTop: 14 }}>
            <div className="panel-title">Total {meta.label.toLowerCase()} expenses — {getMonthLabel(selectedMonth)}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalCost)}</div>
          </div>
        </>
      )}

      {formOpen && (
        <ProductFormModal meta={meta} category={category} initial={null} onCancel={() => setFormOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}
