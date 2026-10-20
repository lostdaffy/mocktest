// Students as the last check. A question whose key is wrong shows it in the
// answers: the students who know the topic pick the option that is actually
// right, and it is not the one marked. So when most answers land on ONE
// other option and few on the marked one, the key is taken to be wrong -
// the question is rejected and replaced in every test that held it, with no
// one having to notice first.
//
// The old rule (80% wrong over 20 answers -> under review) could not tell a
// wrong key from a hard question, and left the question in its tests. This
// one looks at where the wrong answers go: a hard question spreads them,
// a wrong key gathers them on one option.

const Question = require("../models/Question");
const { rejectAndHeal } = require("./questionRejection");

const MIN_ANSWERS = 15;
const ONE_OPTION_SHARE = 0.5; // one other option takes at least half the answers
const MARKED_SHARE_MAX = 0.25; // ...and the marked one at most a quarter

// The picks as [a, b, c, d] from the stored map ({ "0": 3, "2": 9 }).
function picksOf(q) {
  const p = q.picks instanceof Map ? Object.fromEntries(q.picks) : q.picks || {};
  return [0, 1, 2, 3].map((k) => Number(p[k] || p[String(k)] || 0));
}

/** The option the answers point to instead of the marked one, or -1. */
function suspectOption(q) {
  const c = picksOf(q);
  const n = c.reduce((a, b) => a + b, 0);
  if (n < MIN_ANSWERS) return -1;
  if (c[q.correctIndex] > MARKED_SHARE_MAX * n) return -1;
  const k = c.findIndex((v, i) => i !== q.correctIndex && v >= ONE_OPTION_SHARE * n);
  return k;
}

async function sweepSuspectKeys({ apply = true } = {}) {
  const candidates = await Question.find({ status: "published", picks: { $exists: true } })
    .select("text options correctIndex picks subject topic")
    .lean();
  const found = [];
  for (const q of candidates) {
    const k = suspectOption(q);
    if (k < 0) continue;
    const c = picksOf(q);
    const n = c.reduce((a, b) => a + b, 0);
    const reason = `Students' answers point to option ${"ABCD"[k]} (${c[k]} of ${n}), not the marked ${"ABCD"[q.correctIndex]} (${c[q.correctIndex]}) - the key is likely wrong`;
    const entry = { _id: q._id, text: q.text, subject: q.subject, reason };
    if (apply) {
      const done = await rejectAndHeal(q._id, `Auto: ${reason}`, { by: "system" });
      entry.removedFrom = (done?.affected || []).map((t) => t.title);
    }
    found.push(entry);
  }
  return found;
}

module.exports = { sweepSuspectKeys, suspectOption, picksOf, MIN_ANSWERS };
