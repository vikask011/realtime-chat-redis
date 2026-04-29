import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function Login() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const url = `${SERVER}/api/auth/${tab}`;
      const body =
        tab === "register"
          ? { username: form.username, email: form.email, password: form.password }
          : { email: form.email, password: form.password };
      const res = await axios.post(url, body);
      login(res.data.user, res.data.token);
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Left panel – illustration */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="brand-logo">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="12" fill="url(#lg1)" />
              <path d="M10 14h24M10 22h18M10 30h22" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="1" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="brand-name">Nexus Chat</span>
          </div>

          <div className="hero-text">
            <h2>Connect with anyone,<br />anywhere, instantly.</h2>
            <p>Real-time messaging powered by Redis & WebSockets. Fast, reliable, and always in sync.</p>
          </div>

          <div className="feature-list">
            {[
              { icon: "⚡", label: "Real-time delivery" },
              { icon: "🔒", label: "Secure & private" },
              { icon: "🌐", label: "Always online" },
            ].map((f) => (
              <div className="feature-item" key={f.label}>
                <span className="feature-icon">{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          <div className="bubbles-illustration">
            <div className="bubble b1">Hey! Are you free tonight? 👋</div>
            <div className="bubble b2">Sure! Let's catch up 🎉</div>
            <div className="bubble b3">Sounds perfect! 😄</div>
          </div>
        </div>

        {/* Decorative blobs */}
        <div className="blob blob-1" />
        <div className="blob blob-2" />
      </div>

      {/* Right panel – form */}
      <div className="login-right">
        <div className="login-form-card">
          <div className="form-header">
            <h1>{tab === "login" ? "Welcome back" : "Create account"}</h1>
            <p>{tab === "login" ? "Sign in to continue chatting" : "Join the conversation today"}</p>
          </div>

          {/* Tabs */}
          <div className="tab-switcher">
            {["login", "register"].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(""); }}
                className={`tab-btn ${tab === t ? "tab-active" : ""}`}
              >
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="fields-group">
            {tab === "register" && (
              <div className="field-wrap">
                <label>Username</label>
                <div className="input-icon-wrap">
                  <span className="input-icon">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={set("username")}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            <div className="field-wrap">
              <label>Email address</label>
              <div className="input-icon-wrap">
                <span className="input-icon">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                  className="form-input"
                />
              </div>
            </div>

            <div className="field-wrap">
              <label>Password</label>
              <div className="input-icon-wrap">
                <span className="input-icon">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set("password")}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="form-input"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="error-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} className="submit-btn">
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" /> Processing…
              </span>
            ) : (
              <>
                {tab === "login" ? "Sign In" : "Create Account"}
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <p className="switch-text">
            {tab === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}
              className="switch-link"
            >
              {tab === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}