import { useState } from "react";
import { X, Upload, Trash2 } from "lucide-react";
import { getTodayISO } from "../../utils/date.js";
import { useToast } from "../../context/ToastContext.jsx";

// Raster formats only — image/svg+xml can carry executable <script>, so it's deliberately excluded.
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export const STAFF_ROLE_OPTIONS = [
  "Makeup Artist - Senior",
  "Makeup Artist - Master",
  "Luxlash Artist",
  "Brows Artist",
  "Receptionist",
  "Intern",
];

// Additional role deliberately excludes Receptionist and Intern — primary roles only.
const ADDITIONAL_ROLE_OPTIONS = STAFF_ROLE_OPTIONS.filter((r) => r !== "Receptionist" && r !== "Intern");

export default function StaffFormModal({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial, additionalRole: initial.additionalRole || "none" }
      : { name: "", photo: null, role: "", additionalRole: "none", phone: "", joinedDate: getTodayISO(), status: "active", documents: [] }
  );
  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const notify = useToast();

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      notify(`${file.name}: only PNG, JPEG, WEBP, or GIF images are allowed`, "danger");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      notify(`${file.name}: image must be under 5MB`, "danger");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField("photo", reader.result);
    reader.readAsDataURL(file);
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        notify(`${file.name}: only PNG, JPEG, WEBP, or GIF images are allowed`, "danger");
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        notify(`${file.name}: image must be under 5MB`, "danger");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setForm((f) => ({ ...f, documents: [...(f.documents || []), reader.result] }));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeDocument = (index) => {
    setForm((f) => ({ ...f, documents: f.documents.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role) return;
    onSave(form);
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{initial ? "Edit staff member" : "Add staff member"}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field"><span className="label">Full name</span><input className="input" value={form.name} onChange={(e) => setField("name", e.target.value)} required /></label>

          <div className="field">
            <span className="label">Photo <span className="label-hint">(optional)</span></span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {form.photo && (
                <img src={form.photo} alt="Staff photo" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" }} />
              )}
              <label className="btn btn-ghost" style={{ display: "inline-flex", cursor: "pointer" }}>
                <Upload size={14} /> {form.photo ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
              </label>
              {form.photo && (
                <button type="button" className="icon-btn danger" onClick={() => setField("photo", null)}><Trash2 size={14} /></button>
              )}
            </div>
          </div>

          <label className="field">
            <span className="label">Role</span>
            <select className="input" value={form.role} onChange={(e) => setField("role", e.target.value)} required>
              <option value="" disabled>Select role</option>
              {form.role && !STAFF_ROLE_OPTIONS.includes(form.role) && <option value={form.role}>{form.role}</option>}
              {STAFF_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Additional role <span className="label-hint">(optional)</span></span>
            <select className="input" value={form.additionalRole || "none"} onChange={(e) => setField("additionalRole", e.target.value)}>
              <option value="none">None</option>
              {form.additionalRole && form.additionalRole !== "none" && !ADDITIONAL_ROLE_OPTIONS.includes(form.additionalRole) && (
                <option value={form.additionalRole}>{form.additionalRole}</option>
              )}
              {ADDITIONAL_ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="field"><span className="label">Phone</span><input className="input" value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></label>
          <label className="field"><span className="label">Joined date</span><input type="date" className="input" value={form.joinedDate} onChange={(e) => setField("joinedDate", e.target.value)} /></label>
          <label className="field">
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="field">
            <span className="label">Documents <span className="label-hint">(optional, image files)</span></span>
            <label className="btn btn-ghost" style={{ display: "inline-flex", cursor: "pointer" }}>
              <Upload size={14} /> Upload images
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
            </label>
            {(form.documents || []).length > 0 && (
              <div className="addon-list" style={{ marginTop: 10 }}>
                {form.documents.map((doc, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img src={doc} alt={`Document ${i + 1}`} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }} />
                    <button type="button" className="icon-btn danger" onClick={() => removeDocument(i)}><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ background: "var(--staff)" }}>{initial ? "Save changes" : "Add staff"}</button>
        </div>
      </form>
    </div>
  );
}
