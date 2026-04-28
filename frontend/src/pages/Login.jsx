import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const SERVER = import.meta.env.VITE_SERVER_URL;

export default function Login() {
  const { login } = useAuth();
  const [tab, setTab] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const url = `${SERVER}/api/auth/${tab}`;
      const body = tab === "register"
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
    <div className="flex items-center justify-center h-full bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 w-full max-w-sm shadow-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">💬</div>
          <h1 className="text-2xl font-bold text-white">Redis Chat</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time messaging</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
          {["login", "register"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition capitalize
                ${tab === t ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {tab === "register" && (
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={set("username")}
              className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={set("email")}
            className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={set("password")}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full bg-gray-800 text-white placeholder-gray-500 border border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-500 transition"
          />
        </div>

        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition"
        >
          {loading ? "Please wait..." : tab === "login" ? "Login →" : "Create Account →"}
        </button>
      </div>
    </div>
  );
}
