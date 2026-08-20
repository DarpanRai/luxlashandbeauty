import { useState } from "react";
import { X } from "lucide-react";

export default function ReminderModal({ title = "Send reminder", defaultMessage, onCancel, onSend }) {
  const [message, setMessage] = useState(defaultMessage);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="label">Message</span>
            <textarea
              className="input"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ background: "var(--whatsapp)" }}
            onClick={() => onSend(message)}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
