import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { generateId } from "../../utils/id.js";
import { formatDisplayDate } from "../../utils/date.js";
import StaffFormModal from "./StaffFormModal.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function StaffPage({ staff, setStaff }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const notify = useToast();
  const editingStaff = editingId ? staff.find((s) => s.id === editingId) : null;

  const handleSave = (data) => {
    if (editingId) {
      setStaff(staff.map((s) => (s.id === editingId ? { ...s, ...data } : s)));
      notify("Staff updated");
    } else {
      setStaff([...staff, { id: generateId(), ...data }]);
      notify("Staff added");
    }
    setFormOpen(false);
    setEditingId(null);
  };

  const removeStaff = (id) => {
    setStaff(staff.filter((s) => s.id !== id));
    notify("Staff deleted", "danger");
  };

  const openAddForm = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  return (
    <div className="view">
      <div className="view-header view-header--sticky">
        <div>
          <h1 className="page-title" style={{ color: "var(--staff-dark)" }}>Staff's</h1>
          <p className="page-sub">{staff.length} team members</p>
        </div>
        <button className="btn btn-primary" style={{ background: "var(--staff)" }} onClick={openAddForm}>
          <Plus size={16} /> Add staff
        </button>
      </div>

      {staff.length === 0 ? (
        <div className="empty-state">
          <Users size={28} />
          <div className="empty-title">No staff added yet</div>
          <div className="empty-sub">Add your artists and stylists to keep the team on record.</div>
          <button className="btn btn-primary" style={{ background: "var(--staff)" }} onClick={openAddForm}>
            <Plus size={16} /> Add staff
          </button>
        </div>
      ) : (
        <div className="table-scroll">
        <table className="data-table staff-table">
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Joined</th><th>Status</th><th>Documents</th><th></th></tr></thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>{s.name}</td>
                <td>{s.role}</td>
                <td>{s.phone}</td>
                <td>{formatDisplayDate(s.joinedDate)}</td>
                <td><span className="chip" style={{ background: s.status === "active" ? "#E1EEE7" : "#F5E6E1", color: s.status === "active" ? "#276148" : "#B3452F" }}>{s.status === "active" ? "Active" : "Inactive"}</span></td>
                <td>
                  {(s.documents || []).length > 0 ? (
                    <div style={{ display: "flex", gap: 4 }}>
                      {s.documents.slice(0, 3).map((doc, i) => (
                        <a key={i} href={doc} target="_blank" rel="noopener noreferrer">
                          <img src={doc} alt={`Document ${i + 1}`} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                        </a>
                      ))}
                      {s.documents.length > 3 && <span className="chip">+{s.documents.length - 3}</span>}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <div className="card-actions">
                    <button className="icon-btn" onClick={() => { setEditingId(s.id); setFormOpen(true); }}><Pencil size={14} /></button>
                    <button className="icon-btn danger" onClick={() => setDeleteId(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {formOpen && <StaffFormModal initial={editingStaff} onCancel={() => { setFormOpen(false); setEditingId(null); }} onSave={handleSave} />}

      {deleteId && (
        <ConfirmDialog
          title="Delete staff member?"
          message="This will permanently remove this staff member's record. This can't be undone."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => { removeStaff(deleteId); setDeleteId(null); }}
        />
      )}
    </div>
  );
}
