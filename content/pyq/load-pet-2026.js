// Loads the two UPSSSC PET papers of 25 Oct 2026 (typed word for word in
// pet-2026-10-25-s1.js / -s2.js) into the PYQ import as papers "in review".
// Nothing reaches a student: the admin opens each paper on the PYQ page,
// settles the questions it flags (an answer with no key) and presses Publish.
//
//   node content/pyq/load-pet-2026.js           dry run: every row through the
//                                               same checks publish uses; writes nothing
//   node content/pyq/load-pet-2026.js --apply   creates the two imports
//
// Answers worked out here are stored as the paper's key (paperAnswer) and
// confirmed; questions without a sure answer carry none, so the import flags
// them "no_answer" and publish waits for a person to choose.

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const SV = path.join(__dirname, "..", "..", "server");
require(path.join(SV, "node_modules", "dotenv")).config({ path: process.env.ENV_FILE || path.join(SV, ".env") });
const mongoose = require(path.join(SV, "node_modules", "mongoose"));
const PyqImport = require(path.join(SV, "models", "PyqImport"));
const { flagsFor } = require(path.join(SV, "services", "pyqImport"));
const { prepareRow } = require(path.join(SV, "services", "manualQuestions"));
const { normaliseChart, checkChartAnswer } = require(path.join(SV, "services", "visuals"));

const PAPERS = [
  { shift: "1st Shift", file: "./pet-2026-10-25-s1.js", pdf: "UPSSSC PET 25 October 2026 1st Shift PDF.pdf", series: "NH8" },
  { shift: "2nd Shift", file: "./pet-2026-10-25-s2.js", pdf: "UPSSSC PET 25 Oct 2026 2nd Shift PDF.pdf", series: "GJ4" },
];
const DOWNLOADS = process.env.PDF_DIR || "C:/Users/satya/Downloads";

// The live pattern has no section of its own for the Hindi passages; they sit
// in General Hindi, topic "अपठित गद्यांश".
const subjectOf = (s) => (s === "अपठित गद्यांश" ? "General Hindi" : s);

function rowFor(x) {
  const [hiText, ...hiOpts] = x.hi || [];
  const [enText, ...enOpts] = x.en || [];
  const hindiOnly = !x.en;
  const dir = x.dir || [];
  const answer = x.a === null || x.a === undefined ? null : "ABCDE".indexOf(x.a);
  const row = {
    number: x.n,
    section: subjectOf(x.subject),
    subject: subjectOf(x.subject),
    topic: x.topic,
    // Hindi-only questions keep the Hindi in both fields, the way the app's
    // Hindi-medium questions do; English-only ones have no Hindi.
    text: hindiOnly ? hiText : enText,
    textHi: hiText || "",
    options: hindiOnly ? hiOpts : enOpts,
    optionsHi: hiOpts.length ? hiOpts : [],
    passage: x.passage || x.passageEn || dir[1] || "",
    passageHi: x.passage || dir[0] || "",
    paperAnswer: answer,
    answerConfirmed: answer !== null,
    correctIndex: answer,
    solved: true,
    tagged: true,
    ...(x.chart ? { chart: x.chart, chartSet: x.set, ...(x.formula ? { chartFormula: x.formula } : {}) } : {}),
  };
  row.flags = flagsFor(row);
  return row;
}

(async () => {
  const apply = process.argv.includes("--apply");
  const problems = [];
  const built = [];
  for (const p of PAPERS) {
    const qs = require(p.file);
    if (qs.length !== 100) throw new Error(`${p.file}: ${qs.length} questions, not 100`);
    const rows = qs.map(rowFor);
    for (const [i, r] of rows.entries()) {
      const x = qs[i];
      // What publish will do with it, run now.
      if (r.answerConfirmed) {
        const { errors } = prepareRow(
          { text: r.passage ? `${r.passage}\n\n${r.text}` : r.text, textHi: r.textHi, options: r.options, optionsHi: r.optionsHi.length === r.options.length ? r.optionsHi : [], correctIndex: r.correctIndex, subject: r.subject, topic: r.topic },
          { examType: "UPSSSC_PET", source: "pyq", subjectFallback: "GK", pyq: { pyqYear: 2026 } }
        );
        if (errors.length) problems.push(`${p.shift} Q${x.n}: ${errors.join("; ")}`);
      }
      if (x.chart) {
        try {
          const c = normaliseChart(x.chart);
          if (x.formula && checkChartAnswer({ options: r.options, correctIndex: r.correctIndex, formula: x.formula }, c).ok !== true) problems.push(`${p.shift} Q${x.n}: chart answer does not add up`);
        } catch (err) {
          problems.push(`${p.shift} Q${x.n}: chart: ${err.message}`);
        }
      }
      const unexpected = r.flags.filter((f) => !(f === "no_answer" && !r.answerConfirmed));
      if (unexpected.length) problems.push(`${p.shift} Q${x.n}: flags ${unexpected.join(",")}`);
    }
    const pdfPath = path.join(DOWNLOADS, p.pdf);
    const fileHash = fs.existsSync(pdfPath) ? crypto.createHash("sha256").update(fs.readFileSync(pdfPath)).digest("hex") : undefined;
    built.push({ p, rows, fileHash });
    const open = rows.filter((r) => r.flags.length).map((r) => `Q${r.number}`);
    const e = rows.filter((r) => r.correctIndex === 4).map((r) => `Q${r.number}`);
    console.log(`${p.shift}: 100 rows; answer (E) on ${e.join(", ") || "none"}; waiting for an answer: ${open.join(", ") || "none"}`);
  }
  if (problems.length) {
    console.log("\nPROBLEMS:\n" + problems.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("\nEvery row passes the publish checks.");
  if (!apply) return console.log("Dry run - nothing written. Add --apply to create the two imports (in review).");

  await mongoose.connect(process.env.MONGO_URI);
  for (const { p, rows, fileHash } of built) {
    const same = await PyqImport.findOne({ examStage: "UPSSSC_PET", shift: p.shift, examDate: new Date("2026-10-25") }).select("_id status").lean();
    if (same) {
      console.log(`${p.shift}: already loaded (${same._id}, ${same.status}) - skipped`);
      continue;
    }
    const imp = await PyqImport.create({
      examStage: "UPSSSC_PET",
      title: "UPSSSC PET",
      examDate: new Date("2026-10-25"),
      shift: p.shift,
      year: 2026,
      language: "bilingual",
      detected: { examName: "UPSSSC PET", examDate: "25 October 2026", shift: p.shift, year: 2026, language: "bilingual", totalQuestions: 100 },
      fileName: p.pdf,
      fileHash,
      status: "review",
      step: "done",
      expectedCount: 100,
      missingNumbers: [],
      rows,
      createdBy: "Typed from the paper (Claude), 2026-10-28",
    });
    console.log(`${p.shift}: loaded as ${imp._id} (in review)`);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
