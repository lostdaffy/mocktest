import api from "../api/axios";

// The picture part of a chart or figure question, for the review screens.
//
// A chart is drawn here from its numbers - the same numbers the app draws
// from - so what the admin approves is what students see. A figure shows its
// uploaded picture, or says plainly that it is still missing.

const COLORS = ["#6366F1", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#A855F7"];
const fmt = (n) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

export function imageUrl(id) {
  return `${String(api.defaults.baseURL || "").replace(/\/$/, "")}/question-images/${id}`;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / (p / 2)) * (p / 2);
}

function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate">
      {series.map((s, i) => (
        <span key={s.name} className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
          {s.name}
          {s.as ? ` (${s.as})` : ""}
        </span>
      ))}
    </div>
  );
}

function BarLine({ chart }) {
  const W = 520;
  const H = 240;
  const pad = { l: 44, r: 12, t: 12, b: 36 };
  const cats = chart.categories || [];
  const series = chart.series || [];
  const max = niceMax(Math.max(...series.flatMap((s) => s.values), 0));
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const y = (v) => pad.t + ih - (v / max) * ih;
  const band = iw / Math.max(cats.length, 1);
  const bars = chart.type === "line" ? [] : series.filter((s) => chart.type !== "mixed" || s.as !== "line");
  const lines = chart.type === "line" ? series : chart.type === "mixed" ? series.filter((s) => s.as === "line") : [];
  const bw = bars.length ? (band * 0.7) / bars.length : 0;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xl text-slate" role="img" aria-label={chart.title || "chart"}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity="0.15" />
          <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="currentColor">
            {fmt(t)}
          </text>
        </g>
      ))}
      {cats.map((c, i) => (
        <text key={c} x={pad.l + band * (i + 0.5)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="currentColor">
          {c}
        </text>
      ))}
      {bars.map((s, si) =>
        s.values.map((v, i) => {
          const x = pad.l + band * i + band * 0.15 + bw * si;
          const color = COLORS[series.indexOf(s) % COLORS.length];
          return (
            <g key={`${s.name}-${i}`}>
              <rect x={x} y={y(v)} width={bw - 2} height={pad.t + ih - y(v)} fill={color} rx="2" />
              <text x={x + (bw - 2) / 2} y={y(v) - 3} textAnchor="middle" fontSize="10" fill="currentColor">
                {fmt(v)}
              </text>
            </g>
          );
        })
      )}
      {lines.map((s) => {
        const color = COLORS[series.indexOf(s) % COLORS.length];
        const pts = s.values.map((v, i) => [pad.l + band * (i + 0.5), y(v)]);
        return (
          <g key={s.name}>
            <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth="2.5" />
            {pts.map(([px, py], i) => (
              <g key={i}>
                <circle cx={px} cy={py} r="3.5" fill={color} />
                <text x={px} y={py - 7} textAnchor="middle" fontSize="10" fill="currentColor">
                  {fmt(s.values[i])}
                </text>
              </g>
            ))}
          </g>
        );
      })}
      <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="currentColor" strokeOpacity="0.5" />
    </svg>
  );
}

function Pie({ chart }) {
  const s = chart.series?.[0];
  if (!s) return null;
  const total = s.values.reduce((a, b) => a + b, 0) || 1;
  let a = -Math.PI / 2;
  const R = 90;
  const cx = 110;
  const cy = 105;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 220 210" className="w-56" role="img" aria-label={chart.title || "pie chart"}>
        {s.values.map((v, i) => {
          const da = (v / total) * Math.PI * 2;
          const x1 = cx + R * Math.cos(a);
          const y1 = cy + R * Math.sin(a);
          a += da;
          const x2 = cx + R * Math.cos(a);
          const y2 = cy + R * Math.sin(a);
          const large = da > Math.PI ? 1 : 0;
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />;
        })}
      </svg>
      <ul className="text-sm space-y-1">
        {chart.categories.map((c, i) => (
          <li key={c} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-ink">{c}</span>
            <span className="text-slate">
              {fmt(s.values[i])} ({fmt((s.values[i] / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Table({ chart }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-sm border border-border-soft">
        <thead>
          <tr className="bg-slate-light">
            <th className="px-3 py-1.5 text-left" />
            {chart.series.map((s) => (
              <th key={s.name} className="px-3 py-1.5 text-right font-semibold text-ink">
                {s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.categories.map((c, i) => (
            <tr key={c} className="border-t border-border-soft">
              <td className="px-3 py-1.5 font-medium text-ink">{c}</td>
              {chart.series.map((s) => (
                <td key={s.name} className="px-3 py-1.5 text-right text-ink-soft">
                  {fmt(s.values[i])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartView({ chart }) {
  if (!chart) return null;
  return (
    <div className="rounded-lg border border-border-soft p-3 bg-surface">
      {(chart.title || chart.unit) && (
        <p className="text-sm font-semibold text-ink mb-2">
          {chart.title}
          {chart.unit && <span className="font-normal text-slate"> ({chart.unit})</span>}
        </p>
      )}
      {chart.type === "caselet" ? (
        <p className="text-sm text-ink-soft whitespace-pre-line">{chart.caselet}</p>
      ) : chart.type === "pie" ? (
        <Pie chart={chart} />
      ) : chart.type === "table" ? (
        <Table chart={chart} />
      ) : (
        <>
          <BarLine chart={chart} />
          <Legend series={chart.series || []} />
        </>
      )}
    </div>
  );
}

export default function QuestionVisual({ q, className = "" }) {
  const v = q?.visual;
  if (!v?.kind) return null;
  if (v.kind === "chart") {
    return (
      <div className={className}>
        <ChartView chart={v.chart} />
        {v.formula && <p className="text-[11px] text-slate-soft mt-1">Answer checked by computer: {v.formula}</p>}
      </div>
    );
  }
  const id = v.figure?.imageId;
  return (
    <div className={className}>
      {id ? (
        <img src={imageUrl(id)} alt="Figure for this question" className="max-w-full max-h-72 rounded border border-border-soft bg-white" />
      ) : (
        <p className="text-sm text-warn bg-warn-light border border-warn-border rounded-lg px-3 py-2 inline-block">
          Picture not uploaded yet - see Images pending.
        </p>
      )}
      {v.figure?.answerCheck === "by_eye" && (
        <p className="text-[11px] text-warn mt-1">This kind of figure cannot be checked by computer - check the answer by eye.</p>
      )}
    </div>
  );
}
