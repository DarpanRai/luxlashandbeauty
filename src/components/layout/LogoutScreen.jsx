import { LogIn } from "lucide-react";

export default function LogoutScreen({ onLogin }) {
  return (
    <div className="logout-screen">
      <div className="logout-card">
        <span className="sidebar-mark" style={{ margin: "0 auto 14px" }}>GS</span>
        <h2>You've been logged out</h2>
        <p>Your studio data is saved. Log back in any time to pick up where you left off.</p>
        <button className="btn btn-primary" onClick={onLogin}>
          <LogIn size={16} /> Log back in
        </button>
      </div>
    </div>
  );
}
