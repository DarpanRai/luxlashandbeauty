import { useState } from "react";
import { Lock, Plus, Pencil, Trash2, ShieldCheck, UserCog } from "lucide-react";
import { supabase } from "../../lib/supabaseClient.js";
import { useToast } from "../../context/ToastContext.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import AccountFormModal from "./AccountFormModal.jsx";

// There's no Supabase Auth session in this app (see supabase-auth-setup.sql), so the
// owner's password isn't available after login — only login() ever saw it, and it
// wasn't kept around. This page asks for it once per visit ("unlock"), holds it in
// memory only (never sessionStorage/localStorage), and reuses it to re-authorize every
// admin_* call for the rest of the visit. Leaving this page clears it.
export default function TeamAccountsPage({ account, onOwnAccountUpdated }) {
  const [authEmail, setAuthEmail] = useState(null);
  const [authPassword, setAuthPassword] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [formTarget, setFormTarget] = useState(undefined); // undefined = closed, null = add, object = edit
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const notify = useToast();

  const unlocked = authEmail !== null && authPassword !== null;

  const fetchAccounts = async (email, password) => {
    const { data, error } = await supabase.rpc("admin_list_accounts", { p_email: email, p_password: password });
    if (error) throw error;
    setAccounts(data || []);
  };

  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError("");
    try {
      await fetchAccounts(account.email, unlockPassword);
      setAuthEmail(account.email);
      setAuthPassword(unlockPassword);
      setUnlockPassword("");
    } catch (error) {
      setUnlockError(error.message === "Not authorized" ? "Incorrect password" : "Couldn't verify — check your connection");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSave = async ({ email, name, role, password }) => {
    setSaving(true);
    try {
      const isSelf = formTarget && formTarget.id === account.id;
      const { data, error } = await supabase.rpc("admin_upsert_account", {
        p_email: authEmail,
        p_password: authPassword,
        p_target_id: formTarget?.id || null,
        p_target_email: email,
        p_target_password: password,
        p_target_role: role,
        p_target_name: name,
      });
      if (error) throw error;

      if (isSelf) {
        if (email !== authEmail) setAuthEmail(email);
        if (password) setAuthPassword(password);
        // token_version was just bumped by this edit (see admin_upsert_account) —
        // updating it here keeps *this* session valid; only other, now-stale
        // sessions for this account fail the periodic check in App.jsx.
        onOwnAccountUpdated({
          email,
          name,
          role: data?.[0]?.role || account.role,
          token_version: data?.[0]?.token_version,
        });
      }

      await fetchAccounts(isSelf && email !== authEmail ? email : authEmail, isSelf && password ? password : authPassword);
      notify(formTarget ? "Login updated" : "Login added");
      setFormTarget(undefined);
      return {};
    } catch (error) {
      return { error: error.message || "Something went wrong" };
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const { error } = await supabase.rpc("admin_delete_account", {
        p_email: authEmail,
        p_password: authPassword,
        p_target_id: target.id,
      });
      if (error) throw error;
      await fetchAccounts(authEmail, authPassword);
      notify("Login deleted");
    } catch (error) {
      notify(error.message || "Couldn't delete that login", "danger");
    }
  };

  if (!unlocked) {
    return (
      <div className="view">
        <div className="view-header view-header--sticky">
          <div>
            <h1 className="page-title" style={{ color: "var(--staff-dark)" }}>Team</h1>
            <p className="page-sub">Manage who can sign in to this admin panel</p>
          </div>
        </div>
        <div className="empty-state" style={{ maxWidth: 360, margin: "0 auto" }}>
          <Lock size={28} />
          <div className="empty-title">Confirm your password</div>
          <div className="empty-sub">For security, re-enter your password to manage logins.</div>
          <form onSubmit={handleUnlock} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, textAlign: "left" }}>
            <label className="field">
              <span className="label">Password</span>
              <input
                className="input"
                type="password"
                autoFocus
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                required
              />
            </label>
            {unlockError && <div className="field-error">{unlockError}</div>}
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", background: "var(--staff)" }} disabled={unlocking}>
              {unlocking ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="view-header view-header--sticky">
        <div>
          <h1 className="page-title" style={{ color: "var(--staff-dark)" }}>Team</h1>
          <p className="page-sub">{accounts.length} login{accounts.length === 1 ? "" : "s"}</p>
        </div>
        <button className="btn btn-primary" style={{ background: "var(--staff)" }} onClick={() => setFormTarget(null)}>
          <Plus size={16} /> Add login
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>
                  {a.name} {a.id === account.id && <span className="label-hint">(you)</span>}
                </td>
                <td>{a.email}</td>
                <td>
                  <span className="chip" style={{ background: a.role === "owner" ? "var(--primary-tint)" : "#E1EEE7", color: a.role === "owner" ? "var(--primary)" : "#276148" }}>
                    {a.role === "owner" ? <ShieldCheck size={11} style={{ marginRight: 3, verticalAlign: -1 }} /> : <UserCog size={11} style={{ marginRight: 3, verticalAlign: -1 }} />}
                    {a.role === "owner" ? "Owner" : "Staff"}
                  </span>
                </td>
                <td>
                  <div className="card-actions">
                    <button type="button" className="icon-btn" onClick={() => setFormTarget(a)}><Pencil size={14} /></button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setDeleteTarget(a)}
                      disabled={a.id === account.id}
                      title={a.id === account.id ? "You can't delete your own login here" : "Delete"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {formTarget !== undefined && (
        <AccountFormModal
          initial={formTarget}
          isSelf={!!formTarget && formTarget.id === account.id}
          saving={saving}
          onCancel={() => setFormTarget(undefined)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this login?"
          message={`${deleteTarget.name} (${deleteTarget.email}) will no longer be able to sign in. This can't be undone.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
