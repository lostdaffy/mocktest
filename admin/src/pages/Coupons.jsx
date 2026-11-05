import { useEffect, useState } from "react";
import { RiDeleteBinLine, RiAddLine } from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card } from "../components/ui";
import { useToast } from "../components/Toast";

const TYPE_LABELS = {
  fixed_price: "Fixed price",
  percent: "% off",
  flat_discount: "₹ off",
};

const worth = (c) => (c.type === "fixed_price" ? `₹${c.value} final price` : c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`);

export default function Coupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState("active");

  const [code, setCode] = useState("");
  const [type, setType] = useState("fixed_price");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [note, setNote] = useState("");
  const [planKeys, setPlanKeys] = useState([]); // plans the new coupon works on
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, pl] = await Promise.all([api.get("/admin/coupons"), api.get("/admin/plans").catch(() => ({ data: { plans: [] } }))]);
      setCoupons(res.data.coupons);
      setPlans((pl.data.plans || []).filter((p) => !p.archivedAt));
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
      toast.error("Enter both a code and a value");
      return;
    }
    if (!planKeys.length) {
      toast.error("Pick the plan(s) this coupon works on");
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
        plans: planKeys,
      });
      toast.success(`Coupon "${code}" created`);
      setCode("");
      setValue("");
      setMaxUses("");
      setNote("");
      setPlanKeys([]);
      setShowForm(false);
      setTab("active");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create the coupon");
    } finally {
      setSaving(false);
    }
  }

  const planName = (key) => plans.find((p) => p.key === key)?.name || key;
  const planLabel = (c) => (c.plans?.length ? c.plans.map(planName).join(", ") : "All plans with coupons on");

  async function handleToggle(c) {
    await api.patch(`/admin/coupons/${c._id}/toggle`);
    load();
  }

  async function handleDelete(c) {
    const ok = await toast.confirm({
      title: `Delete "${c.code}"?`,
      message: "This coupon will no longer be usable. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    await api.delete(`/admin/coupons/${c._id}`);
    toast.success("Coupon deleted");
    load();
  }

  const active = coupons.filter((c) => c.isActive);
  const inactive = coupons.filter((c) => !c.isActive);
  const shown = tab === "active" ? active : inactive;
  const totalUsed = coupons.reduce((n, c) => n + (c.usedCount || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Coupons"
        subtitle="Discount codes for subscriptions. Each coupon works only on the plans you pick, and only while that plan has coupons switched on (Plans page)."
        actions={
          <button onClick={() => setShowForm((v) => !v)} className="rv-btn-primary">
            <RiAddLine size={16} /> {showForm ? "Close" : "New coupon"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleCreate} className="rv-card p-5 mb-5">
          <div className="grid grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto] gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">Code</label>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. LAUNCH50" className="rv-input uppercase" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="rv-input">
                <option value="fixed_price">Fixed price (₹)</option>
                <option value="percent">% off</option>
                <option value="flat_discount">₹ off</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">{type === "percent" ? "Percent" : "Amount (₹)"}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "fixed_price" ? "1" : type === "percent" ? "50" : "100"}
                className="rv-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1.5">Max uses</label>
              <input type="number" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" className="rv-input" />
            </div>
            <button type="submit" disabled={saving} className="rv-btn-primary col-span-2 lg:col-span-1">
              {saving ? "Saving..." : "Create"}
            </button>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate mb-1.5">Works on these plans</p>
            <div className="flex flex-wrap gap-2">
              {plans.map((p) => {
                const on = planKeys.includes(p.key);
                return (
                  <button
                    type="button"
                    key={p.key}
                    onClick={() => setPlanKeys((ks) => (on ? ks.filter((k) => k !== p.key) : [...ks, p.key]))}
                    className={`text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${on ? "bg-brand text-white border-brand" : "bg-white text-ink-soft border-border hover:border-brand"}`}
                  >
                    {p.name} · ₹{p.price}
                    {!p.couponsAllowed && <span className={`ml-1.5 text-[11px] font-medium ${on ? "text-white/80" : "text-warn"}`}>(coupons off)</span>}
                  </button>
                );
              })}
            </div>
            {planKeys.some((k) => plans.find((p) => p.key === k && !p.couponsAllowed)) && (
              <p className="text-xs text-warn mt-2">A picked plan has coupons switched off, so this coupon won't work there until you switch them on in Plans.</p>
            )}
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (e.g. 'Diwali offer, ends 15 Nov')" className="w-full mt-3 rv-input text-sm" />
        </form>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["Active coupons", active.length, "bg-success"],
          ["Switched off", inactive.length, "bg-slate-soft"],
          ["Times used, all coupons", totalUsed, "bg-brand"],
          ["Used up (reached max)", coupons.filter((c) => c.maxUses && c.usedCount >= c.maxUses).length, "bg-warn"],
        ].map(([label, v, tone]) => (
          <Card key={label} className="!p-4 flex items-center gap-3">
            <span className={`w-1.5 self-stretch rounded-full ${tone}`} />
            <div>
              <p className="font-display text-xl font-extrabold text-ink tabular-nums">{loading ? "—" : v}</p>
              <p className="text-xs text-slate">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-1 border-b border-border mb-4">
        {[
          ["active", "Active", active.length],
          ["inactive", "Switched off", inactive.length],
        ].map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums bg-slate-light text-slate">{n}</span>
          </button>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="text-slate-soft text-center py-10">Loading...</p>
        ) : shown.length === 0 ? (
          <p className="text-slate-soft text-center py-10">{coupons.length === 0 ? 'No coupons yet. Press "New coupon" to make one.' : "Nothing here."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Plans</th>
                  <th className="px-4 py-3 min-w-[150px]">Used</th>
                  <th className="px-4 py-3">Note</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {shown.map((c) => {
                  const pct = c.maxUses ? Math.min(100, (c.usedCount / c.maxUses) * 100) : 0;
                  return (
                    <tr key={c._id} className="align-middle hover:bg-slate-light/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-ink tracking-wide">{c.code}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-ink-soft font-medium">{worth(c)}</p>
                        <p className="text-[11px] text-slate-soft">{TYPE_LABELS[c.type]}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft max-w-[200px]">{planLabel(c)}</td>
                      <td className="px-4 py-3">
                        {c.maxUses ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-slate-light overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-warn" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs tabular-nums text-slate whitespace-nowrap">
                              {c.usedCount}/{c.maxUses}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate tabular-nums">{c.usedCount} times · no limit</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate max-w-[260px]">{c.note || <span className="text-slate-soft">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggle(c)}
                            className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                              c.isActive ? "bg-warn-light text-warn hover:opacity-80" : "bg-success-light text-success hover:opacity-80"
                            }`}
                          >
                            {c.isActive ? "Switch off" : "Switch on"}
                          </button>
                          <button onClick={() => handleDelete(c)} className="p-1.5 rounded-md hover:bg-danger-light text-slate-soft hover:text-danger transition-colors" title="Delete">
                            <RiDeleteBinLine size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
