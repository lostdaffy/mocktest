# RankVeer — handover

What was built, where it lives, what the new owner must take over, and what is
still to do before launch.

- **Running the panel day to day:** [ADMIN_GUIDE.md](ADMIN_GUIDE.md) — for the team.
- **Keeping the server healthy, deploying, backups:** [server/RUNBOOK.md](server/RUNBOOK.md) — for whoever maintains the code.

---

## What there is

| Part | Where it runs | How it is deployed |
| --- | --- | --- |
| **Server** (`server/`) — Node/Express, MongoDB | Render, `https://mocktest-6gci.onrender.com` | push, then **Manual Deploy** on Render (auto-deploy is off) — RUNBOOK → *Deploying* |
| **Admin panel** (`admin/`) — React | HostGB cPanel, `https://rankveer.com/admin` | `npm run build`, upload via cPanel File Manager — RUNBOOK → *Deploying the admin panel* |
| **Mobile app** (`mobile/`) — Expo / React Native | Google Play, package `com.satya.smarttestengine` | EAS build + submit — see *Releasing the app* below |
| **Website** (`website/`) | HostGB, `https://rankveer.com` | cPanel upload |
| **Database** | MongoDB Atlas (free cluster) | — |
| **AI** | Google Gemini API (free tier) | — |
| **Payments** | Razorpay (live keys set on Render) | — |

---

## Accounts to transfer to the client

Move each one into the client's name, **then change every password and key.** Some
credentials were shared in chat during development; treat all of them as known.

- [ ] **GitHub** — the repository
- [ ] **Render** — the web service; environment variables live here
- [ ] **MongoDB Atlas** — the cluster; also rotate the DB user password, then update
      `MONGO_URI` on Render
- [ ] **Google AI Studio** — issue a new `GEMINI_API_KEY` under the client's Google
      account and set it on Render
- [ ] **Razorpay** — the account holds the money; the client must own it. Rotate
      `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`
- [ ] **HostGB / cPanel** — **change the cPanel password first**; it was shared in chat
- [ ] **Google Play Console** — transfer the app
- [ ] **Expo / EAS** — transfer the project (builds and signing credentials live there)
- [ ] **Gmail** used for password-reset emails — `EMAIL_USER` / `EMAIL_APP_PASSWORD`
- [ ] **Twilio**, if SMS is used — `TWILIO_*`
- [ ] Set `JWT_SECRET` on Render to a new random 32+ character value. Everyone is
      signed out once; that is the point.
- [ ] Set `FIRST_ADMIN_PHONE` / `FIRST_ADMIN_PASSWORD` on Render to the client's own

The full list of environment variables and what each does is in RUNBOOK →
*Environment variables*.

---

## Before launch — content, not code

The code is finished and tested. What remains is content and release, and it is the
client's call:

1. **Finish the mocks.** Four are part-built because the daily AI limit ran out:
   SSC CHSL, SSC MTS, UPSSSC PET, Agniveer GD. **Generation → Resume** after 12:30 PM
   IST; they finish where they stopped.
2. **Review, then publish.** Nothing is published yet — practice tests, mocks, all
   drafts. Students see an empty app until this is done. ADMIN_GUIDE → *Reviewing and
   publishing*.
3. **Previous Year Papers and Current Affairs are empty.** Either add content (PYQ can
   be uploaded or typed in) or accept that those screens start empty.
4. **Release the app** with this update (below). Without it, students don't get:
   negative marking shown on the result, the banner carousel, department logos on the
   exam lists, the longer splash.

---

## Releasing the app

From `mobile/`:

1. Raise `expo.version` in `app.json` (1.1.0 is the current release). The Android
   build number increments on its own (`autoIncrement`).
2. `eas build -p android --profile production` — check it reports the new version.
3. Upload the `.aab` in Play Console → Production → Create new release. (`eas submit`
   needs a Google service-account key that has not been set up yet — see
   *Not working yet* below.) **Never pick an older build from the list** — it ships
   the old app.
4. Once it is live on Play, set `APP_LATEST_VERSION=1.1.0` on Render. To force every
   old install to update, also set `APP_MIN_VERSION=1.1.0` — RUNBOOK → *Emergency*.

**Before it goes to Play, open these on a real phone once:**

- a mock → submit → the result shows the negative-marking line under the score;
- the home carousel shows four banners;
- Mock tab and PYQ tab show department logos;
- a live exam (schedule one five minutes ahead) — open it, answer, let the time run out.

Section-by-section timing (IBPS PO Prelims) is built into the exam screen but **off**
until IBPS's sections are given their minutes in Exam Patterns. It should be switched
on only after it has been seen working on a phone.

---

## Not working yet: push notifications on Android

The app asks for notification permission and the server sends a "live exam starts
in 15 minutes" reminder — but **no Android phone has ever received one.** The app
has no Firebase configuration (`google-services.json`, `android.googleServicesFile`
in `app.json`), and without it an Android build cannot get a push token, so the
server has no address to send to. It fails silently, which is why it went unnoticed.

To turn it on (needs the client's Google account):

1. Firebase console → new project → add an Android app with package
   `com.satya.smarttestengine` → download `google-services.json` into `mobile/`.
2. In `mobile/app.json`, under `expo.android`, add
   `"googleServicesFile": "./google-services.json"`.
3. Firebase → Project settings → Service accounts → generate a private key (JSON).
   `eas credentials` → Android → production → **Google Service Account → FCM V1** →
   upload it. The same kind of key, given Play Console release access, also lets
   `eas submit` upload builds without the manual step.
4. A new app build (`eas build -p android --profile production`) and release.
5. Check: schedule a live exam 20 minutes ahead, wait for the reminder on a phone.

---

## Known limits — the plan, not bugs

- **The server sleeps** after ~15 minutes with no traffic (Render free). The next
  student waits 30–50 seconds. A paid instance removes this.
- **Big live exams.** The code handles a crowd correctly (tested with 340 students
  at once); the free server makes each of them wait several seconds at the closing
  bell. Move to a paid Render instance for a large advertised exam.
- **AI limit.** The free Gemini plan allows a few hundred requests a day; a full
  150-question mock can take more than one day's allowance. The queue pauses and
  resumes; nothing is lost.
- **No automatic backups** on the free Atlas cluster. `npm run backup` weekly —
  RUNBOOK → *Backups*.
- **Coupons have no end date.** Switch a code off when the offer ends.

---

## Tests

```
cd server
npm install
npm test                      # all 34 suites
npm test -- live marking      # only suites whose name contains "live" or "marking"
```

Each suite starts the real server against a throwaway in-memory database with the AI
stubbed out — it never touches production data and never spends the Gemini
allowance. The first run downloads a MongoDB binary (~100 MB) once.

They cover, among others: the full student journey, live exams end to end and with
340 students at once, negative marking per section, the generation queue
(pause, resume, finishing a half-built mock), manual and spreadsheet question entry,
admin roles, payments and coupons, login sessions, the daily streak, and the
question-quality checks.

**Run them before every deploy.** Several of the worst faults fixed in development
were ones only a test with many students, or a stub that disagreed with the code,
could find.
