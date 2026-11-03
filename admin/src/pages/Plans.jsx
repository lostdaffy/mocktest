import { useEffect, useMemo, useState } from "react";
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiArchiveLine,
  RiInboxUnarchiveLine,
  RiShieldKeyholeLine,
  RiCloseLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Card, Badge } from "../components/ui";
import { useToast } from "../components/Toast";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const EMPTY = { key: "", name: "", months: "", price: "", mrp: "", badge: "", creditPercent: "50", couponsAllowed: true, highlight: false, sortOrder: "" };

const ACTION_LABEL = {
  "plan.create": "Created",
  "plan.update": "Edited",
  "plan.activate": "Put on sale",
  "plan.deactivate": "Taken off sale",
  "plan.archive": "Archived",
  "plan.restore": "Restored",
  "plan.delete": "Deleted",
  "auth.confirm_failed": "Wrong password",
};

function describeChange(row) {
  if (row.action !== "plan.update" || !row.before || !row.after) return "";
  return Object.keys(row.after)
    .filter((k) => JSON.stringify(row.before[k]) !== JSON.stringify(row.after[k]) && !["archivedAt"].includes(k))
    .map((k) => `${k}: ${row.before[k] ?? "—"} → ${row.after[k] ?? "—"}`)
    .join(" · ");
}

