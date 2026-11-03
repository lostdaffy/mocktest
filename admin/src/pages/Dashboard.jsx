import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RiFileList3Line,
  RiBookOpenLine,
  RiQuestionnaireLine,
  RiFlag2Line,
  RiFolderLine,
  RiBroadcastLine,
  RiArrowRightLine,
  RiFilePaperLine,
  RiCoupon3Line,
  RiGroupLine,
  RiMoneyRupeeCircleLine,
  RiVipCrownLine,
  RiDatabase2Line,
  RiUserAddLine,
  RiPulseLine,
  RiTaskLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiRefreshLine,
} from "@remixicon/react";
import api from "../api/axios";
import { PageHeader, Alert, Card } from "../components/ui";
import { DailyBars, DailyLines, RankBars } from "../components/Charts";

const RANGES = [7, 30, 90];
const rupees = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const num = (n) => Number(n || 0).toLocaleString("en-IN");
const PLAN = { monthly: "1 month", quarterly: "3 months", half_yearly: "6 months", yearly: "12 months" };
const TEST_TYPE = {
  practice: "Chapter practice",
  full_mock: "Full mock",
  revision: "Weekly revision",
  pyq: "Previous year paper",
  live: "Live exam",
  topic_wise: "Daily test",
  sectional: "Sectional",
};
const EXAM = {
  SSC_CGL: "SSC CGL", SSC_CHSL: "SSC CHSL", SSC_MTS: "SSC MTS", SSC_GD: "SSC GD", RAILWAY: "RRB NTPC", RRB_NTPC: "RRB NTPC", RRB_GROUP_D: "RRB Group D",
  UP_POLICE: "UP Police", UPSSSC_PET: "UPSSSC PET", BANKING: "IBPS PO", CTET: "CTET", UPTET: "UPTET", SUPER_TET: "Super TET",
  AGNIVEER_GD: "Agniveer GD", AGNIVEER_TECHNICAL: "Agniveer Technical",
};
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function Dashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [slow, setSlow] = useState(false);

  async function load(d = days) {
    setLoading(true);
    setLoadError("");
    // The free hosting plan sleeps after fifteen minutes idle and takes
    // 30-50 seconds to wake. Saying so beats a screen of blanks.
    const sayItIsSlow = setTimeout(() => setSlow(true), 4000);
    try {
      // A sleeping or restarting server drops the first requests outright
      // (no response at all). Keep asking for about a minute before giving
      // up; a real error (a response with a status) is not retried.
      let a;
      for (let tryNo = 0; ; tryNo++) {
        try {
          a = await api.get("/admin/analytics", { params: { days: d } });
          break;
        } catch (err) {
          if (err.response || tryNo >= 11) throw err;
          setSlow(true);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      setData(a.data);
      const s = await api.get("/questions/stats").catch(() => null);
      if (s) setStats(s.data);
    } catch (err) {
      setLoadError(
        err.response
          ? `The server answered with an error (${err.response.status}). ${err.response.data?.message || ""}`
          : "Couldn't reach the server after a minute of trying. Check your internet, then use the refresh button."
      );
    } finally {
      clearTimeout(sayItIsSlow);
      setSlow(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const r = data?.range;
  const p = data?.previous;
  const daily = data?.daily || [];

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        subtitle="Students, revenue and activity over time, and the state of your content."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5" role="group" aria-label="Period">
              {RANGES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                    days === d ? "bg-brand text-white" : "text-slate hover:text-ink"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
            <button onClick={() => load(days)} className="rv-btn-secondary !px-2.5 !py-1.5" aria-label="Refresh" title="Refresh">
              <RiRefreshLine size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </>
        }
      />

      {slow && loading && (
        <div className="rv-card p-3 mb-6 text-sm text-slate">
          Waking the server up — on the free hosting plan the first request of the day takes up to a minute.
        </div>
      )}
      {loadError && (
        <Alert tone="warn" className="mb-6">
          {loadError}
        </Alert>
      )}

      {/* HERO: money and students, all time */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-dark via-brand to-[#8455E6] text-white p-6 sm:p-7 mb-6 shadow-brand">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full border-[44px] border-white/[0.06] pointer-events-none" />
        <div className="absolute -bottom-24 right-40 w-52 h-52 rounded-full border-[32px] border-white/[0.05] pointer-events-none" />
        <div className="relative z-10 grid gap-6 sm:grid-cols-[1.2fr_1fr] items-end">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.14em] text-white/70 mb-1.5">REVENUE · ALL TIME</p>
            <p className="font-display text-4xl sm:text-[44px] leading-none font-extrabold tabular-nums">{data ? rupees(data.totals.revenueAll) : "—"}</p>
            <p className="text-sm text-white/75 mt-2">
              {data ? `${num(data.totals.paymentsAll)} paid order${data.totals.paymentsAll === 1 ? "" : "s"} · free grants not counted` : " "}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-white/[0.1] border border-white/15 p-3">
            {[
              ["Students", data?.totals.students],
              ["Premium now", data?.totals.premium],
              ["Paid %", data ? `${pct(data.totals.premium, data.totals.students)}%` : null],
            ].map(([label, v]) => (
              <div key={label} className="text-center">
                <p className="font-display text-xl font-extrabold tabular-nums">{v ?? "—"}</p>
                <p className="text-[10px] text-white/70 font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs for the chosen period, with the change from the period before */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Kpi label="Revenue" icon={RiMoneyRupeeCircleLine} tone="text-success bg-success-light" value={r && rupees(r.revenue)} now={r?.revenue} before={p?.revenue} days={days} loading={!data} />
        <Kpi label="New students" icon={RiUserAddLine} tone="text-brand bg-brand/10" value={r && num(r.signups)} now={r?.signups} before={p?.signups} days={days} loading={!data} />
        <Kpi label="Active students" hint="took at least one test" icon={RiPulseLine} tone="text-info bg-info-light" value={r && num(r.active)} now={r?.active} before={p?.active} days={days} loading={!data} />
        <Kpi label="Tests submitted" icon={RiTaskLine} tone="text-warn bg-warn-light" value={r && num(r.attempts)} now={r?.attempts} before={p?.attempts} days={days} loading={!data} />
      </div>

      {/* CHARTS */}
      <div className="grid gap-4 lg:grid-cols-2 mb-4">
        <ChartCard title="Revenue per day" sub={r ? `${rupees(r.revenue)} from ${num(r.payments)} payment(s)` : ""}>
          {data && <DailyBars data={daily} valueKey="revenue" format={rupees} label="Revenue per day" emptyText="No payments in this period" />}
        </ChartCard>
        <ChartCard title="Students per day" sub="New sign-ups and students who took a test">
          {data && (
            <DailyLines
              data={daily}
              label="New and active students per day"
              series={[
                { key: "signups", label: "New sign-ups", stroke: "stroke-brand", dot: "fill-brand", swatch: "bg-brand" },
                { key: "active", label: "Active students", stroke: "stroke-[#eb6834] dark:stroke-[#d95926]", dot: "fill-[#eb6834] dark:fill-[#d95926]", swatch: "bg-[#eb6834] dark:bg-[#d95926]" },
              ]}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-4">
        <ChartCard title="Tests submitted per day" className="lg:col-span-2" sub={r ? `${num(r.attempts)} in ${days} days` : ""}>
          {data && <DailyBars data={daily} valueKey="attempts" format={num} label="Tests submitted per day" emptyText="No tests submitted in this period" />}
        </ChartCard>
        <ChartCard title="What students take" sub={`Tests submitted, last ${days} days`}>
          {data && (
            <RankBars
              rows={data.testTypes.map((t) => ({ label: TEST_TYPE[t.type] || t.type, value: t.attempts }))}
              format={num}
              emptyText="No tests submitted in this period"
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        <ChartCard title="Students by exam" sub="Exam chosen at sign-up (a student can pick several)">
          {data && <RankBars rows={data.examGoals.map((e) => ({ label: EXAM[e.exam] || e.exam, value: e.students }))} format={num} />}
        </ChartCard>
        <ChartCard title={`New students → paid`} sub={`Students who joined in the last ${days} days`}>
          {data && <Funnel f={data.funnel} />}
        </ChartCard>
        <ChartCard title="Plans sold" sub="All time, paid orders only">
          {data && (
            <RankBars
              rows={data.planMix.map((x) => ({ label: PLAN[x.plan] || x.plan, value: x.amount, sub: `${x.count} sold` }))}
              format={rupees}
              emptyText="No plan sold yet"
            />
          )}
        </ChartCard>
      </div>

      {/* CONTENT */}
      <h2 className="font-display text-lg font-bold text-ink mb-3">Content</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <MiniStat icon={RiDatabase2Line} label="Published questions" value={data && num(data.content.questions)} />
        <MiniStat icon={RiBookOpenLine} label="Practice tests live" value={data && num(data.content.practice)} />
        <MiniStat icon={RiFileList3Line} label="Mock tests live" value={data && num(data.content.mocks)} />
        <MiniStat
          icon={RiFlag2Line}
          label="Open reports"
          value={stats ? num(stats.openReports) : null}
          to="/reports"
          alert={stats?.openReports > 0}
        />
      </div>

      {/* QUICK ACTIONS */}
      <h2 className="font-display text-lg font-bold text-ink mb-3">Quick actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          ["/exam-series", RiFileList3Line, "Mock series"],
          ["/practice-series", RiBookOpenLine, "Subject practice"],
          ["/pyq-bank", RiFilePaperLine, "PYQ bank"],
          ["/questions", RiQuestionnaireLine, "Questions"],
          ["/live-exams", RiBroadcastLine, "Live exams"],
          ["/reports", RiFlag2Line, "Reports"],
          ["/subjects", RiFolderLine, "Subjects"],
          ["/coupons", RiCoupon3Line, "Coupons"],
          ["/users", RiGroupLine, "Users"],
          ["/payments", RiVipCrownLine, "Payments"],
        ].map(([to, Icon, title]) => (
          <Card key={to} as={Link} to={to} hover className="group !p-3.5 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-sm bg-brand/10 text-brand grid place-items-center shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
              <Icon size={17} />
            </span>
            <span className="text-[13.5px] font-semibold text-ink group-hover:text-brand truncate">{title}</span>
            <RiArrowRightLine size={14} className="ml-auto text-slate-soft opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, hint, icon: Icon, tone, value, now, before, days, loading }) {
  const change = before ? Math.round(((now - before) / before) * 100) : null;
  const up = now > before;
  const same = now === before;
  return (
    <Card className="!p-4 sm:!p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-slate">
          {label}
          {hint && <span className="block text-[11px] text-slate-soft font-normal">{hint}</span>}
        </p>
        <span className={`w-9 h-9 rounded-sm grid place-items-center shrink-0 ${tone}`}>
          <Icon size={18} />
        </span>
      </div>
      {loading ? (
        <div className="h-8 mt-2 w-20 rounded bg-slate-light animate-pulse" />
      ) : (
        <p className="font-display text-[26px] sm:text-[28px] leading-tight font-extrabold text-ink mt-1.5 tabular-nums">{value}</p>
      )}
      {!loading && (
        <p className="text-xs mt-1.5 flex items-center gap-1 text-slate-soft">
          {same ? (
            <span>Same as the {days} days before</span>
          ) : (
            <>
              <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-success" : "text-danger"}`}>
                {up ? <RiArrowUpLine size={13} /> : <RiArrowDownLine size={13} />}
                {change == null ? "new" : `${Math.abs(change)}%`}
              </span>
              <span>vs previous {days} days</span>
            </>
          )}
        </p>
      )}
    </Card>
  );
}

function ChartCard({ title, sub, children, className = "" }) {
  return (
    <Card className={`!p-5 ${className}`}>
      <div className="mb-3">
        <h3 className="font-semibold text-ink">{title}</h3>
        {sub && <p className="text-xs text-slate-soft mt-0.5">{sub}</p>}
      </div>
      {children || <div className="h-[180px] rounded-md bg-slate-light/60 animate-pulse" />}
    </Card>
  );
}

function Funnel({ f }) {
  const steps = [
    ["Joined", f.joined],
    ["Took a test", f.tookTest],
    ["Bought a plan", f.paid],
  ];
  if (!f.joined) return <p className="text-sm text-slate-soft py-6 text-center">No new students in this period</p>;
  return (
    <ol className="space-y-3">
      {steps.map(([label, v], i) => (
        <li key={label}>
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-ink-soft">
              {i + 1}. {label}
            </span>
            <span className="text-ink font-semibold tabular-nums">
              {num(v)} <span className="text-slate-soft font-normal">· {pct(v, f.joined)}%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-light overflow-hidden">
            <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(pct(v, f.joined), v ? 2 : 0)}%`, opacity: 1 - i * 0.22 }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function MiniStat({ icon: Icon, label, value, to, alert }) {
  const body = (
    <>
      <span className={`w-10 h-10 rounded-sm grid place-items-center shrink-0 ${alert ? "bg-danger-light text-danger" : "bg-slate-light text-slate"}`}>
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="font-display text-xl font-extrabold text-ink tabular-nums">{value ?? "—"}</p>
        <p className="text-xs text-slate truncate">{label}</p>
      </div>
    </>
  );
  return to ? (
    <Card as={Link} to={to} hover className="!p-4 flex items-center gap-3">
      {body}
    </Card>
  ) : (
    <Card className="!p-4 flex items-center gap-3">{body}</Card>
  );
}
