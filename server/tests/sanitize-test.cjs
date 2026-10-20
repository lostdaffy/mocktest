// middleware/sanitize.js on its own: operator and prototype keys go, every
// other value stays exactly as sent.
const path = require("path");
const { clean } = require(path.join(__dirname, "..", "middleware", "sanitize"));

const results = [];
const check = (name, cond, detail = "") => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`);
};

let b = { phone: { $ne: "" }, password: "x" };
clean(b);
check("a $ne operator is removed", JSON.stringify(b) === '{"phone":{},"password":"x"}', JSON.stringify(b));

b = JSON.parse('{"a":1,"__proto__":{"admin":true},"constructor":{"prototype":{"x":1}}}');
clean(b);
check("__proto__ and constructor keys are removed", !Object.keys(b).includes("__proto__") && !Object.prototype.hasOwnProperty.call(b, "constructor") && b.a === 1 && ({}).admin === undefined);

b = { rows: [{ question: "What is $5 + $3?", options: ["$8", "$9", "$7", "$6"] }, { $where: "sleep(1000)" }] };
clean(b);
check("dollar signs inside values are kept", b.rows[0].question === "What is $5 + $3?" && b.rows[0].options[0] === "$8");
check("operators inside arrays are removed", Object.keys(b.rows[1]).length === 0);

b = { "a.b": 1, text: "x" };
clean(b);
check("an ordinary key is left alone", b["a.b"] === 1 && b.text === "x");

let deep = {};
let cur = deep;
for (let i = 0; i < 500; i++) cur = cur.n = {};
let ok = true;
try { clean(deep); } catch { ok = false; }
check("a very deep body does not crash it", ok);

const passed = results.filter((x) => x.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
