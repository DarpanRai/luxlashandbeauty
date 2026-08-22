import { X, ClipboardList } from "lucide-react";

// Generic results popup for the assistant's read-only list queries (expenses,
// sales, staff, salary) — columns vary per query type, so the caller supplies
// them rather than this component knowing about every record shape.
export default function AiListModal({ title, columns, rows, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {rows.length === 0 ? (
            <div className="empty-state">
              <ClipboardList size={28} />
              <div className="empty-title">No records found</div>
              <div className="empty-sub">Nothing matches that.</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c.header}>{c.header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.id || i}>
                      {columns.map((c) => (
                        <td key={c.header} style={c.header === "Name" ? { fontFamily: "var(--font-body)", fontWeight: 600 } : undefined}>
                          {c.render(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
