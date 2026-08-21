import { useState } from "react";
import { X, ShoppingBag } from "lucide-react";
import { getTodayISO, PROJECT_START_DATE } from "../../utils/date.js";

// Add-only — a sale can't be edited after the fact since it already moved
// stock quantity once (see SellItemsPanel), so this form only ever creates.
export default function SellItemFormModal({ meta, stockItems, onCancel, onSave }) {
  const [form, setForm] = useState({ productId: "", name: "", brand: "", quantity: "", price: "", date: getTodayISO() });
  const [error, setError] = useState("");

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProduct = stockItems.find((p) => p.id === form.productId);

  const handleProductSelect = (productId) => {
    const product = stockItems.find((p) => p.id === productId);
    setForm((f) => ({
      ...f,
      productId,
      name: product ? product.name : f.name,
      brand: product ? product.brand || "" : f.brand,
    }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!form.productId) {
      setError("Select an item from stock.");
      return;
    }
    if (!form.name.trim() || !form.brand.trim() || !form.price.toString().trim() || form.date < PROJECT_START_DATE) return;
    const qty = Number(form.quantity);
    if (!(qty > 0)) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (selectedProduct && qty > selectedProduct.stockQuantity) {
      setError(`Only ${selectedProduct.stockQuantity} left in stock.`);
      return;
    }
    onSave(form);
  };

  // Nothing to sell from — skip the form entirely rather than showing quantity/price/
  // date fields that can't go anywhere without a stocked item to attach to.
  if (stockItems.length === 0) {
    return (
      <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
        <div className="modal">
          <div className="modal-header">
            <h2>Add {meta.label.toLowerCase()} sale item</h2>
            <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
          </div>
          <div className="modal-body">
            <div className="empty-state">
              <ShoppingBag size={28} />
              <div className="empty-title">No items in stock</div>
              <div className="empty-sub">Add an item to stock from Expenses first, then come back here to record a sale.</div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>Add {meta.label.toLowerCase()} sale item</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="label">Item <span className="label-hint">(from stock)</span></span>
            <select className="input" value={form.productId} onChange={(e) => handleProductSelect(e.target.value)} required>
              <option value="" disabled>Select a stocked item</option>
              {stockItems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.brand ? ` — ${p.brand}` : ""} ({p.stockQuantity} in stock)
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Quantity sold</span>
            <input
              className="input"
              type="number"
              min="1"
              step="1"
              max={selectedProduct ? selectedProduct.stockQuantity : undefined}
              value={form.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
              placeholder="e.g. 2"
              required
            />
          </label>
          <label className="field">
            <span className="label">Price</span>
            <input className="input" type="number" step="0.01" value={form.price} onChange={(e) => setField("price", e.target.value)} placeholder="0.00" required />
          </label>
          <label className="field">
            <span className="label">Date</span>
            <input type="date" className="input" min={PROJECT_START_DATE} value={form.date} onChange={(e) => setField("date", e.target.value)} required />
          </label>
          {error && <div className="field-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ background: meta.accent }}>
            Add item
          </button>
        </div>
      </form>
    </div>
  );
}
