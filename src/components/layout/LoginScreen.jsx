import { useState } from "react";
import { LogIn } from "lucide-react";
import logo from "../../img/luxlash.jpeg";
import { ACCOUNTS } from "../../constants/accounts.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const match = ACCOUNTS.find(
      (a) => a.email.toLowerCase() === email.trim().toLowerCase() && a.password === password
    );
    if (match) {
      setError("");
      onLogin(match);
    } else {
      setError("Invalid email or password");
    }
  };

  return (
    <div className="logout-screen">
      <div className="logout-card">
        <img
          src={logo}
          alt="LuxLash & Beauty"
          className="sidebar-mark-img"
          style={{ width: 96, height: 96, borderRadius: 16, margin: "0 auto 14px" }}
        />
        <h2>Sign in</h2>
        <p>Enter your admin credentials to access the studio panel.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          <label className="field">
            <span className="label">Email</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <div className="field-error">{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }}>
            <LogIn size={16} /> Log in
          </button>
        </form>
      </div>
    </div>
  );
}
