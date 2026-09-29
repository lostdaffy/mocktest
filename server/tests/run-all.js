// Runs every suite in this folder, one after another, and says which failed.
//
//   npm test                      every suite
//   npm test -- live marking      only suites whose name contains one of these
//
// Each suite starts the real server against a throwaway in-memory MongoDB with
// the AI stubbed out, so nothing here touches production data or spends the
// Gemini allowance. The first run downloads a MongoDB binary (~100 MB) once.
//
// One at a time on purpose: the suites use fixed ports and would collide.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const filters = process.argv.slice(2);
const suites = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith("-test.cjs"))
  .filter((f) => !filters.length || filters.some((x) => f.includes(x)))
  .sort();

const summary = [];
for (const suite of suites) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [path.join(__dirname, suite)], {
    cwd: __dirname,
    encoding: "utf8",
    timeout: 10 * 60 * 1000,
  });
  const out = `${run.stdout || ""}${run.stderr || ""}`;
  const tally = (out.match(/(\d+)\/(\d+) passed/g) || []).pop() || "no result";
  const ok = run.status === 0;
  summary.push({ suite, ok, tally, seconds: Math.round((Date.now() - started) / 1000) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${suite.padEnd(26)} ${tally.padEnd(14)} ${summary.at(-1).seconds}s`);
  if (!ok) {
    // The checks that failed, so nobody has to rerun it to find out.
    out.split("\n").filter((l) => /^FAIL|Error/.test(l)).slice(0, 12).forEach((l) => console.log("      " + l));
  }
}

const failed = summary.filter((s) => !s.ok);
console.log(`\n${summary.length - failed.length} of ${summary.length} suites passed`);
process.exit(failed.length ? 1 : 0);
