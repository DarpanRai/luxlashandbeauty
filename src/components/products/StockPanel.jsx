import { useMemo, useState } from "react";
import { Search, Archive } from "lucide-react";
import { formatMoney } from "../../utils/format.js";
import { formatDisplayDate } from "../../utils/date.js";

// Read-only view — items land here purely from the "Add this item to stock"
// checkbox on the expense form (ProductFormModal). No separate add/edit flow of
// its own, so quantities only ever change by adding a fresh expense.
export default function StockPanel({ meta, products }) {
  const [query, setQuery] = useState("");

  const stockItems = useMemo(() => products.filter((p) => p.stockQuantity != null && p.stockQuantity > 0), [products]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter((p) => p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q));
  }, [stockItems, query]);

  return (
    <div className="view">
      <div className="view-header" style={{ marginTop: 0, marginBottom: 14 }}>
        <div className="search-row" style={{ flex: 1, marginBottom: 0 }}>
          <Search size={16} className="search-icon" />
          <input className="search-input" placeholder="Search by name or brand" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="empty-state">
          <Archive size={28} />
          <div className="empty-title">No {meta.label.toLowerCase()} stock yet</div>
          <div className="empty-sub">Check "Add this item to stock" when adding an expense to have it show up here.</div>
        </div>
      ) : (
        <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Brand name</th><th>Quantity</th><th>Cost</th><th>Date added</th></tr></thead>
          <tbody>
            {filteredItems.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.brand || "—"}</td>
                <td>{p.stockQuantity}</td>
                <td>{formatMoney(p.cost)}</td>
                <td>{formatDisplayDate(p.date, "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
