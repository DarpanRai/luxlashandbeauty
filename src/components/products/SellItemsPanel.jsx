import { useMemo, useState } from "react";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { generateId } from "../../utils/id.js";
import { formatMoney } from "../../utils/format.js";
import { getMonthKey, getMonthLabel, getMonthOptions, getTodayISO, formatDisplayDate } from "../../utils/date.js";
import SellItemFormModal from "./SellItemFormModal.jsx";
import { useToast } from "../../context/ToastContext.jsx";

// Add-only, deliberately — a recorded sale already moved stock quantity once
// (see handleSave), and there's no UI for un-doing or re-doing that, so editing a
// past sale was removed rather than left half-correct.
export default function SellItemsPanel({ category, meta, sellItems, onChange, products, onProductsChange, role }) {
  const totalVisible = role !== "staff";
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => getMonthKey(getTodayISO()));
  const notify = useToast();

  // Only items explicitly marked sellable when they were stocked show up here —
  // being in stock isn't enough on its own (e.g. internal-use consumables that
  // are tracked for cost but never sold to a customer).
  const stockItems = useMemo(
    () => (products || []).filter((p) => p.stockQuantity != null && p.stockQuantity > 0 && p.sellable),
    [products]
  );

  const handleSave = (data) => {
    const quantity = Number(data.quantity) || 0;
    onChange([
      ...sellItems,
      { id: generateId(), category, name: data.name.trim(), brand: data.brand.trim(), price: Number(data.price) || 0, date: data.date, productId: data.productId, quantity },
    ]);
    // Only the stocked quantity moves — cost/price on the Expenses/Stock record is untouched.
    if (data.productId && onProductsChange) {
      onProductsChange(
        (products || []).map((p) =>
          p.id === data.productId ? { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) - quantity) } : p
        )
      );
    }
    notify("Sell item added — stock updated");
    setFormOpen(false);
  };

  const openAddForm = () => setFormOpen(true);

  const monthOptions = useMemo(() => getMonthOptions(sellItems.map((p) => getMonthKey(p.date))), [sellItems]);

  const monthItems = useMemo(() => sellItems.filter((p) => getMonthKey(p.date) === selectedMonth), [sellItems, selectedMonth]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return monthItems;
    return monthItems.filter((p) => p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q));
  }, [monthItems, query]);

  const totalSales = useMemo(() => monthItems.reduce((sum, p) => sum + (Number(p.price) || 0), 0), [monthItems]);

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
          <Plus size={16} /> Add item
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={28} />
          <div className="empty-title">No {meta.label.toLowerCase()} items sold in {getMonthLabel(selectedMonth)}</div>
          <div className="empty-sub">Pick a stocked item, its quantity, price, and date. It counts toward that month's revenue and updates stock automatically.</div>
          <button className="btn btn-primary" style={{ background: meta.accent }} onClick={openAddForm}>
            <Plus size={16} /> Add item
          </button>
        </div>
      ) : (
        <>
          <div className="table-scroll">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Brand name</th><th>Quantity</th><th>Price</th><th>Date</th></tr></thead>
            <tbody>
              {filteredItems.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.brand || "—"}</td>
                  <td>{p.quantity ?? "—"}</td>
                  <td>{formatMoney(p.price)}</td>
                  <td>{formatDisplayDate(p.date, "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {totalVisible && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div className="panel-title">Total {meta.label.toLowerCase()} sales — {getMonthLabel(selectedMonth)}</div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{formatMoney(totalSales)}</div>
            </div>
          )}
        </>
      )}

      {formOpen && (
        <SellItemFormModal meta={meta} stockItems={stockItems} onCancel={() => setFormOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
}
