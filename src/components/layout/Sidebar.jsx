import { LayoutDashboard, Sparkles, Eye, Users, Receipt, LogOut } from "lucide-react";
import logo from "../../img/luxlash.jpeg";

const NAV_ITEMS = [
  { key: "overview", label: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
  { key: "makeup", label: "Makeup", icon: Sparkles },
  { key: "luxlash", label: "LuxLash", icon: Eye },
  { key: "staff", label: "Staff's", icon: Users, ownerOnly: true },
  { key: "expenses", label: "Expenses", icon: Receipt },
];

export default function Sidebar({ view, role, onViewChange, onLogout }) {
  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || role !== "staff");
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={logo} alt="LuxLash & Beauty" className="sidebar-mark sidebar-mark-img" />
        <div>
          <div className="sidebar-title">LuxLash & Beauty</div>
          <div className="sidebar-sub">Admin panel</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className={`nav-item ${view === key ? "active" : ""}`}
            onClick={() => onViewChange(key)}
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button className="nav-item logout" onClick={onLogout}>
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </aside>
  );
}
