// Number & Letter Series as uploaded: the five topics in one fixed order, then
// Mixed Practice fitted around the four old drafts (12 AI questions each, never
// published) - each topped up to 20 and all 48 old questions replaced in place.
//
//   node content/rs-ser-upload.js all rs-ser-rows
const { fillTopic } = require("./gen");
const { fitAround } = require("./fill-plan");
const CH = require("./rs-ser-chapter");
const ex = require("./rs-ser-existing");

const MODS = { num: require("./rs-num"), let: require("./rs-let"), anum: require("./rs-anum"), rep: require("./rs-rep"), mat: require("./rs-mat") };
const ORDER = ["num", "let", "anum", "rep", "mat"];
const MIXED = "Number & Letter Series · Mixed Practice";
const SUBJECT = "Reasoning";
const NAME = { easy: "Easy", medium: "Medium", hard: "Hard", advanced: "Advanced" };

// Refused by the server as a repeat of a question already in the bank; filled in after a dry run.
const BANK_REPEATS = {};

let built;
function build() {
  if (built) return built;
  const topics = {};
  for (const k of ORDER) topics[k] = MODS[k].topic();
  const kinds = ORDER.flatMap((k) => MODS[k].KINDS);
  const mixed = fillTopic({ kinds, prefix: MIXED, used: CH.USED, cap: 3 });
  const plan = fitAround({ topic: mixed, prefix: MIXED, existing: ex.existing });
  for (const level of Object.keys(ex.bad)) {
    for (const [id, n, why] of ex.bad[level]) {
      const q = plan.spare[level].shift();
      if (!q) throw new Error(`no spare ${level} question to replace ${id}`);
      plan[level].push({ ...q, t: `${MIXED} · ${NAME[level]} #${n}`, r: id, rr: why });
    }
  }
  built = { topics, plan };
  return built;
}

function questions(topic, level) {
  const { topics, plan } = build();
  let qs = topic === "mixed" ? plan[level] : topics[topic][level].flat();
  const swap = BANK_REPEATS[`${topic}|${level}`] || [];
  if (swap.length) qs = qs.map((q) => (swap.includes(q.q) ? { ...plan.spare[level].shift(), t: q.t } : q));
  return qs;
}

// The rows the admin's spreadsheet upload sends - only if every question
// passes its own check (the same rules as build-batch.js), with the right
// answer moved to A, B, C, D in turn.
function rows(qs) {
  const problems = [];
  qs.forEach((x, i) => {
    const where = `#${i + 1} (${x.t}): ${String(x.q).slice(0, 60)}`;
    if (!x.t || !x.q || !x.qh || !x.s || !x.sh) problems.push(`${where} - a field is missing`);
    if (!Array.isArray(x.o) || x.o.length !== 4 || new Set(x.o).size !== 4) problems.push(`${where} - needs 4 different options`);
    let ok = false;
    try { ok = x.v() === true; } catch (e) { problems.push(`${where} - check crashed: ${e.message}`); }
    if (!ok) problems.push(`${where} - the check does not agree with option ${"ABCD"[x.a]}`);
  });
  if (problems.length) throw new Error(problems.join("\n"));
  return qs.map((x, i) => {
    const want = i % 4;
    const move = (arr) => { const right = arr[x.a]; const rest = arr.filter((_, k) => k !== x.a); rest.splice(want, 0, right); return rest; };
    const o = move(x.o), oh = move(x.oh || x.o);
    const lv = (/· (Easy|Medium|Hard|Advanced) #/.exec(x.t) || [])[1].toLowerCase();
    return {
      test: x.t, subject: SUBJECT, topic: x.t.split(" · ")[1], difficulty: lv === "advanced" ? "hard" : lv,
      question: x.q, optionA: o[0], optionB: o[1], optionC: o[2], optionD: o[3], correct: "ABCD"[want],
      formula: "", solution: x.s, questionHi: x.qh, optionAHi: oh[0], optionBHi: oh[1], optionCHi: oh[2], optionDHi: oh[3], solutionHi: x.sh,
      replaces: x.r || "", replaceReason: x.rr || "",
    };
  });
}

module.exports = { build, questions, rows, ORDER, MIXED };

if (require.main === module) {
  const [topic, level, out] = process.argv.slice(2);
  const fs = require("fs");
  if (topic === "all") {
    const dir = level;
    fs.mkdirSync(dir, { recursive: true });
    for (const t of [...ORDER, "mixed"]) for (const lv of Object.keys(NAME)) {
      const r = rows(questions(t, lv));
      fs.writeFileSync(`${dir}/rs-ser-${t}-${lv}.json`, JSON.stringify(r));
      console.log(t, lv, r.length, "rows,", new Set(r.map((x) => x.test)).size, "tests, answers", ["A", "B", "C", "D"].map((l) => r.filter((x) => x.correct === l).length).join(" "));
    }
  } else {
    const r = rows(questions(topic, level));
    fs.writeFileSync(out, JSON.stringify(r));
    console.log(r.length, "rows");
  }
}
