import { useEffect, useState } from "react";

const pad = (n) => String(n).padStart(2, "0");

// Purely illustrative "starts in" timer for the live-exam card. It loops, so
// it never reaches zero and sits there looking broken. The first render
// shows the same starting time on the server and in the browser, so it
// hydrates cleanly before it starts ticking.
export default function Countdown({ seconds = 760 }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : seconds)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const parts = [
    [Math.floor(remaining / 3600), "hrs"],
    [Math.floor((remaining % 3600) / 60), "min"],
    [remaining % 60, "sec"],
  ];

  return (
    <div className="mt-2.5 grid grid-cols-3 gap-2.5 text-center">
      {parts.map(([value, label]) => (
        <div key={label} className="rounded-md border border-white/10 bg-white/[0.08] px-2 py-3.5">
          <b className="block font-display text-[clamp(28px,4vw,36px)] font-bold leading-none tabular-nums">{pad(value)}</b>
          <span className="mt-1.5 block text-xs text-white/60">{label}</span>
        </div>
      ))}
    </div>
  );
}
