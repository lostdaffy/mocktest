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

## Environment variables that must be set in production

| Variable | Value | What happens without it |
| --- | --- | --- |
| `NODE_ENV` | `production` | Real exception messages are attached to replies that go to students, and Express skips its production optimisations. The server now warns about this in its log on startup. |
| `MONGO_URI` | Atlas connection string | Refuses to start |
| `JWT_SECRET` | 32+ random characters | Refuses to start |
| `ALLOWED_ORIGINS` | `https://rankveer.com` | Falls back to rankveer.com and www.rankveer.com. Set it only if the admin panel moves to another domain. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | the `rzp_live_` pair | Payments stay off and the app shows "coming soon" instead of a buy button |
| `RAZORPAY_WEBHOOK_SECRET` | from the Razorpay dashboard | Webhook signatures can't be checked |
| `EMAIL_USER` / `EMAIL_APP_PASSWORD` | Gmail app password | Password reset emails fail silently |
| `GEMINI_API_KEY` | from Google AI Studio | Question generation fails |

The server prints a warning at startup for each of these it can detect, and
refuses to start at all without the first three.

---

## Deploying

**Render's auto-deploy is off.** A `git push` alone changes nothing that is live.

0. `npm test` — every suite, against a throwaway database, AI stubbed out. See
   `tests/run-all.js`.
1. `git push`.
2. Render dashboard → the service → **Manual Deploy → Deploy latest commit**.
   Check the deploy row shows your commit message — deploying before the push has
   landed ships the previous code, and it looks like success.
3. Watch Render's log for `Server running on port ...` and `MongoDB connected`.
4. `/api/health` → `uptimeSeconds` is small again.

On every deploy Render sends SIGTERM. The server stops taking new requests, lets the
ones already running finish (10 seconds maximum), closes MongoDB, then exits — so a
deploy in the middle of a live exam doesn't cut anyone off. A generation job that
was running is handed back to the queue and picks up where it stopped.

**Don't deploy while the generation queue is building a mock** unless you must: the
batch in progress is thrown away along with the AI allowance already spent on it.
The Generation page shows whether anything is running.

## Deploying the admin panel

The panel is static files on HostGB (cPanel), not on Render.

1. `cd admin && npm run build` → `admin/dist/`.
2. cPanel → File Manager → `public_html/admin/assets/` → upload the new
   `index-*.js` and `index-*.css` from `dist/assets/`. **One file per upload** —
   choosing two at once has dropped one silently.
3. Then `public_html/admin/` → tick **Overwrite existing files** → upload
   `dist/index.html`. The box is off by default, and without it the old
   `index.html` is kept silently and the old panel goes on loading.
4. Open https://rankveer.com/admin and hard-refresh. `curl
   https://rankveer.com/admin/index.html` should name the new `index-*.js`.

Order matters: assets first, `index.html` last, so the page never points at a file
that isn't there yet.

---

## The generation queue

Admin → **Generation**. It builds whatever the catalog is missing — practice tests
(chapter × level) and one mock per exam — one job at a time, on the server. The page
can be closed; the queue keeps going.

- **The Gemini free allowance runs out.** The queue then pauses itself and says so.
  It resets at **12:30 PM IST**; press **Resume** after that. Nothing is lost — a
  mock that stopped part way is finished from where it stopped, not started again.
- **Only a full paper counts as a mock built.** A short one is listed as
  *Unfinished* with how far it has got, and stays a gap until it is full.
- A job that failed shows why. **Retry failed** puts them back.
- The instance is kept awake while the queue has work (`jobs/keepAwake.js`), and
  only then.

## Live exams under load

Tested with 340 students arriving together (`live-load-test` in the test suite):
double taps, double submits, autosave bursts and the closing bell are all handled
— one attempt per student, one free slot charged, ranks over the real field.

**Capacity is the hosting, not the code.** On the free Render instance (0.1 CPU,
512 MB) and the free Atlas cluster, a few hundred students submitting in the same
seconds will wait several seconds each. For a large advertised live exam, move the
service to a paid instance for that day — it is a plan change on Render, not a code
change.

## Admin accounts

Each team member gets their own: they sign up in the app like a student, then an
existing admin opens them in **Users** and presses **Make admin**. Removing access is
the same button. Nobody can remove their own access, so the panel can't be left
with no admin. `node scripts/createFirstAdmin.js` recreates the very first admin
from `FIRST_ADMIN_PHONE` / `FIRST_ADMIN_PASSWORD` if it is ever lost.

---

## Emergency: get every app install onto a new build

In Render's environment, set:

```
APP_MIN_VERSION=1.4.0
APP_UPDATE_MESSAGE=Naya update zaroori hai
```

Every older install shows a blocking "update required" screen on its next launch.
No app rebuild, no Play Store review. `/api/app-config` is what the app reads.
