import { useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { generateId } from "../../utils/id.js";
import { formatDisplayDate } from "../../utils/date.js";
import StaffFormModal from "./StaffFormModal.jsx";
import StaffDocumentsModal from "./StaffDocumentsModal.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";

export default function StaffPage({ staff, setStaff, role }) {
  // Viewing/downloading a staff member's photo full-size is an owner-only affordance —
  // staff role can never reach this page today (see App.jsx's STAFF_BLOCKED_VIEWS), but
  // this keeps the feature explicitly gated in case that routing rule ever loosens.
  const photoViewable = role !== "staff";
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [viewingDocsFor, setViewingDocsFor] = useState(null);
  const [viewingPhotoFor, setViewingPhotoFor] = useState(null);
  const notify = useToast();
  const editingStaff = editingId ? staff.find((s) => s.id === editingId) : null;
  const viewingDocsStaff = viewingDocsFor ? staff.find((s) => s.id === viewingDocsFor) : null;
  const viewingPhotoStaff = viewingPhotoFor ? staff.find((s) => s.id === viewingPhotoFor) : null;

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
                <td style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {s.photo ? (
                      photoViewable ? (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ padding: 0, borderRadius: "50%" }}
                          onClick={() => setViewingPhotoFor(s.id)}
                          title="View photo"
                        >
                          <img src={s.photo} alt={s.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" }} />
                        </button>
                      ) : (
                        <img src={s.photo} alt={s.name} style={{ width: 28, height: 28, objectFit: "cover", borderRadius: "50%", border: "1px solid var(--border)" }} />
                      )
                    ) : (
                      <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--staff-tint, #E1EEE7)", color: "var(--staff-dark, #276148)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {s.name.trim().charAt(0).toUpperCase() || "?"}
                      </span>
                    )}
                    {s.name}
                  </div>
                </td>
                <td>{s.role}{s.additionalRole && s.additionalRole !== "none" ? `, ${s.additionalRole}` : ""}</td>
                <td>{s.phone}</td>
                <td>{formatDisplayDate(s.joinedDate)}</td>
                <td><span className="chip" style={{ background: s.status === "active" ? "#E1EEE7" : "#F5E6E1", color: s.status === "active" ? "#276148" : "#B3452F" }}>{s.status === "active" ? "Active" : "Inactive"}</span></td>
                <td>
                  {(s.documents || []).length > 0 ? (
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {s.documents.slice(0, 3).map((doc, i) => (
                        <button
                          key={i}
                          type="button"
                          className="icon-btn"
                          style={{ padding: 0 }}
                          onClick={() => setViewingDocsFor(s.id)}
                          title="View documents"
                        >
                          <img src={doc} alt={`Document ${i + 1}`} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4, border: "1px solid var(--border)" }} />
                        </button>
                      ))}
                      {s.documents.length > 3 && (
                        <button type="button" className="chip" style={{ border: "none", cursor: "pointer" }} onClick={() => setViewingDocsFor(s.id)}>
                          +{s.documents.length - 3}
                        </button>
                      )}
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

      {viewingDocsStaff && (
        <StaffDocumentsModal
          staffName={viewingDocsStaff.name}
          documents={viewingDocsStaff.documents || []}
          onClose={() => setViewingDocsFor(null)}
        />
      )}

      {viewingPhotoStaff && photoViewable && (
        <StaffDocumentsModal
          staffName={viewingPhotoStaff.name}
          documents={viewingPhotoStaff.photo ? [viewingPhotoStaff.photo] : []}
          title={`${viewingPhotoStaff.name}'s photo`}
          itemLabel="photo"
          onClose={() => setViewingPhotoFor(null)}
        />
      )}

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
