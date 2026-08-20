// Shared full-screen fallback for app-breaking states (offline, database
// unreachable, uncaught render errors) — reuses the auth shell's centered-card
// layout so these don't need their own CSS.
export default function FullScreenError({ icon: Icon, title, message, actionLabel, onAction }) {
  return (
    <div className="logout-screen">
      <div className="logout-card">
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: "var(--danger-tint)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px",
          }}
        >
          <Icon size={28} />
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        {actionLabel && (
          <button className="btn btn-primary" style={{ justifyContent: "center", width: "100%" }} onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
