import { useState } from "react";
import { LogIn, Loader2 } from "lucide-react";
import logo from "../../img/luxlash.jpeg";
import { supabase } from "../../lib/supabaseClient.js";

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data, error: rpcError } = await supabase.rpc("login", {
        p_email: email.trim(),
        p_password: password,
      });
      if (rpcError) throw rpcError;
      const match = data?.[0];
      if (match) {
        onLogin({ email: email.trim(), role: match.role, name: match.name });
      } else {
        setError("Invalid email or password");
      }
    } catch {
      setError("Couldn't sign in — check your connection and try again");
    } finally {
      setSubmitting(false);
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
          <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="spin" /> : <LogIn size={16} />}
            {submitting ? "Signing in…" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
