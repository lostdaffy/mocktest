// Preloaded into the server under test. Replaces the HTTP call to Gemini
// with a fake model, so the REAL validation pipeline and question factory
// run end to end - rule checks, option shuffling, AI verification, the lot.
//
// The fake model deliberately produces some bad questions:
//   NOHINDI  - no Hindi translation
//   SHORTSOL - a one-word "solution"
//   TRICKY   - the verifier will disagree with its answer key
const path = require("path");
const SERVER = require("path").resolve(__dirname, "..");
const fetchPath = require.resolve("node-fetch", { paths: [SERVER] });

let generated = 0;

function makeQuestion(kind, n) {
  const base = {
    text: `${kind} question number ${n} about percentages and ratios`,
    textHi: `${kind} हिंदी प्रश्न ${n} प्रतिशत और अनुपात`,
    options: [`RIGHT answer ${n}`, `wrong one ${n}`, `wrong two ${n}`, `wrong three ${n}`],
    optionsHi: [`सही उत्तर ${n}`, `गलत एक ${n}`, `गलत दो ${n}`, `गलत तीन ${n}`],
    correctIndex: 0,
    solution: `Work it out step by step: the answer comes to RIGHT answer ${n} because of the ratio.`,
    solutionHi: `चरण दर चरण हल करें, उत्तर ${n} आता है क्योंकि अनुपात ऐसा है।`,
  };
  if (kind === "NOHINDI") return { ...base, textHi: "", optionsHi: [], solutionHi: "" };
  if (kind === "SHORTSOL") return { ...base, solution: "yes" };
  return base;
}

function reply(body) {
  const prompt = JSON.parse(body).contents[0].parts.map((p) => p.text || "").join("\n");

  // ---- verification: read the options back out of the prompt and pick the
  // one marked RIGHT, exactly as a real solver would. TRICKY questions get a
  // deliberately different answer, so the pipeline sees a disagreement.
  if (/Solve each multiple-choice question|Solve this multiple-choice question/.test(prompt)) {
    const blocks = prompt.split(/^Q(\d+)\. /m).slice(1);
    const answers = [];
    for (let i = 0; i < blocks.length; i += 2) {
      const qNo = Number(blocks[i]);
      const block = blocks[i + 1];
      const lines = block.split("\n");
      let rightIndex = 0;
      for (const line of lines) {
        const m = line.match(/^([0-3])\. (.*)$/);
        if (m && /RIGHT/.test(m[2])) rightIndex = Number(m[1]);
      }
      const isTricky = /TRICKY/.test(block);
      // Answer by TEXT, the way the real checker is now asked to.
      //
      // A TRICKY question must disagree UNAMBIGUOUSLY. It used to reply
      // rightIndex + 1, which is indistinguishable from a checker that
      // simply counted from 1 instead of 0 - and since the pipeline now
      // tolerates that (models do it constantly), "one along" is agreement,
      // not disagreement. Two along, and naming the text, leaves no doubt.
      const textAt = (i) => {
        const line = lines.find((l) => l.startsWith(i + ". "));
        return line ? line.slice(3) : "";
      };
      const pick = isTricky ? (rightIndex + 2) % 4 : rightIndex;
      answers.push({
        q: qNo,
        answer: textAt(pick),
        correctIndex: pick,
        confidence: 0.95,
      });
    }
    return { candidates: [{ content: { parts: [{ text: JSON.stringify(answers) }] } }] };
  }

  // ---- generation: every batch carries one of each kind of bad question
  const wanted = Number((prompt.match(/Generate exactly (\d+)/) || [])[1] || 1);
  const out = [];
  for (let i = 0; i < wanted; i++) {
    generated++;
    const kind = i === 0 ? "NOHINDI" : i === 1 ? "SHORTSOL" : i === 2 ? "TRICKY" : "GOOD";
    out.push(makeQuestion(kind, generated));
  }
  return { candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] };
}

require.cache[fetchPath] = {
  id: fetchPath,
  filename: fetchPath,
  loaded: true,
  exports: async (url, opts) => ({ ok: true, json: async () => reply(opts.body) }),
};

console.log("[stub] fake Gemini model installed");
