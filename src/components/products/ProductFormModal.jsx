import { useState } from "react";
import { X } from "lucide-react";
import { getTodayISO, PROJECT_START_DATE } from "../../utils/date.js";

export default function ProductFormModal({ meta, category, initial, onCancel, onSave }) {
  const isStudio = category === "studio";
  const [form, setForm] = useState(() =>
    initial
      ? { name: initial.name, brand: initial.brand, cost: initial.cost, date: initial.date || getTodayISO() }
      : { name: "", brand: "", cost: "", date: getTodayISO() }
  );

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || (!isStudio && !form.brand.trim()) || !form.cost.toString().trim() || form.date < PROJECT_START_DATE)
      return;
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isStudio ? `${initial ? "Edit" : "Add"} items` : `${initial ? "Edit" : "Add"} ${meta.label.toLowerCase()} product`}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Product name" required />
          </label>
          {!isStudio && (
            <label className="field">
              <span className="label">Brand name</span>
              <input className="input" value={form.brand} onChange={(e) => setField("brand", e.target.value)} placeholder="Brand name" required />
            </label>
          )}
          <label className="field">
            <span className="label">Cost</span>
            <input className="input" type="number" step="0.01" value={form.cost} onChange={(e) => setField("cost", e.target.value)} placeholder="0.00" required />
          </label>
          <label className="field">
            <span className="label">Date</span>
            <input type="date" className="input" min={PROJECT_START_DATE} value={form.date} onChange={(e) => setField("date", e.target.value)} required />
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ background: meta.accent }}>{initial ? "Save changes" : isStudio ? "Add items" : "Add product"}</button>
        </div>
      </form>
    </div>
  );
}
