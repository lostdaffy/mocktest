import { useState } from "react";
import api from "../api/axios";

export default function Users() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.get("/admin/users", { params: { phone: search } });
      setUsers(res.data.users);
    } catch (err) {
      alert("Search failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Password kam se kam 6 characters ka hona chahiye");
      return;
    }
    setResetting(true);
    try {
      await api.patch(`/admin/users/${resetTarget._id}/reset-password`, { newPassword });
      alert(`Password reset ho gaya ${resetTarget.name} ke liye`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      alert("Reset failed: " + (err.response?.data?.message || err.message));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Users</h1>
      <p className="text-slate-500 mb-8">
        Phone number se student dhundo aur zaroorat pade to password manually reset karo (jinke paas email nahi hai
        unke liye fallback).
      </p>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Phone number search karo..."
          className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-ink">{u.name}</p>
              <p className="text-sm text-slate-500">
                {u.phone} {u.email && `· ${u.email}`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {u.subscriptionStatus === "active" ? "⭐ Premium" : "Free"} · Joined{" "}
                {new Date(u.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <button
              onClick={() => setResetTarget(u)}
              className="px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm font-medium transition-colors"
            >
              Reset Password
            </button>
          </div>
        ))}
        {!loading && users.length === 0 && (
          <p className="text-slate-400 text-center py-10">Phone number search karke students dhundo</p>
        )}
      </div>

      {resetTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-ink mb-1">Password Reset</h3>
            <p className="text-sm text-slate-500 mb-4">
              {resetTarget.name} ({resetTarget.phone}) ke liye naya password set karo
            </p>
            <form onSubmit={handleReset}>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Naya password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-brand outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null);
                    setNewPassword("");
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium disabled:opacity-60"
                >
                  {resetting ? "Resetting..." : "Confirm Reset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}