import { X, CalendarClock } from "lucide-react";
import { formatDisplayDate, formatDisplayTime } from "../../utils/date.js";

export default function AiAppointmentsModal({ title, appointments, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          {appointments.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={28} />
              <div className="empty-title">No appointments found</div>
              <div className="empty-sub">Nothing matches that in the upcoming list.</div>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Assigned to</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>{c.name}</td>
                      <td style={{ textTransform: "capitalize" }}>{c.category}</td>
                      <td>{formatDisplayDate(c.appointmentDate)}</td>
                      <td>{formatDisplayTime(c.appointmentTime)}</td>
                      <td>{c.assignedTo || "—"}</td>
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
