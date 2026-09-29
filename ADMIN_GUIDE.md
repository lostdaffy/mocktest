# RankVeer admin panel — guide for the team

The panel is at **https://rankveer.com/admin**. This guide is for the people who run
it day to day. Nothing here needs a developer.

**The one rule:** students see only what you **publish**. Everything is built as a
draft first. Look before you publish.

---

## 1. Your own login

Every team member has their own admin account — don't share one.

- Sign up in the RankVeer app like a student, with your own phone number.
- Ask an existing admin to open you in **Students → Users** and press **Make admin**.
- Sign in to the panel with that phone number and password.

The same button removes access when someone leaves. Nobody can remove their own
access, so the panel can never end up with no admin.

---

## 2. Building tests with AI — **Content → Generation**

This page builds whatever is missing:

- **Build all missing practice tests** — one test per chapter per level
  (Easy, Medium, Hard, Advanced), 12 questions each.
- **Build one mock per exam** — a full paper for each exam, at its real size.

Press the button and leave. It runs on the server; you can close the page.

**The daily AI limit.** The AI is on a free plan with a daily limit. When it runs
out, the queue **pauses itself** and says so on this page. The limit resets at
**12:30 PM IST** — press **Resume** after that. Nothing is lost: a mock that
stopped half-way is finished from where it stopped.

What the page tells you:

| | Meaning |
| --- | --- |
| Building now | what is being made this minute |
| Mocks built — *Unfinished: SSC MTS 76/90* | a mock that isn't full yet; it will be finished on the next run |
| What failed, and why | the reason, in words. **Retry failed** tries them again |

Every AI question is checked twice before it is kept — by rules (four options, the
worked solution reaches the ticked answer, no missing passage, Hindi present) and by
the AI solving it again on its own. Anything doubtful is repaired or thrown away.
You still review before publishing, because you know your students.

---

## 3. Reviewing and publishing

### Practice tests — **Content → Subject Practice**

Pick a subject and chapter. Each test shows its questions. **Publish** makes it
visible; **Unpublish** hides it again.

If you remove a question from a test, a replacement is made automatically.

### Mocks — **Content → Exam Mock Series**

Pick the exam. Each mock card shows **how many questions it has out of the real
paper size** (80 for SSC GD, 150 for CTET and UP Police, 100 for most others). A mock
can only be published when it is full.

- **Review** — read every question. **Edit** fixes a question; **Remove** takes it
  out.
- **Publish (Premium)** or **Publish as Free** — free mocks are open to everyone,
  premium ones need a subscription.
- **Archive** hides a published mock.

When you edit a question and change its answer, the panel checks the solution
still reaches the new answer and warns you if it doesn't. Read the warning — a
wrong answer key is the most damaging mistake there is.

### Question Review — **Content → Question Review**

Questions the checks weren't sure about, or that students report, land here with
the reason. **Fix** to correct and approve. Anything here is not shown to students.

---

## 4. Writing your own questions

For a human-made mock, a live exam, or a past paper the PDF reader can't read.

On any mock, live exam (while it is a draft) or past paper, press
**+ Write / upload**. Two ways:

**One at a time** — fill the form, press **Add question**. Section, topic, question,
four options, correct option, solution (optional), Hindi (optional).

**Upload a spreadsheet** — for a whole paper:

1. **Download template**, open it in Excel or Google Sheets.
2. One question per row, **in the order they should appear**.
   **correct** is `A`, `B`, `C` or `D` (or `1`–`4`, where 1 is the first option).
   Leave **solution** empty for a real past paper that has none — students are told
   none was provided.
3. With Hindi in it, save as **CSV UTF-8**. A plain "CSV" turns Hindi into
   question marks.
4. Choose the file → **Check**. Nothing is saved yet. You see:
   - **Can't be saved** — row number and reason (an empty option, no correct answer).
   - **Worth a look** — it will be added, but the checker has a doubt (two options
     the same, the solution doesn't reach the answer, no Hindi).
5. Fix the file if you need to, then **Add N questions**.

Your questions are **not** changed: no shuffling, no AI check. Row order is the paper
order.

---

## 5. Previous year papers — **Content → PYQ Bank**

Pick the exam, year, shift and date.

- **Upload & Extract** — a PDF of the real paper. The questions are read from the PDF,
  never invented. Questions whose answer key is missing are marked for you to fill.
- **Type it in instead** — no PDF, or a scan that can't be read. Starts an empty
  paper; then **+ Write / upload** to fill it.

Every paper is timed and marked like the real exam. **Review** checks each answer;
**Publish** is only possible once every question has a confirmed answer.

---

## 6. Live exams — **Exams → Live Exams**

A live exam opens for everyone at the same moment and closes for everyone at the same
moment.

1. **Create** — pick the exam and the date and time.
2. Fill it — **+ AI questions** (section by section) or **+ Write / upload**. The
   card shows e.g. *100 / 100 questions*.
3. **Review**, then **Publish**. Publishing needs a full paper and a time still in
   the future. Students are reminded 15 minutes before it starts.

What students get: it can't be opened early; a student who joins late gets the time
that's **left**, not a fresh paper, so everyone finishes together; anyone who doesn't
press submit is submitted automatically when it closes; ranks appear once it has
closed. One attempt per student.

- **Edit** changes the title or time before it starts.
- **Cancel** is not possible while it is running.
- **Results** shows every attempt, with the app-switching count for each student.

A paper can't be changed once published. To change questions, cancel it and make a
new one.

---

## 7. Exams and subjects

### A new exam — **Exams → Exam Patterns → Add**

- Duration, marks per question, negative marking.
- One **section** per part of the paper: subject, number of questions, difficulty
  mix, syllabus (one topic per line, `Topic: sub-topic, sub-topic`).
- Two small boxes on a section, **only when the real paper does this**:
  - its own negative marking — SSC MTS deducts nothing in Session I (Maths,
    Reasoning) and 1 mark in Session II (GK, English);
  - its own time limit — IBPS PO Prelims is three 20-minute sections. Set it on every
    section or on none.

### Subjects and chapters — **Exams → Subjects**

What students practise. Tick which exams each chapter belongs to. The banner at the
top warns about anything that would leave a student's screen empty.

---

## 8. Students — **Students**

- **Users** — search, open a student: reset password, **Manage plan** (give or extend
  a subscription), unlock a locked account, log out of all devices, fix name/email,
  **Make admin**, delete on request.
- **Student Reports** — questions students flagged as wrong. Check, fix in
  Question Review, mark resolved.
- **Coupons** — discount codes, with an optional limit on how many times each can be
  used. There is no end date: when an offer is over, press **Active** to switch the
  code off. Write the end date in the note so the team remembers.

---

## Before you publish anything, check

- The answer key — solve two or three questions yourself.
- Hindi reads naturally.
- Mocks are full (the card shows the real size).
- Free or Premium is what you meant.