export default function Plans() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [audit, setAudit] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("sale");

  const [form, setForm] = useState(null); // null = closed; { id?, ...fields }
  // A pending change waiting for the admin's password: { title, summary, run(password) }
  const [pending, setPending] = useState(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [passError, setPassError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([api.get("/admin/plans"), api.get("/admin/plans/audit")]);
      setPlans(p.data.plans);
      setAudit(a.data.rows);
    } catch (err) {
      toast.error("Couldn't load plans: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSale = plans.filter((p) => p.active && !p.archivedAt);
  const offSale = plans.filter((p) => !p.active && !p.archivedAt);
  const archived = plans.filter((p) => p.archivedAt);
  const shown = { sale: onSale, off: offSale, archived }[tab] || [];
  const revenue = plans.reduce((n, p) => n + (p.revenue || 0), 0);

  // Every change goes through here: ask for the password, send it as a header,
  // and if the server wants a second acknowledgement (a big price jump) ask
  // once more and repeat the same request.
  function secure({ title, summary, danger, request }) {
    setPassword("");
    setPassError("");
    setPending({ title, summary, danger, request });
  }

  async function submitPending(e) {
    e?.preventDefault();
    if (!password) return setPassError("Enter your password");
    setBusy(true);
    setPassError("");
    const send = (extra) => pending.request(password, extra);
    try {
      let res;
      try {
        res = await send({});
      } catch (err) {
        if (err.response?.status === 409 && err.response.data?.code === "NEEDS_ACK") {
          const ok = await toast.confirm({
            title: "Are you sure?",
            message: err.response.data.message,
            confirmLabel: "Yes, apply it",
            danger: true,
          });
          if (!ok) return;
          res = await send({ acknowledge: true });
        } else throw err;
      }
      setPending(null);
      setForm(null);
      toast.success("Done. It is saved and logged.");
      load();
      return res;
    } catch (err) {
      const d = err.response?.data;
      if (d?.code === "CONFIRM_WRONG" || d?.code === "CONFIRM_REQUIRED" || d?.code === "CONFIRM_LOCKED") setPassError(d.message);
      else {
        setPending(null);
        toast.error(d?.message || err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function openNew() {
    setForm({ ...EMPTY });
  }
  function openEdit(p) {
    setForm({
      id: p._id,
      key: p.key,
      name: p.name,
      months: String(p.months),
      price: String(p.price),
      mrp: p.mrp ? String(p.mrp) : "",
      badge: p.badge || "",
      creditPercent: String(p.creditPercent),
      couponsAllowed: !!p.couponsAllowed,
      highlight: !!p.highlight,
      sortOrder: String(p.sortOrder ?? ""),
    });
  }

  function bodyFromForm(f) {
    const num = (v) => (v === "" || v === null ? undefined : Number(v));
    return {
      name: f.name,
      months: num(f.months),
      price: num(f.price),
      mrp: f.mrp === "" ? null : Number(f.mrp),
      badge: f.badge,
      creditPercent: num(f.creditPercent),
      couponsAllowed: f.couponsAllowed,
      highlight: f.highlight,
      sortOrder: num(f.sortOrder),
    };
  }

  function saveForm(e) {
    e.preventDefault();
    const f = form;
    if (!f.name.trim() || !f.months || !f.price) return toast.error("Name, length and price are required");
    const body = bodyFromForm(f);
    if (f.id) {
      const old = plans.find((p) => p._id === f.id);
      secure({
        title: `Save changes to "${old.name}"`,
        summary: old.price !== body.price ? `Price ${rupees(old.price)} → ${rupees(body.price)}. Students who already paid are not affected.` : "Students who already paid are not affected.",
        request: (pw, extra) => api.patch(`/admin/plans/${f.id}`, { ...body, ...extra }, { headers: { "X-Confirm-Password": pw } }),
      });
    } else {
      if (!/^[a-z][a-z0-9_]{2,31}$/.test(f.key)) return toast.error("Plan id: 3-32 characters, lowercase letters, numbers and _ (start with a letter)");
      secure({
        title: `Create "${f.name}"`,
        summary: `${rupees(body.price)} for ${body.months} month(s). It is created OFF sale - switch it on when you are ready.`,
        request: (pw, extra) => api.post("/admin/plans", { ...body, key: f.key, ...extra }, { headers: { "X-Confirm-Password": pw } }),
      });
    }
  }

  const toggleSale = (p) =>
    secure({
      title: p.active ? `Take "${p.name}" off sale` : `Put "${p.name}" on sale`,
      summary: p.active ? "Students will no longer see or buy this plan. Existing subscribers keep theirs." : `Students will see it at ${rupees(p.price)} straight away.`,
      request: (pw) => api.patch(`/admin/plans/${p._id}/active`, { active: !p.active }, { headers: { "X-Confirm-Password": pw } }),
    });

  const archive = (p, on) =>
    secure({
      title: on ? `Archive "${p.name}"` : `Restore "${p.name}"`,
      summary: on ? "It is hidden from the app and the sale list, but its payment history stays." : "It comes back as an off-sale plan.",
      request: (pw) => api.post(`/admin/plans/${p._id}/archive`, { archive: on }, { headers: { "X-Confirm-Password": pw } }),
    });

  const remove = (p) =>
    secure({
      title: `Delete "${p.name}" for good`,
      summary: "This cannot be undone. A plan that has any payment on record can't be deleted - archive it instead.",
      danger: true,
      request: (pw) => api.delete(`/admin/plans/${p._id}`, { headers: { "X-Confirm-Password": pw } }),
    });

  const perDay = useMemo(() => (form && form.price && form.months ? (Number(form.price) / (Number(form.months) * 30.4)).toFixed(2) : null), [form]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Subscription plans"
        subtitle="The plans students can buy: price, length and discount rules. Every change asks for your password and is written to the activity log. A change only affects new purchases."
        actions={
          <button onClick={openNew} className="rv-btn-primary">
            <RiAddLine size={16} /> New plan
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        {[
          ["On sale", onSale.length, "bg-success"],
          ["Off sale", offSale.length, "bg-slate-soft"],
          ["Archived", archived.length, "bg-warn"],
          ["Revenue, all plans", rupees(revenue), "bg-brand"],
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

      <div className="flex items-center gap-1 border-b border-border mb-4 overflow-x-auto">
        {[
          ["sale", "On sale", onSale.length],
          ["off", "Off sale", offSale.length],
          ["archived", "Archived", archived.length],
          ["log", "Activity log", audit.length],
        ].map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              tab === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"
            }`}
          >
            {label}
            <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums bg-slate-light text-slate">{n}</span>
          </button>
        ))}
      </div>

      {tab === "log" ? (
        <Card className="!p-0 overflow-hidden">
          {audit.length === 0 ? (
            <p className="text-slate-soft text-center py-10">Nothing yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Who</th>
                    <th className="px-4 py-3">What</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3">From</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {audit.map((r) => (
                    <tr key={r._id} className="align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate">{when(r.at)}</td>
                      <td className="px-4 py-3 text-ink-soft">{r.actorName || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={r.ok === false ? "danger" : r.action === "plan.delete" ? "danger" : "brand"}>{ACTION_LABEL[r.action] || r.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate max-w-[360px]">
                        <span className="font-mono text-ink-soft">{r.target && !r.target.startsWith("/") ? r.target : ""}</span> {describeChange(r)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-slate-soft">{r.ip || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <p className="text-slate-soft text-center py-10">Loading...</p>
          ) : shown.length === 0 ? (
            <p className="text-slate-soft text-center py-10">{plans.length === 0 ? 'No plans yet. Press "New plan".' : "Nothing here."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Length</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Discount rules</th>
                    <th className="px-4 py-3">Sold</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft">
                  {shown.map((p) => (
                    <tr key={p._id} className="align-middle hover:bg-slate-light/40 transition-colors">
                      <td className="px-4 py-3 min-w-[170px]">
                        <p className="font-semibold text-ink">
                          {p.name} {p.highlight && <Badge tone="warn">Pre-selected</Badge>}
                        </p>
                        <p className="text-[11px] font-mono text-slate-soft">
                          {p.key}
                          {p.badge ? ` · "${p.badge}"` : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{p.months} month{p.months > 1 ? "s" : ""}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-display font-extrabold text-ink tabular-nums">{rupees(p.price)}</span>
                        {p.mrp ? <span className="text-xs text-slate-soft line-through ml-2 tabular-nums">{rupees(p.mrp)}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate whitespace-nowrap">
                        Credit up to {p.creditPercent}%<br />
                        {p.couponsAllowed ? "Coupons allowed" : "No coupons"}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-slate whitespace-nowrap">
                        {p.sold} sold
                        <br />
                        {rupees(p.revenue)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {!p.archivedAt && (
                            <button
                              onClick={() => toggleSale(p)}
                              className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                                p.active ? "bg-warn-light text-warn hover:opacity-80" : "bg-success-light text-success hover:opacity-80"
                              }`}
                            >
                              {p.active ? "Take off sale" : "Put on sale"}
                            </button>
                          )}
                          {!p.archivedAt && (
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-slate-light text-slate hover:text-ink" title="Edit">
                              <RiEditLine size={16} />
                            </button>
                          )}
                          {p.archivedAt ? (
                            <button onClick={() => archive(p, false)} className="p-1.5 rounded-md hover:bg-slate-light text-slate hover:text-ink" title="Restore">
                              <RiInboxUnarchiveLine size={16} />
                            </button>
                          ) : (
                            <button onClick={() => archive(p, true)} className="p-1.5 rounded-md hover:bg-slate-light text-slate hover:text-ink" title="Archive">
                              <RiArchiveLine size={16} />
                            </button>
                          )}
                          <button onClick={() => remove(p)} className="p-1.5 rounded-md hover:bg-danger-light text-slate-soft hover:text-danger" title="Delete">
                            <RiDeleteBinLine size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <p className="text-xs text-slate-soft mt-5 leading-relaxed">
        What students pay is always taken from this list on the server, never from the phone. Payments already made, and checkouts already open, keep the price and
        length they were created with. A plan with payments on record is archived, not deleted.
      </p>

      {/* ---------------- create / edit ---------------- */}
      {form && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && setForm(null)}>
          <form onSubmit={saveForm} className="rv-card w-full sm:max-w-xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 !rounded-b-none sm:!rounded-b-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-ink text-lg">{form.id ? "Edit plan" : "New plan"}</h3>
              <button type="button" onClick={() => setForm(null)} className="p-1.5 rounded-md hover:bg-slate-light text-slate">
                <RiCloseLine size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="rv-label">Name shown in the app</label>
                <input className="rv-input" value={form.name} onChange={set("name")} placeholder="e.g. 3 Months" maxLength={40} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="rv-label">Plan id {form.id && <span className="text-slate-soft">(fixed)</span>}</label>
                <input
                  className="rv-input font-mono"
                  value={form.key}
                  onChange={(e) => setForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                  disabled={!!form.id}
                  placeholder="e.g. two_year"
                  maxLength={32}
                />
              </div>
              <div>
                <label className="rv-label">Length (months)</label>
                <input type="number" min="1" max="36" className="rv-input" value={form.months} onChange={set("months")} />
              </div>
              <div>
                <label className="rv-label">Price (₹)</label>
                <input type="number" min="1" className="rv-input" value={form.price} onChange={set("price")} />
              </div>
              <div>
                <label className="rv-label">Original price (₹, struck out)</label>
                <input type="number" min="1" className="rv-input" value={form.mrp} onChange={set("mrp")} placeholder="optional" />
              </div>
              <div>
                <label className="rv-label">Badge</label>
                <input className="rv-input" value={form.badge} onChange={set("badge")} placeholder="e.g. 72% OFF" maxLength={24} />
              </div>
              <div>
                <label className="rv-label">Referral credit usable (%)</label>
                <input type="number" min="0" max="100" className="rv-input" value={form.creditPercent} onChange={set("creditPercent")} />
              </div>
              <div>
                <label className="rv-label">Order in the app</label>
                <input type="number" min="0" className="rv-input" value={form.sortOrder} onChange={set("sortOrder")} placeholder="1, 2, 3…" />
              </div>
            </div>

            <div className="flex flex-wrap gap-5 mt-4 text-sm text-ink-soft">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.couponsAllowed} onChange={set("couponsAllowed")} /> Coupons allowed
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.highlight} onChange={set("highlight")} /> Pre-selected in the app
              </label>
            </div>

            {perDay && <p className="text-xs text-slate mt-3">Works out to about ₹{perDay} per day.</p>}

            <div className="flex justify-end gap-2.5 mt-6">
              <button type="button" onClick={() => setForm(null)} className="rv-btn-secondary">
                Cancel
              </button>
              <button type="submit" className="rv-btn-primary">
                <RiShieldKeyholeLine size={15} /> Continue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------- password confirmation ---------------- */}
      {pending && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={submitPending} className="rv-card w-full max-w-md p-6">
            <div className={`w-11 h-11 rounded-full grid place-items-center mb-3 ${pending.danger ? "bg-danger-light text-danger" : "bg-brand/10 text-brand"}`}>
              <RiShieldKeyholeLine size={22} />
            </div>
            <h3 className="font-display font-bold text-ink mb-1">{pending.title}</h3>
            <p className="text-sm text-slate mb-4 leading-relaxed">{pending.summary}</p>
            <label className="rv-label">Confirm with your admin password</label>
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              className="rv-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPassError("");
              }}
            />
            {passError && <p className="text-xs text-danger mt-2">{passError}</p>}
            <div className="flex justify-end gap-2.5 mt-5">
              <button type="button" disabled={busy} onClick={() => setPending(null)} className="rv-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className={pending.danger ? "rv-btn-primary !bg-danger" : "rv-btn-primary"}>
                {busy ? "Working..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
