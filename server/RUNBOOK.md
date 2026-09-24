# RankVeer backend — runbook

Everything here is run from the `server/` folder, with the real `.env` in place.
Nothing in this file needs code changes — these are the levers you already have.

---

## Is it live?

    https://mocktest-6gci.onrender.com/api/health

```json
{ "status": "ok", "database": "connected", "version": "2.0.0", "uptimeSeconds": 412 }
```

- `status: "degraded"` with HTTP 503 → the server is up but **cannot reach MongoDB**.
  Check Atlas (is the cluster paused? is Render's IP still allowed?).
- `version` is `server/package.json`'s version. If it doesn't change after a deploy,
  the deploy didn't actually go out.
- `uptimeSeconds` resetting to a small number every time you look = the process is
  crash-looping. Read Render's logs.

Render free tier sleeps after ~15 minutes idle, so the first request after a quiet
night takes ~30–50 seconds. That is the plan, not a bug.

---

## A student reports an error

Every unexpected failure answers with a short id:

```json
{ "message": "Kuch galat ho gaya. Thodi der baad try karo.", "errorId": "K4M2QX" }
```

Ask them for that id, then search Render's logs for `[K4M2QX]`. The full stack trace
is there. The student never sees the internals — that's deliberate; an error message
can leak the database URL.

---

## Backups

**Atlas free tier takes no backups.** If the data goes, it's gone. This is the backup:

```
npm run backup                          # -> server/backups/<date>/
npm run backup -- --out "D:/Backups/rankveer"
```

Run it **before** anything that rewrites data in bulk, and once a week regardless.
Keep one copy off this laptop — Google Drive, a pen drive, anywhere else.

Putting it back:

```
npm run restore -- backups/2026-09-24T18-00              # report only, changes nothing
npm run restore -- backups/2026-09-24T18-00 --apply      # add back what's missing
npm run restore -- backups/2026-09-24T18-00 --apply --replace   # wipe first, exact restore
```

Default is additive: anything already in the database is left alone. `--replace`
deletes first — only use it when you want that backup back exactly as it was.

---

## Indexes

Indexes are what keep the app fast as the question bank grows, and what stops one
Razorpay order becoming two subscriptions.

```
npm run indexes              # what the database is missing or has left over
npm run indexes -- --apply   # create the missing ones, drop the obsolete ones
```

The server also builds missing indexes at startup on its own. Run the script when:

- you changed a model, and want the old index cleaned up (startup never drops);
- the log says `INDEX BUILD FAILED`.

A unique index cannot be built while duplicates exist. The script names the
duplicate, you clear it, run again.

---

## The catalog: subjects, chapters, exams

Three ideas, and keeping them apart is what stops the whole thing tangling:

| | What it is | Where it lives |
| --- | --- | --- |
| **Subject** | A study area, as a student thinks of it — Maths, Science, Current Affairs | Subjects & Chapters |
| **Section** | A box in the real paper, e.g. "General Awareness, 25 questions" | Exam Patterns |
| **Chapter** | What a student actually practises — Percentage, Circles | inside a Subject |

**A section can draw on several subjects.** SSC's General Awareness is GK + Science +
Current Affairs together, while RRB Group D asks Science as a section of its own.
That is the "also draw from" box on a section. Without it, Science had to be either
a GK chapter (wrong for Railway) or its own subject (invisible to SSC).

**A subject can go by several names.** Banking papers say "Quant" for Maths. Put the
other names in "Other names for this subject" and one bank serves both. A Banking
student's Practice tab was empty for exactly this reason.

**A chapter says which exams it belongs to.** An Agniveer student is never shown
Coordinate Geometry. A chapter with no exams ticked shows in every exam, so nothing
disappears just because it hasn't been tagged yet.

**A chapter's `category` is only a heading** — अंकगणित, ज्यामिति, इतिहास. This is
how a big area like History gets its own heading without becoming its own subject.
It has to stay inside GK: the paper's General Awareness section draws on subject
"GK", so a separate History subject would simply never be asked.

### Adding a new exam

No code change, and no new questions:

1. **Exam Patterns → Add** — sections, question counts, difficulty mix, syllabus.
2. **Subjects & Chapters** — tick the new exam on the chapters it should show.
3. Done. Its students get subjects, chapters and a working mock from the bank that
   already exists. Questions tagged to the new exam are preferred as they get
   generated; until then the shared bank fills in.

### When a screen comes up empty

The banner at the top of **Subjects & Chapters** is the first place to look. It
reports, worst first:

- a section asking for a subject that doesn't exist (**high** — empties a screen)
- a subject no exam section draws on, so its questions can never reach a mock
- a chapter whose topics match no published question
- a chapter tagged to an exam that isn't configured
- a syllabus topic with no chapter to practise it in

None of these throw an error when you set them up. They fail silently, months
later, for one group of students. Three were live when this was written.

---

## Question quality

Only questions with `status: "published"` ever reach a student. Everything the
quality gate doubts goes to **Question Review** in the admin panel with the reason
attached — nothing is thrown away.

Audit the bank that's already there:

```
npm run audit:questions                     # report only
npm run audit:questions -- --apply          # move bad drafts to review
npm run audit:questions -- --apply --published-too   # clean live tests as well
```

It never deletes. It flags, and it pulls flagged questions out of tests.

Rebuild practice tests that are full of repeats:

```
npm run rebuild:practice
npm run rebuild:practice -- --apply --publish
```

It builds the replacement **first** and only archives the old test once the new one
exists — the reverse order once left 24 live tests archived with nothing to replace
them.

---

## Gemini

Free tier is roughly 15 requests per minute. The service paces itself:

| Variable | Default | What it does |
| --- | --- | --- |
| `GEMINI_MIN_GAP_MS` | 4500 | minimum gap between calls |
| `GEMINI_QUESTIONS_PER_CALL` | 6 | questions generated per call |
| `GEMINI_VERIFY_PER_CALL` | 6 | questions verified per call |

429 and 5xx are retried automatically, waiting as long as Google asks. If generation
starts failing, raise `GEMINI_MIN_GAP_MS` — it gets slower, never worse. Quality is
not traded for speed: fewer questions is the accepted outcome, filler is not.

---

## Deploying

1. `git push` — Render builds from the repo.
2. Watch Render's log for `Server running on port ...` and `MongoDB connected`.
3. Check `/api/health` shows the new `version`.

On every deploy Render sends SIGTERM. The server stops taking new requests, lets the
ones already running finish (10 seconds maximum), closes MongoDB, then exits — so a
deploy in the middle of a live exam doesn't cut anyone off.

---

## Emergency: get every app install onto a new build

In Render's environment, set:

```
APP_MIN_VERSION=1.4.0
APP_UPDATE_MESSAGE=Naya update zaroori hai
```

Every older install shows a blocking "update required" screen on its next launch.
No app rebuild, no Play Store review. `/api/app-config` is what the app reads.
