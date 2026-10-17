// A readable page of a batch, to look at before it is uploaded.
//   node content/preview.js content/<batch>.js content/<batch>-preview.html
const fs = require("fs");
const path = require("path");
const qs = require(path.resolve(process.argv[2]));
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const cards = qs.map((x, i) => {
  let ok = false;
  try { ok = x.v() === true; } catch {}
  const oh = x.oh || x.o;
  return `<div class="q">
  <div class="n">${i + 1}. <span class="t">${esc(x.t)}</span> ${ok ? '<span class="ok">✔ checked in code</span>' : '<span class="bad">✘ check failed</span>'}</div>
  <p><b>${esc(x.q)}</b><br><span class="hi">${esc(x.qh)}</span></p>
  <ol type="A">${x.o.map((o, k) => `<li class="${k === x.a ? "right" : ""}">${esc(o)}${oh[k] !== o ? ` <span class="hi">/ ${esc(oh[k])}</span>` : ""}${k === x.a ? " ✔" : ""}</li>`).join("")}</ol>
  <p class="sol"><b>Solution:</b> ${esc(x.s)}<br><span class="hi">${esc(x.sh)}</span></p>
</div>`;
}).join("\n");
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Question batch preview</title>
<style>
:root { --bg:#fff; --ink:#1b1b1f; --soft:#5d5f6b; --line:#e3e4ea; --ok:#127a3a; --okbg:#e7f6ec; --bad:#b42318; }
@media (prefers-color-scheme: dark) { :root { --bg:#16171b; --ink:#ececf1; --soft:#a3a6b3; --line:#2c2e36; --ok:#5dd38c; --okbg:#173524; --bad:#ff8a80; } }
body { background:var(--bg); color:var(--ink); font:15px/1.55 system-ui, sans-serif; margin:0; padding:16px; }
h1 { font-size:18px; } .q { border:1px solid var(--line); border-radius:8px; padding:12px 14px; margin:0 0 12px; }
.n { font-size:13px; color:var(--soft); } .t { font-weight:600; } .ok { color:var(--ok); } .bad { color:var(--bad); font-weight:700; }
.hi { color:var(--soft); } li.right { background:var(--okbg); color:var(--ok); font-weight:600; border-radius:4px; }
.sol { font-size:14px; } ol { padding-left:22px; }
</style></head><body><h1>${qs.length} questions - ${esc([...new Set(qs.map((x) => x.t))].join(", "))}</h1>
${cards}</body></html>`;
fs.writeFileSync(process.argv[3], html);
console.log("preview written:", process.argv[3]);
