import { useMemo, useState } from "react";
import { Search, Archive, AlertTriangle, XCircle } from "lucide-react";
import { formatMoney } from "../../utils/format.js";
import { formatDisplayDate } from "../../utils/date.js";

// Anything at or below this (but still above 0) gets the "X left" warning —
// gives the owner a heads-up before it actually runs out, not just after.
const LOW_STOCK_THRESHOLD = 5;

// Read-only view — items land here purely from the "Add this item to stock"
// checkbox on the expense form (ProductFormModal), and quantities only ever move
// by adding a fresh expense or recording a sale (SellItemsPanel). An item that's
// sold all the way down to 0 stays listed here (flagged "Out of stock") rather
// than disappearing, so it isn't quietly forgotten.
export default function StockPanel({ meta, products }) {
  const [query, setQuery] = useState("");

  const stockItems = useMemo(() => products.filter((p) => p.stockQuantity != null), [products]);

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
          <thead><tr><th>Name</th><th>Brand name</th><th>Quantity</th><th>Cost</th><th>Date added</th><th></th></tr></thead>
          <tbody>
            {filteredItems.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.brand || "—"}</td>
                <td>{p.stockQuantity}</td>
                <td>{formatMoney(p.cost)}</td>
                <td>{formatDisplayDate(p.date, "—")}</td>
                <td style={{ textAlign: "right" }}>
                  {p.stockQuantity === 0 ? (
                    <span className="chip" style={{ background: "#F5E6E1", color: "#B3452F", display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
                      <XCircle size={11} /> Out of stock
                    </span>
                  ) : p.stockQuantity <= LOW_STOCK_THRESHOLD ? (
                    <span className="chip" style={{ background: "#F6EDD8", color: "#7C5C1C", display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }}>
                      <AlertTriangle size={11} /> {p.stockQuantity} left
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
