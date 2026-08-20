import { X, Send } from "lucide-react";
import { formatDisplayDate } from "../../utils/date.js";

export default function SentHistoryModal({ customer, onCancel }) {
  const fullsetDates = customer.fullsetSentDates || [];
  const records = [
    customer.infillWeek2SentAt && { key: "infill-wk2", label: "Infill (week 2)", date: customer.infillWeek2SentAt },
    customer.infillWeek3SentAt && { key: "infill-wk3", label: "Infill (week 3)", date: customer.infillWeek3SentAt },
    ...fullsetDates.map((date, i) => ({
      key: `fullset-${i}`,
      label: fullsetDates.length > 1 ? `Full set offer #${i + 1}` : "Full set offer",
      date,
    })),
  ]
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal-header">
          <h2>Sent reminders — {customer.name}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {records.length === 0 ? (
            <div className="empty-inline">No reminders sent yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {records.map((r) => (
                <div key={r.key} className="cust-service-wrap">
                  <div className="cust-service">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Send size={13} /> {r.label}
                    </span>
                    <span className="cust-service-price">{formatDisplayDate(r.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
