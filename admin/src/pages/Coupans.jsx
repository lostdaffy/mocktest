import { useEffect, useState } from "react";
import { RiCoupon3Line, RiDeleteBinLine } from "@remixicon/react";
import api from "../api/axios";

const TYPE_LABELS = {
  fixed_price: "Fixed price",
  percent: "% off",
  flat_discount: "₹ off",
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [type, setType] = useState("fixed_price");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/admin/coupons");
      setCoupons(res.data.coupons);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!code || !value) {
      alert("Code aur value dono chahiye");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/coupons", {
        code,
        type,
        value: Number(value),
        maxUses: maxUses ? Number(maxUses) : null,
        note,
      });
      setCode("");
      setValue("");
      setMaxUses("");
      setNote("");
      load();
    } catch (err) {
      alert("Create failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(c) {
    await api.patch(`/admin/coupons/${c._id}/toggle`);
    load();
  }

  async function handleDelete(c) {
    if (!confirm(`"${c.code}" delete karna hai?`)) return;
    await api.delete(`/admin/coupons/${c._id}`);
    load();
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink mb-1">Coupons</h1>
      <p className="text-slate-500 mb-8">
        Discount codes banao subscription ke liye — testing ke liye, launch offers ke liye, ya kisi ko manually
        discount dene ke liye.
      </p>

      <form onSubmit={handleCreate} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="TEST1"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            >
              <option value="fixed_price">Fixed price (₹)</option>
              <option value="percent">% off</option>
              <option value="flat_discount">₹ off</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {type === "percent" ? "Percent" : "Amount (₹)"}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "fixed_price" ? "1" : type === "percent" ? "50" : "100"}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Max uses</label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (e.g. 'live payment testing, delete after use')"
          className="w-full mt-3 px-3 py-2 rounded-lg border border-slate-200 focus:border-brand outline-none text-sm"
        />
      </form>

      {loading ? (
        <p className="text-slate-400 text-center py-10">Loading...</p>
      ) : coupons.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Koi coupon nahi bana abhi.</p>
      ) : (
        <div className="space-y-3">
          {coupons.map((c) => (
            <div key={c._id} className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.isActive ? "bg-brand/5 text-brand" : "bg-slate-100 text-slate-400"}`}>
                  <RiCoupon3Line size={18} />
                </div>
                <div>
                  <p className="font-mono font-bold text-ink tracking-wide">{c.code}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.type === "fixed_price" ? `₹${c.value} final price` : c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                    {" · "}
                    Used {c.usedCount}
                    {c.maxUses ? `/${c.maxUses}` : ""} times
                    {c.note && ` · ${c.note}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(c)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                    c.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {c.isActive ? "Active" : "Inactive"}
                </button>
                <button onClick={() => handleDelete(c)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <RiDeleteBinLine size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}