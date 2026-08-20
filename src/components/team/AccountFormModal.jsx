import { useState } from "react";
import { X } from "lucide-react";

export default function AccountFormModal({ initial, isSelf, onCancel, onSave, saving }) {
  const [email, setEmail] = useState(initial?.email || "");
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "staff");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!initial && password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password && password.trim().length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    const result = await onSave({ email: email.trim(), name: name.trim(), role, password: password.trim() });
    if (result?.error) setError(result.error);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{initial ? "Edit login" : "Add login"}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="label">Email</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="field">
            <span className="label">Role</span>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={isSelf}
            >
              <option value="owner">Owner — sees everything</option>
              <option value="staff">Staff — restricted view</option>
            </select>
            {isSelf && <span className="label-hint">You can't change your own role here.</span>}
          </label>
          <label className="field">
            <span className="label">
              Password {initial && <span className="label-hint">(leave blank to keep current password)</span>}
            </span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={initial ? "••••••••" : "At least 6 characters"}
            />
          </label>
          {error && <div className="field-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : initial ? "Save changes" : "Add login"}
          </button>
        </div>
      </form>
    </div>
  );
}
