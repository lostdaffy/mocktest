// Builds the Algebra topics in the fixed chapter order and reports, per
// level, how many questions fail their own check; prints a few samples.
//   node content/alg-check.js quad 1      (topics up to quad; samples of test #1)
const ORDER = ["id", "lin", "quad", "poly", "x1x"];
const upto = process.argv[2] || "x1x";
const sample = Number(process.argv[3] || 0);
for (const name of ORDER) {
  const m = require(`./alg-${name}`);
  const t0 = Date.now();
  const t = m.topic();
  if (name !== upto) continue;
  console.log(`${m.PREFIX}: built in ${Math.round((Date.now() - t0) / 1000)} s`);
  for (const lv of Object.keys(t)) {
    const qs = t[lv].flat();
    let bad = 0;
    for (const q of qs) {
      let ok = false;
      try { ok = q.v(); } catch (e) { /* counted below */ }
      if (!ok) { bad++; if (bad < 4) console.log("BAD", lv, q.q, "|", q.o.join(" / ")); }
    }
    console.log(lv, qs.length, "bad", bad);
  }
  if (sample) for (const lv of Object.keys(t)) { console.log(`\n-- ${lv} #${sample}`); t[lv][sample - 1].slice(0, 10).forEach((x) => console.log(x.q, "|", x.o.join(" / "), "\n   ", x.s)); }
  break;
}
