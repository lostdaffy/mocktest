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

      {summary && (summary.byPlan.length > 0 || summary.coupons.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-6 text-xs">
          {summary.byPlan.map((p) => (
            <Badge key={p.plan} tone="neutral">
              {PLAN[p.plan] || p.plan}: {p.count} · {rupees(p.amount)}
            </Badge>
          ))}
          {summary.coupons.map((c) => (
            <Badge key={c.code} tone="brand">
              {c.code}: used {c.count}×
            </Badge>
          ))}
          {summary.grants > 0 && <Badge tone="info">Free grants: {summary.grants}</Badge>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <RiSearchLine size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-soft" />
          <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Phone, name, coupon, or Razorpay order/payment id" className="!pl-10" />
        </div>
        <Select value={kind} onChange={(e) => setKind(e.target.value)} className="!w-auto min-w-[150px] text-sm">
          <option value="">All orders</option>
          <option value="paid">Paid</option>
          <option value="grant">Free grants</option>
          <option value="pending">Not completed</option>
        </Select>
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
        <div className="space-y-2.5">
          {items.map((s) => (
            <Card key={s._id} className="!p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-ink">{s.user?.name || "Deleted account"}</p>
                    <Badge tone={KIND[s.kind].tone}>{KIND[s.kind].label}</Badge>
                    {s.couponCode && <Badge tone="brand">{s.couponCode}</Badge>}
                  </div>
                  <p className="text-sm text-slate">
                    {s.user?.phone || "—"}
                    {s.user?.email ? ` · ${s.user.email}` : ""}
                  </p>
                  <p className="text-xs text-slate-soft mt-1">
                    {when(s.createdAt)} · {PLAN[s.plan] || s.plan}
                    {s.kind !== "pending" && s.endDate ? ` · valid till ${new Date(s.endDate).toLocaleDateString("en-IN")}` : ""}
                    {s.creditsUsed ? ` · ₹${s.creditsUsed} referral credit used` : ""}
                  </p>
                  {(s.razorpayPaymentId || s.razorpayOrderId) && (
                    <p className="text-[11px] text-slate-soft mt-1 font-mono break-all">
                      {s.razorpayPaymentId ? (
                        <a
                          href={`https://dashboard.razorpay.com/app/payments/${s.razorpayPaymentId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-brand"
                        >
                          {s.razorpayPaymentId} <RiExternalLinkLine size={11} />
                        </a>
                      ) : (
                        s.razorpayOrderId
                      )}
                    </p>
                  )}
                </div>
                <p className={`font-display text-lg font-bold ${s.kind === "paid" ? "text-ink" : "text-slate-soft"}`}>{rupees(s.amount)}</p>
              </div>
            </Card>
          ))}
        </div>
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
