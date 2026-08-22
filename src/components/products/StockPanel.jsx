import { useMemo, useState } from "react";
import { Search, Archive, AlertTriangle, XCircle } from "lucide-react";
import { formatMoney } from "../../utils/format.js";
import { formatDisplayDate } from "../../utils/date.js";
import { useToast } from "../../context/ToastContext.jsx";

// Anything at or below this (but still above 0) gets the "X left" warning —
// gives the owner a heads-up before it actually runs out, not just after.
const LOW_STOCK_THRESHOLD = 5;

// Items land here purely from the "Add this item to stock" checkbox on the
// expense form (ProductFormModal). Sellable items only ever move via a sale
// (SellItemsPanel decrements them automatically) — this panel stays read-only
// for those, and their running total is "sold", summed live from the sellItems
// records that reference them (already the source of truth, nothing to persist
// separately). Non-sellable items (internal-use consumables tracked for cost
// but never sold) have no other way to record consumption, so this panel adds
// a "Use stock" control for them: type how many were used, it subtracts that
// from the current quantity and adds it to a running "used" total on the
// record. Quantity can only ever go down — the input is capped at the current
// quantity, so there's no way to push it back up through here.
export default function StockPanel({ meta, products, onProductsChange, sellItems }) {
  const [query, setQuery] = useState("");
  const [useAmounts, setUseAmounts] = useState({});
  const notify = useToast();

  const stockItems = useMemo(() => products.filter((p) => p.stockQuantity != null), [products]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter((p) => p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q));
  }, [stockItems, query]);

  const soldByProductId = useMemo(
    () =>
      (sellItems || []).reduce((acc, item) => {
        if (!item.productId) return acc;
        acc[item.productId] = (acc[item.productId] || 0) + (Number(item.quantity) || 0);
        return acc;
      }, {}),
    [sellItems]
  );

  const handleUse = (p) => {
    const amount = Number(useAmounts[p.id]);
    if (!(amount >= 1) || amount > p.stockQuantity) return;
    onProductsChange(
      products.map((item) =>
        item.id === p.id
          ? { ...item, stockQuantity: item.stockQuantity - amount, usedQuantity: (item.usedQuantity || 0) + amount }
          : item
      )
    );
    setUseAmounts((m) => ({ ...m, [p.id]: "" }));
    notify(`Used ${amount} of "${p.name}" — ${p.stockQuantity - amount} left`);
  };

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
          <thead><tr><th>Name</th><th>Brand name</th><th>Quantity</th><th>Cost</th><th>Date added</th><th>Use stock</th><th>Used / Sold</th><th></th></tr></thead>
          <tbody>
            {filteredItems.map((p) => {
              const useAmount = useAmounts[p.id] || "";
              const canUse = Number(useAmount) >= 1 && Number(useAmount) <= p.stockQuantity;
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.brand || "—"}</td>
                  <td>{p.stockQuantity}</td>
                  <td>{formatMoney(p.cost)}</td>
                  <td>{formatDisplayDate(p.date, "—")}</td>
                  <td>
                    {p.sellable || p.stockQuantity === 0 ? (
                      <span style={{ color: "var(--ink-muted)" }}>—</span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                          type="number"
                          min="1"
                          max={p.stockQuantity}
                          step="1"
                          placeholder="e.g. 1"
                          className="input"
                          style={{ width: 68, padding: "6px 8px" }}
                          value={useAmount}
                          onChange={(e) => setUseAmounts((m) => ({ ...m, [p.id]: e.target.value }))}
                        />
                        <button type="button" className="btn btn-ghost" style={{ padding: "6px 10px" }} disabled={!canUse} onClick={() => handleUse(p)}>
                          Use
                        </button>
                      </div>
                    )}
                  </td>
                  <td>{p.sellable ? `${soldByProductId[p.id] || 0} sold` : `${p.usedQuantity || 0} used`}</td>
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
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
