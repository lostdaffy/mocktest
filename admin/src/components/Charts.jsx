import { useMemo, useRef, useState } from "react";

// Small, dependency-free charts for the dashboard. Inline SVG drawn into a
// fixed viewBox and stretched to the card's width; text and the tooltip are
// HTML so they stay crisp and use the panel's own theme tokens.
//
// Colour: one series = the brand colour; two series = brand + orange (checked
// with the dataviz validator: CVD ΔE 30, normal-vision ΔE 39, both >= 3:1).
// Values and labels are always in ink colours, never the series colour.

const W = 600;
const H = 200;
const PAD = { l: 34, r: 8, t: 10, b: 24 };

const shortDate = (k) => new Date(k + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const niceMax = (v) => {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return v;
};

function Axes({ max, n, data, format }) {
  const ticks = [0, max / 2, max];
  const every = Math.ceil(n / 6);
  const xw = (W - PAD.l - PAD.r) / n;
  return (
    <>
      {ticks.map((t) => {
        const y = PAD.t + (H - PAD.t - PAD.b) * (1 - t / max);
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} className="stroke-border" strokeWidth="1" strokeDasharray={t ? "3 4" : ""} />
            <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" className="fill-slate-soft" fontSize="10">
              {format(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) =>
        i % every === 0 || i === n - 1 ? (
          <text key={d.date} x={PAD.l + xw * (i + 0.5)} y={H - 7} textAnchor="middle" className="fill-slate-soft" fontSize="10">
            {shortDate(d.date)}
          </text>
        ) : null
      )}
    </>
  );
}

function Tooltip({ x, children }) {
  if (x == null) return null;
  const left = Math.min(Math.max(x * 100, 8), 92);
  return (
    <div
      className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs shadow-lg"
      style={{ left: `${left}%` }}
    >
      {children}
    </div>
  );
}

/** One value per day as bars. */
export function DailyBars({ data, valueKey, format = (v) => v, label, emptyText = "Nothing yet in this period" }) {
  const [hover, setHover] = useState(null);
  const n = data.length;
  const max = niceMax(Math.max(0, ...data.map((d) => d[valueKey])));
  const xw = (W - PAD.l - PAD.r) / n;
  const bw = Math.max(2, xw - 2); // a 2px gap between bars
  const ih = H - PAD.t - PAD.b;
  const allZero = data.every((d) => !d[valueKey]);

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={label}>
        <Axes max={max} n={n} data={data} format={format} />
        {data.map((d, i) => {
          const v = d[valueKey];
          const h = (v / max) * ih;
          const x = PAD.l + xw * i + (xw - bw) / 2;
          const y = PAD.t + ih - h;
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* hit target: the whole column, bigger than the bar */}
              <rect x={PAD.l + xw * i} y={PAD.t} width={xw} height={ih} fill="transparent" />
              {v > 0 && (
                <path
                  d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${y + h} Z`}
                  className={`fill-brand transition-opacity ${hover != null && hover !== i ? "opacity-40" : ""}`}
                />
              )}
            </g>
          );
        })}
      </svg>
      {allZero && <p className="absolute inset-0 grid place-items-center text-sm text-slate-soft">{emptyText}</p>}
      {hover != null && (
        <Tooltip x={(PAD.l + xw * (hover + 0.5)) / W}>
          <p className="text-slate">{shortDate(data[hover].date)}</p>
          <p className="font-semibold text-ink">{format(data[hover][valueKey])}</p>
        </Tooltip>
      )}
    </div>
  );
}

/** Two or more daily series on one (shared) count axis, with a crosshair. */
export function DailyLines({ data, series, label }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const n = data.length;
  const max = niceMax(Math.max(0, ...data.flatMap((d) => series.map((s) => d[s.key]))));
  const xw = (W - PAD.l - PAD.r) / n;
  const ih = H - PAD.t - PAD.b;
  const px = (i) => PAD.l + xw * (i + 0.5);
  const py = (v) => PAD.t + ih * (1 - v / max);

  const paths = useMemo(
    () => series.map((s) => data.map((d, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(d[s.key]).toFixed(1)}`).join(" ")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, series, max]
  );

  function onMove(e) {
    const box = ref.current.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.floor((x - PAD.l) / xw))));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-2 text-xs text-slate">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={`inline-block w-3 h-[3px] rounded-full ${s.swatch}`} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={label}>
          <Axes max={max} n={n} data={data} format={(v) => Math.round(v)} />
          {hover != null && <line x1={px(hover)} x2={px(hover)} y1={PAD.t} y2={PAD.t + ih} className="stroke-slate-soft" strokeWidth="1" />}
          {series.map((s, k) => (
            <path key={s.key} d={paths[k]} fill="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className={s.stroke} />
          ))}
          {hover != null &&
            series.map((s) => (
              <circle key={s.key} cx={px(hover)} cy={py(data[hover][s.key])} r="4" strokeWidth="2" className={`${s.dot} stroke-surface`} />
            ))}
        </svg>
        {hover != null && (
          <Tooltip x={px(hover) / W}>
            <p className="text-slate mb-0.5">{shortDate(data[hover].date)}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5 text-ink">
                <span className={`inline-block w-2 h-2 rounded-full ${s.swatch}`} />
                {s.label}: <b>{data[hover][s.key]}</b>
              </p>
            ))}
          </Tooltip>
        )}
      </div>
    </div>
  );
}

/** Ranked horizontal bars - for "which exam", "which kind of test". */
export function RankBars({ rows, format = (v) => v, emptyText = "No data yet" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-slate-soft py-6 text-center">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="group" title={`${r.label}: ${format(r.value)}`}>
          <div className="flex justify-between gap-3 text-[13px] mb-1">
            <span className="text-ink-soft truncate">{r.label}</span>
            <span className="text-ink font-semibold tabular-nums shrink-0">
              {format(r.value)}
              {r.sub && <span className="text-slate-soft font-normal"> · {r.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-light overflow-hidden">
            <div className="h-full rounded-full bg-brand group-hover:bg-brand-dark transition-colors" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
