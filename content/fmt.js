// Writes powers the way the app shows them best: 2^43 → 2⁴³. Only a run of
// digits right after ^ is raised; anything in brackets is left as it is.
const SUP = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
const up = (s) => (typeof s === "string" ? s.replace(/\^(\d+)/g, (_, d) => d.split("").map((c) => SUP[c]).join("")) : s);
const fmt = (x) => ({ ...x, q: up(x.q), qh: up(x.qh), s: up(x.s), sh: up(x.sh), o: x.o.map(up), ...(x.oh ? { oh: x.oh.map(up) } : {}) });
module.exports = { up, fmt };
