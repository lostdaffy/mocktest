import { useEffect, useRef, useState } from "react";
import {
  RiMoneyRupeeCircleLine,
  RiCalendarLine,
  RiLineChartLine,
  RiTimeLine,
  RiDownloadLine,
  RiSearchLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, StatCard, Card, Badge, Select, Input, Button, EmptyState } from "../components/ui";
import { useToast } from "../components/Toast";
import { DailyBars, RankBars } from "../components/Charts";

// Every order a student started, what it came to, and the totals. Refunds
// are done in the Razorpay dashboard; this is where to see who paid.
const KIND = {
  paid: { label: "Paid", tone: "success" },
  grant: { label: "Free grant", tone: "info" },
  pending: { label: "Not completed", tone: "warn" },
};
const PLAN = { monthly: "1 month", quarterly: "3 months", half_yearly: "6 months", yearly: "12 months" };
const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const when = (d) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function Payments() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [daily, setDaily] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [paidInView, setPaidInView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [kind, setKind] = useState("");
  const [plan, setPlan] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const debounce = useRef(null);

  const params = (p = page, term = q) => ({ page: p, kind: kind || undefined, plan: plan || undefined, from: from || undefined, to: to || undefined, q: term.trim() || undefined });

  async function load(p = 1, term = q) {
    setLoading(true);
    try {
      const res = await api.get("/admin/payments", { params: params(p, term) });
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
      setPage(res.data.page || p);
      setPages(res.data.pages || 1);
      setPaidInView(res.data.paidInView || null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't load payments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get("/admin/payments/summary").then((res) => setSummary(res.data)).catch(() => {});
    api.get("/admin/analytics", { params: { days: 30 } }).then((res) => setDaily(res.data.daily)).catch(() => {});
  }, []);

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, plan, from, to]);

  function onSearch(v) {
    setQ(v);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(1, v), 400);
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await api.get("/admin/payments/export", { params: { ...params(1), page: undefined }, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `rankveer-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export");
    } finally {
      setExporting(false);
    }
  }

  const filtered = kind || plan || from || to || q.trim();

  return (
    <div>
      <PageHeader
        eyebrow="Billing"
        title="Payments"
        subtitle="Every subscription order: who paid, free plans you gave, and orders that were started but never paid. Refunds are done in the Razorpay dashboard."
        actions={
          <Button variant="secondary" icon={RiDownloadLine} loading={exporting} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Today" value={summary ? rupees(summary.today.amount) : "—"} hint={summary ? `${summary.today.count} payment(s)` : ""} icon={RiMoneyRupeeCircleLine} tone="success" loading={!summary} />
        <StatCard label="This month" value={summary ? rupees(summary.month.amount) : "—"} hint={summary ? `${summary.month.count} payment(s)` : ""} icon={RiCalendarLine} loading={!summary} />
        <StatCard label="All time" value={summary ? rupees(summary.all.amount) : "—"} hint={summary ? `${summary.all.count} payment(s)` : ""} icon={RiLineChartLine} tone="info" loading={!summary} />
        <StatCard
          label="Not completed (7 days)"
          value={summary ? summary.pendingWeek : "—"}
          hint="Opened the payment and did not pay"
          icon={RiTimeLine}
          tone="warn"
          loading={!summary}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-5">
        <Card className="lg:col-span-2 !p-5">
          <h3 className="font-semibold text-ink">Revenue per day</h3>
          <p className="text-xs text-slate-soft mb-3">Last 30 days, real payments only (free grants are not money)</p>
          {daily ? <DailyBars data={daily} valueKey="revenue" format={rupees} label="Revenue per day" emptyText="No payments in the last 30 days" /> : <div className="h-[180px] rounded-md bg-slate-light/60 animate-pulse" />}
        </Card>
        <Card className="!p-5">
          <h3 className="font-semibold text-ink">Plans sold</h3>
          <p className="text-xs text-slate-soft mb-3">All time, by amount</p>
          {summary ? (
            <RankBars rows={summary.byPlan.map((x) => ({ label: PLAN[x.plan] || x.plan, value: x.amount, sub: `${x.count} sold` }))} format={rupees} emptyText="No plan sold yet" />
          ) : (
            <div className="h-[120px] rounded-md bg-slate-light/60 animate-pulse" />
          )}
          {summary && (summary.coupons.length > 0 || summary.grants > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border-soft text-xs">
              {summary.coupons.map((c) => (
                <Badge key={c.code} tone="brand">
                  {c.code}: used {c.count}×
                </Badge>
              ))}
              {summary.grants > 0 && <Badge tone="info">Free grants: {summary.grants}</Badge>}
            </div>
          )}
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border mb-4">
        {[["", "All orders"], ["paid", "Paid"], ["grant", "Free grants"], ["pending", "Not completed"]].map(([key, label]) => (
          <button
            key={key || "all"}
            onClick={() => setKind(key)}
            className={`px-4 py-2.5 -mb-px text-sm font-semibold border-b-2 transition-colors ${kind === key ? "border-brand text-brand" : "border-transparent text-slate hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-soft" />
          <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Phone, name, coupon, or Razorpay order/payment id" className="!pl-10" />
        </div>
        <Select value={plan} onChange={(e) => setPlan(e.target.value)} className="!w-auto min-w-[130px] text-sm">
          <option value="">All plans</option>
          {Object.entries(PLAN).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!w-auto text-sm" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!w-auto text-sm" aria-label="To date" />
        {filtered && (
          <button
            onClick={() => {
              setKind("");
              setPlan("");
              setFrom("");
              setTo("");
              setQ("");
              load(1, "");
            }}
            className="text-sm text-slate hover:text-ink"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-slate-soft mb-3">
        {total} order(s){paidInView ? ` · ${paidInView.count} paid in this view, ${rupees(paidInView.amount)}` : ""}
      </p>

      {loading ? (
        <p className="text-slate-soft text-center py-10">Loading...</p>
      ) : items.length === 0 ? (
        <EmptyState icon={RiMoneyRupeeCircleLine} title={filtered ? "No order matches" : "No orders yet"} text={filtered ? "Try other filters." : "Orders show here as soon as a student opens a payment."} />
      ) : (
        // One row per order, so a page of them fits on one screen.
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-light/60 text-left text-[11px] font-semibold uppercase tracking-wide text-slate">
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Razorpay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {items.map((s) => (
                  <tr key={s._id} className="align-top hover:bg-slate-light/40 transition-colors">
                    <td className="px-4 py-3 text-slate whitespace-nowrap tabular-nums">{when(s.createdAt)}</td>
                    <td className="px-4 py-3 min-w-[170px]">
                      <p className="font-semibold text-ink">{s.user?.name || "Deleted account"}</p>
                      <p className="text-xs text-slate tabular-nums">{s.user?.phone || "—"}</p>
                      {s.user?.email && <p className="text-xs text-slate-soft break-all">{s.user.email}</p>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-ink-soft">{PLAN[s.plan] || s.plan}</p>
                      {s.kind !== "pending" && s.endDate && (
                        <p className="text-xs text-slate-soft">till {new Date(s.endDate).toLocaleDateString("en-IN")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={KIND[s.kind].tone}>{KIND[s.kind].label}</Badge>
                        {s.couponCode && <Badge tone="brand">{s.couponCode}</Badge>}
                      </div>
                      {s.creditsUsed ? <p className="text-xs text-slate-soft mt-1">₹{s.creditsUsed} credit used</p> : null}
                    </td>
                    <td className={`px-4 py-3 text-right font-display font-bold whitespace-nowrap tabular-nums ${s.kind === "paid" ? "text-ink" : "text-slate-soft"}`}>
                      {rupees(s.amount)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-soft font-mono">
                      {s.razorpayPaymentId ? (
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${s.razorpayPaymentId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-brand whitespace-nowrap"
                        >
                          {s.razorpayPaymentId} <RiExternalLinkLine size={11} />
                        </a>
                      ) : (
                        <span className="break-all">{s.razorpayOrderId || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => load(page - 1)}
            disabled={page <= 1 || loading}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-slate-light"
            aria-label="Previous page"
          >
            <RiArrowLeftSLine size={18} />
          </button>
          <span className="text-sm text-slate">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => load(page + 1)}
            disabled={page >= pages || loading}
            className="w-9 h-9 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-slate-light"
            aria-label="Next page"
          >
            <RiArrowRightSLine size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
