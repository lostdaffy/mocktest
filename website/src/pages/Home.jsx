import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import Countdown from "../components/Countdown";
import PlayButton from "../components/PlayButton";
import { site } from "../components/SiteInfo";
import {
  BarChartIcon,
  BellIcon,
  BroadcastIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  LanguageIcon,
  LayersIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "../components/icons";

export const meta = {
  title: "Rankveer – Mock Tests & Practice for SSC, Railway, UP Police, UPSSSC PET, TET, Banking & Agniveer",
  description:
    "Mock tests on each exam's official pattern, chapter-wise practice with a solution for every question, and a free Daily GK Quiz – in Hindi and English. Free to start. Get it on Google Play.",
  organizationSchema: true,
};

// Everything on this page describes what the app does today. Numbers come
// from site.config.json (counted, never rounded up); anything not built yet
// is not promised. Results depend on the student - nothing here implies
// selection, marks or rank.

/* ------------------------------------------------------------------ data */

const STATS = [
  { value: site.stats?.exams, label: "exams covered" },
  { value: site.stats?.questions, label: "practice questions" },
  { value: site.stats?.practiceTests, label: "chapter practice tests" },
  { value: "2", label: "languages — हिंदी & English" },
];

const HIGHLIGHTS = [
  { Icon: LayersIcon, tint: "tint-blue", title: "Official exam pattern", text: "Sections, timing and negative marking as each exam notifies them" },
  { Icon: FileTextIcon, tint: "tint-green", title: "A solution for every question", text: "Worked step by step, in Hindi and English" },
  { Icon: LanguageIcon, tint: "tint-violet", title: <><span lang="hi">हिंदी</span> + English</>, text: "Switch language any time during a test" },
  { Icon: ShieldCheckIcon, tint: "tint-orange", title: "Report a mistake", text: "Flag any question from inside the test — we review every report" },
];

const FEATURES = [
  {
    Icon: ClipboardCheckIcon,
    tint: "tint-blue",
    title: "Full-length mock tests",
    text: "A mock series for each exam with the same sections, number of questions, time limit and negative marking as the official pattern. New mocks are added to each series over time.",
    tag: "First mock of every series free",
  },
  {
    Icon: TrendingUpIcon,
    tint: "tint-orange",
    title: "Chapter-wise practice",
    text: `${site.stats?.practiceTests || "Hundreds of"} practice tests, chapter by chapter and topic by topic, at four levels — Easy, Medium, Hard and Advanced — each question with a step-by-step solution.`,
  },
  {
    Icon: TrophyIcon,
    tint: "tint-teal",
    title: "Daily GK Quiz",
    text: "A fresh 20-question general-knowledge quiz every day, the same for everyone, with a ranking among that day's players.",
    tag: "Always free",
  },
  {
    Icon: BarChartIcon,
    tint: "tint-violet",
    title: "Result analysis",
    text: "Topic-by-topic accuracy with your weakest topic first, and every wrong or skipped answer with its solution, so you know what to practise next.",
  },
  {
    Icon: FileTextIcon,
    tint: "tint-green",
    title: "Previous year papers",
    text: `Questions from actual past papers, added exam by exam. Available now: ${site.pyqAvailable}.`,
  },
  {
    Icon: BroadcastIcon,
    tint: "tint-red",
    title: "Live exams",
    text: "Scheduled exams where everyone takes the same paper at the same time and gets an all-India rank. Each one is announced in the app.",
  },
];

const STEPS = [
  { title: "Choose your exam", text: `Pick from ${site.stats?.exams || "our"} exams — SSC, Railway, UP Police, UPSSSC PET, teaching exams, Banking and Agniveer. Your subjects and chapters follow from it.` },
  { title: "Practise chapter by chapter", text: "Start at Easy and move up to Advanced. Read the solution after every test and redo the questions you got wrong." },
  { title: "Test yourself on the full pattern", text: "Take full-length mocks under real timing, check your weak topics in the analysis, and go back to those chapters." },
];

const LIVE_POINTS = [
  "Starts at the same time for everyone — joining late doesn't buy extra time",
  "Every attempt is submitted automatically when time runs out",
  "Ranks are released once the exam ends, so every result is compared fairly",
  "Announced in the app, with a reminder before it begins — keep notifications on",
];

// The exams the app offers (server /api/exams/catalog), grouped the way
// students think of them. Keep the total equal to site.stats.exams.
const EXAMS = [
  { abbr: "SSC", tint: "tint-blue", name: "SSC", exams: ["CGL Tier 1", "CHSL Tier 1", "MTS & Havaldar", "GD Constable"] },
  { abbr: "RRB", tint: "tint-orange", name: "Railway", exams: ["RRB NTPC CBT 1", "RRB Group D"] },
  { abbr: "UP", tint: "tint-red", name: "UP Police & UPSSSC", exams: ["UP Police Constable", "UPSSSC PET"] },
  { abbr: "TET", tint: "tint-violet", name: "Teaching", exams: ["CTET Paper 1", "UPTET Paper 1", "UP Super TET"] },
  { abbr: "IBPS", tint: "tint-green", name: "Banking", exams: ["IBPS PO Prelims"] },
  { abbr: "ARMY", tint: "tint-teal", name: "Defence", exams: ["Agniveer Army GD", "Agniveer Army Technical"] },
];

// What each plan unlocks, as the server enforces it
// (server/controllers/testController.js, server/config/freeLimits.js).
// Prices are the app's Premium screen (mobile/src/screens/SubscriptionScreen.js)
// and the server's controllers/paymentController.js - change all three together.
// No struck-out "MRP" here: a price is shown only if it is the price charged.
const PREMIUM = [
  "Every mock test in every series",
  "Every previous-year paper in the app",
  "Every live exam, with all-India rank",
  "Every chapter practice test — Easy to Advanced",
  "Personalised daily test, every day",
  "Weekly revision test from your own mistakes",
  "Pay once · no auto-renewal",
];

const perDay = (price, days) => `₹${(price / days).toFixed(2)} a day`;

const PLANS = [
  {
    name: "Free",
    price: 0,
    sub: "No payment needed",
    features: [
      "First mock of every mock series",
      "This year's & last year's previous-year papers",
      "3 live exams with all-India rank",
      "Selected chapter practice tests",
      "Daily GK Quiz, every day",
      "Personalised daily test for 7 days",
      "Result analysis of every test",
    ],
  },
  { name: "1 Month", price: 59, days: 30, features: PREMIUM },
  { name: "3 Months", price: 149, days: 90, features: PREMIUM },
  { name: "6 Months", price: 249, days: 180, features: PREMIUM, featured: true },
  { name: "12 Months", price: 449, days: 365, features: PREMIUM, lowest: true },
];

const FAQS = [
  {
    q: "Where do I download Rankveer?",
    a: (
      <>
        Rankveer is on <a href={site.playStoreUrl} target="_blank" rel="noopener">Google Play</a> for Android phones. Search
        “Rankveer” or use the button on this page. An iPhone version is not available yet.
      </>
    ),
  },
  {
    q: "Is Rankveer free?",
    a: "You can start without paying. Free users get the first mock of every exam's mock series, this year's and last year's previous-year papers, 3 live exams, selected chapter practice tests, the Daily GK Quiz every day and a personalised daily test for the first 7 days. Paid plans start at ₹59 for a month.",
  },
  {
    q: "Which exams can I prepare for?",
    a: "SSC CGL, CHSL, MTS and GD; RRB NTPC and Group D; UP Police Constable; UPSSSC PET; CTET, UPTET and UP Super TET; IBPS PO; and Agniveer Army GD and Technical. The number of mocks and papers differs from exam to exam and grows over time.",
  },
  {
    q: "Is Rankveer connected to SSC, the Army or any exam body?",
    a: "No. Rankveer is an independent practice platform. It is not affiliated with or endorsed by SSC, RRB, UPPRPB, UPSSSC, UPESSB, IBPS, CBSE, the Indian Army or any government body. Our tests follow each exam's published pattern and syllabus, but they are practice papers, not official ones.",
  },
  {
    q: "Will practising here get me selected?",
    a: "No app can promise that, and we don't. Rankveer gives you structured practice and shows where you are losing marks; your result in the real exam depends on your own preparation.",
  },
  {
    q: "Can I take tests in Hindi?",
    a: "Yes. Tests are available in Hindi and English, and you can switch language during the test. Solutions are shown in the language you took the test in.",
  },
  {
    q: "What if I find a wrong question or answer?",
    a: "Report it from inside the test with the report option on that question. We check every report and correct the question if it is wrong. Our answers may occasionally differ from an official answer key.",
  },
  {
    q: "How do live exams work?",
    a: "A live exam opens at a fixed time for everyone and runs for a fixed duration. If you join late, you only get the time that's left. When time is up, every attempt is submitted automatically, and ranks are released once the exam has ended. Live exams are announced in the app with a reminder before they start.",
  },
  { q: "Are the previous year papers real?", a: `Yes. The questions are taken from actual past papers, not written to look like them. Papers are added exam by exam; available now: ${site.pyqAvailable}.` },
  {
    q: "Can I use my account on two phones?",
    a: "One device at a time. Logging in on a new phone automatically logs you out of the old one, which keeps your account and plan safe.",
  },
  {
    q: "What happens when my plan ends?",
    a: "Nothing is charged automatically. Your account, test history and progress stay as they are, and the free-plan limits apply again. You can buy a new plan any time; buying early adds the new period after the days you have left.",
  },
  {
    q: "How do I get help or request a refund?",
    a: (
      <>
        Reach us through the <Link to="/contact/">contact page</Link>. Refund eligibility is explained in our{" "}
        <Link to="/refund-policy/">refund &amp; cancellation policy</Link>.
      </>
    ),
  },
];

// Keeps a grid's cards fading in one after another rather than all at once.
const stagger = (index, perRow) => (index % perRow) * 70;

/* ------------------------------------------------------------------ page */

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />

      {/* HIGHLIGHTS */}
      <section aria-label="Highlights" className="relative pb-2 pt-10">
        <div className="wrap">
          <Reveal className="grid gap-1 rounded-xl border border-line bg-surface p-3.5 shadow-card sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:px-3 lg:py-[22px] lg:[&>*+*]:border-l lg:[&>*+*]:border-line">
            {HIGHLIGHTS.map(({ Icon, tint, title, text }) => (
              <div key={text} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className={`icon-tile icon-tile-sm ${tint}`}>
                  <Icon />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-0.5 text-[13.5px] leading-snug text-slate">{text}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="kicker">What's inside</p>
            <h2 className="section-title">Practice, mocks and analysis in one app</h2>
            <p className="section-lead">Learn a chapter, test it, take a full mock, then see exactly which topics to go back to.</p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[22px]">
            {FEATURES.map(({ Icon, tint, title, text, tag }, i) => (
              <Reveal
                as="article"
                key={title}
                delay={stagger(i, 3)}
                className="card group p-[26px] transition duration-200 hover:-translate-y-[3px] hover:border-brand/25 hover:shadow-card"
              >
                <span className={`icon-tile ${tint}`}>
                  <Icon />
                </span>
                <h3 className="mt-[18px] text-[19px] font-bold">{title}</h3>
                <p className="mt-2 text-[15px] text-slate">{text}</p>
                {tag && <span className="mt-3.5 inline-block rounded-full bg-success-light px-2.5 py-1 text-xs font-bold text-success">{tag}</span>}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="section section-alt">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="kicker">How it works</p>
            <h2 className="section-title">A simple way to prepare</h2>
          </Reveal>

          <ol className="relative grid gap-4 min-[880px]:grid-cols-3 min-[880px]:gap-[22px]">
            {STEPS.map(({ title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 70} className="rounded-lg border border-line bg-surface px-[26px] py-7 shadow-soft">
                <span className="grid h-10 w-10 place-items-center rounded-sm bg-brand-gradient font-display text-base font-bold text-white shadow-brand">
                  {i + 1}
                </span>
                <h3 className="mt-[18px] text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-slate">{text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* EXAMS */}
      <section id="exams" className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="kicker">Exams covered</p>
            <h2 className="section-title">Built around the exam you're preparing for</h2>
            <p className="section-lead">{site.stats?.exams} exams, each with its own pattern, sections, syllabus and timing.</p>
          </Reveal>

          <ul className="grid gap-3.5 min-[560px]:grid-cols-2 lg:grid-cols-3 lg:gap-[18px]">
            {EXAMS.map(({ abbr, tint, name, exams }, i) => (
              <Reveal as="li" key={name} delay={stagger(i, 3)} className="card flex items-start gap-3.5 rounded-md p-[18px] lg:p-[22px]">
                <span className={`grid h-[50px] w-[50px] flex-none place-items-center rounded-[14px] border font-display text-[12px] font-bold ${tint}`}>
                  {abbr}
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-[-0.01em]">{name}</h3>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {exams.map((exam) => (
                      <li key={exam} className="rounded-full bg-slate-light px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft">
                        {exam}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <LiveExamsBand />
      <Pricing />

      {/* FAQ */}
      <section id="faq" className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="kicker">FAQ</p>
            <h2 className="section-title">Questions, answered</h2>
          </Reveal>

          <div className="mx-auto grid max-w-[820px] gap-3">
            {FAQS.map(({ q, a }) => (
              <Reveal as="details" key={q} className="faq-item">
                <summary>
                  {q}
                  <span className="faq-icon" aria-hidden="true" />
                </summary>
                <div className="faq-answer">{a}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Download />
    </>
  );
}

/* ------------------------------------------------------------------ sections */

function Hero() {
  return (
    <section className="relative overflow-hidden pb-14 pt-11 lg:pb-20 lg:pt-[68px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />

      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        <div>
          <a
            href={site.playStoreUrl || "#download"}
            target={site.playStoreUrl ? "_blank" : undefined}
            rel="noopener"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink-soft shadow-soft transition hover:border-brand/40 hover:text-brand"
          >
            <span className="h-2 w-2 flex-none rounded-full bg-success" />
            Now available on Google Play
            <span aria-hidden="true">→</span>
          </a>

          <h1 className="mt-5 text-[clamp(34px,5.4vw,58px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
            Prepare for government exams <span className="text-gradient">on the real pattern.</span>
          </h1>

          <p lang="hi" className="mt-4 text-[clamp(17px,2.1vw,21px)] font-semibold text-brand-dark">
            सरकारी परीक्षा की तैयारी — परीक्षा के असली पैटर्न पर, हिंदी और English में।
          </p>

          <p className="mt-3 max-w-[560px] text-[clamp(16px,1.7vw,18px)] text-slate">
            Mock tests built on each exam's official pattern, chapter-wise practice with a solution for every question, previous year papers
            and a free Daily GK Quiz — for SSC, Railway, UP Police, UPSSSC PET, teaching exams, Banking and Agniveer.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PlayButton className="max-sm:flex-[1_1_100%]" />
            <a href="#pricing" className="btn btn-secondary btn-lg max-sm:flex-[1_1_100%]">
              See plans
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-[22px] gap-y-2.5 text-sm font-medium text-ink-soft">
            {["Free to start", "No card needed", "Plans from ₹59 · no auto-renewal"].map((point) => (
              <li key={point} className="flex items-center gap-[7px]">
                <CheckIcon className="check-icon" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <PhoneMockup />
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section aria-label="Rankveer in numbers" className="relative">
      <div className="wrap">
        <Reveal className="overflow-hidden rounded-xl bg-live-band text-white shadow-lift">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map(({ value, label }, i) => (
              <div
                key={label}
                className={`px-5 py-6 text-center sm:px-7 sm:py-7 ${i % 2 ? "border-l border-white/10" : ""} ${i > 1 ? "border-t border-white/10 lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
              >
                <dt className="order-2 mt-1 text-[13px] font-medium text-white/70 sm:text-sm">{label}</dt>
                <dd className="font-display text-[clamp(26px,3.4vw,38px)] font-extrabold leading-none tracking-[-0.02em]">{value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
        <p className="mt-2.5 text-center text-[12.5px] text-slate">Figures as of {site.statsAsOf}.</p>
      </div>
    </section>
  );
}

// Illustrative app screen, not a screenshot. The vertical padding leaves room
// for the floating cards to sit over the phone's frame rather than over the
// screen content.
function PhoneMockup() {
  const options = [
    ["A", "70"],
    ["B", "78.75", true],
    ["C", "80.50"],
    ["D", "75"],
  ];

  return (
    <figure className="relative">
      <div aria-hidden="true" className="relative flex justify-center py-[50px]">
        <div className="relative w-[290px] -rotate-[2.5deg] rounded-[46px] bg-ink p-[11px] shadow-phone lg:w-[316px]">
          <div className="absolute left-1/2 top-[11px] z-10 h-[22px] w-[98px] -translate-x-1/2 rounded-b-[14px] bg-ink" />

          <div className="overflow-hidden rounded-[36px] bg-bg px-[15px] pb-[18px] pt-[38px]">
            <div data-ps-top className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-slate">SSC CGL · Mock test</p>
                <p className="mt-0.5 font-display text-[14.5px] font-bold leading-tight text-ink">Quantitative Aptitude</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-light px-2 py-1 text-xs font-bold tabular-nums text-danger">
                <ClockIcon className="!h-[13px] !w-[13px] [stroke-width:2.6]" />
                42:18
              </span>
            </div>

            <div className="mb-3 mt-3.5 h-[5px] overflow-hidden rounded-full bg-[#E3E6EF]">
              <span className="block h-full w-[24%] rounded-full bg-brand-gradient" />
            </div>

            <div className="flex items-center justify-between text-[11px] font-semibold text-slate">
              <span>Question 24 of 100</span>
              <span className="inline-flex overflow-hidden rounded-xs border border-line bg-surface">
                <b className="bg-brand px-2 py-0.5 text-white">EN</b>
                <i lang="hi" className="px-2 py-0.5 not-italic">
                  हिं
                </i>
              </span>
            </div>

            <div className="mt-2.5 rounded-md border border-line bg-surface p-[13px] text-[13px] font-semibold leading-normal text-ink">
              If 20% of a number is 45, what is 35% of the same number?
            </div>

            <ul className="mt-2.5 grid gap-2 text-[13px] font-semibold">
              {options.map(([letter, value, selected]) => (
                <li
                  key={letter}
                  className={`flex items-center gap-2.5 rounded-sm border-[1.5px] px-2.5 py-2 ${
                    selected ? "border-brand bg-brand-tint text-brand-dark" : "border-line bg-surface text-ink-soft"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-xs text-[11px] font-bold ${
                      selected ? "bg-brand text-white" : "bg-slate-light text-slate"
                    }`}
                  >
                    {letter}
                  </span>
                  {value}
                </li>
              ))}
            </ul>

            <div data-ps-actions className="mt-3.5 grid grid-cols-2 gap-2 text-xs font-bold">
              <span className="grid place-items-center rounded-sm border border-line bg-surface px-1.5 py-2.5 text-ink-soft">Mark for review</span>
              <span className="grid place-items-center rounded-sm bg-brand-gradient px-1.5 py-2.5 text-white">Save &amp; next</span>
            </div>
          </div>
        </div>

        <div
          data-float-live
          className="absolute left-0 top-0.5 z-20 flex items-center gap-2.5 rounded-md border border-line bg-white/95 px-3 py-2.5 shadow-lift backdrop-blur min-[601px]:left-[calc(50%_-_272px)] min-[601px]:px-3.5 min-[601px]:py-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-brand-tint text-brand">
            <LanguageIcon />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-slate">Language</p>
            <p className="font-display text-base font-bold leading-tight">
              <span lang="hi">हिंदी</span> · English
            </p>
          </div>
        </div>

        <div
          data-float-rank
          className="absolute bottom-0.5 right-0 z-20 flex items-center gap-2.5 rounded-md border border-line bg-white/95 px-3 py-2.5 shadow-lift backdrop-blur min-[601px]:right-[calc(50%_-_272px)] min-[601px]:px-3.5 min-[601px]:py-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-success-light text-success">
            <CheckIcon className="[stroke-width:2.6]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-slate">After every test</p>
            <p className="font-display text-base font-bold leading-tight">Step-by-step solutions</p>
          </div>
        </div>
      </div>
      <figcaption className="text-center text-[12px] text-slate-soft">Illustration of the test screen</figcaption>
    </figure>
  );
}

function LiveExamsBand() {
  return (
    <section id="live-exams" className="relative overflow-hidden bg-live-band py-[84px] text-white lg:py-[104px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-live-glow" />

      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <p className="kicker text-[#C3B1FA]">Live exams</p>
          <h2 className="mt-2.5 text-[clamp(30px,3.8vw,46px)] font-extrabold tracking-[-0.03em] text-white">The exam hall, on your phone.</h2>
          <p className="mt-4 max-w-[560px] text-[17px] text-white/80">
            Mock tests show what you know. A live exam shows where you stand — everyone preparing for the same exam takes the same paper at
            the same moment, and gets an all-India rank when it ends.
          </p>

          <ul className="mt-7 grid gap-3.5 text-base text-white/90">
            {LIVE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span className="mt-px grid h-6 w-6 flex-none place-items-center rounded-xs bg-emerald-400/20 text-emerald-300">
                  <CheckIcon className="!h-[15px] !w-[15px] [stroke-width:3]" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal
          aria-hidden="true"
          className="relative w-full max-w-[440px] justify-self-center rounded-xl border border-white/15 bg-white/[0.06] p-7 shadow-[0_40px_70px_-35px_rgb(0_0_0/0.6)] backdrop-blur-md"
        >
          <span className="absolute right-4 top-4 rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-semibold text-white/60">Example</span>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-red-500/20 px-[11px] py-[5px] text-xs font-extrabold tracking-[0.08em] text-red-300">
              <span className="live-dot" />
              LIVE
            </span>
            <span className="text-sm font-semibold text-white/80">All-India mock</span>
          </div>

          <p className="mt-6 text-[12.5px] font-bold uppercase tracking-[0.09em] text-white/60">Starts in</p>
          <Countdown seconds={760} />

          <div className="mt-[22px] grid gap-2.5 text-sm text-white/70">
            {[
              ["Questions", "100"],
              ["Duration", "60 minutes"],
              ["Negative marking", "As in the exam"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-dashed border-white/15 pb-2.5">
                <span>{label}</span>
                <b className="text-white">{value}</b>
              </div>
            ))}
          </div>

          <span className="mt-[22px] flex items-center justify-center gap-2 rounded-[14px] bg-white p-[13px] text-[15px] font-bold text-brand-dark">
            <BellIcon className="!h-[18px] !w-[18px]" />
            Remind me
          </span>
        </Reveal>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="section section-alt">
      <div className="wrap">
        <Reveal className="section-head">
          <p className="kicker">Plans</p>
          <h2 className="section-title">Start free. Upgrade when you're ready.</h2>
          <p className="section-lead">One payment for the period you choose. No auto-renewal and nothing charged later.</p>
        </Reveal>

        <div className="grid items-stretch gap-[18px] sm:grid-cols-2 lg:grid-cols-3 min-[1280px]:grid-cols-5 min-[1280px]:gap-4">
          {PLANS.map(({ name, price, days, sub, features, featured, lowest }, i) => (
            <Reveal
              as="article"
              key={name}
              delay={i * 70}
              // `top` rather than a transform for the raised card: the reveal
              // animation owns transform and would snap it 10px on finishing.
              className={`relative flex flex-col rounded-xl px-6 pb-6 pt-[30px] min-[1280px]:px-5 ${
                featured ? "price-featured min-[1280px]:-top-2.5" : "border border-line bg-surface shadow-soft"
              }`}
            >
              {featured && (
                <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-bold text-white shadow-brand">
                  Recommended
                </span>
              )}
              <div className="flex items-center justify-between gap-2">
                <h3 className="whitespace-nowrap text-[17px] font-bold text-ink-soft min-[1280px]:text-base">{name}</h3>
                {lowest && (
                  <span className="whitespace-nowrap rounded-full bg-success-light px-2.5 py-1 text-xs font-bold text-success min-[1280px]:px-2 min-[1280px]:text-[11px]">
                    Lowest per day
                  </span>
                )}
              </div>
              <p className="mt-3.5 font-display text-[44px] font-extrabold leading-none tracking-[-0.03em] min-[1280px]:text-[38px]">₹{price}</p>
              <p className="mt-2 text-sm text-slate">{days ? `${days} days · ${perDay(price, days)}` : sub}</p>
              <ul className="mb-[26px] mt-[22px] grid flex-1 content-start gap-[11px] border-t border-line pt-[22px] text-[14.5px] leading-snug text-ink-soft">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <CheckIcon className="check-icon mt-px" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#download" className={`btn w-full ${featured ? "btn-primary" : "btn-secondary"}`}>
                {price ? `Get ${name.toLowerCase()}` : "Start free"}
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className="mx-auto mt-[34px] grid max-w-[760px] gap-2 text-center text-[14.5px] text-slate">
          <p>
            Prices are in Indian Rupees. Plans are bought inside the app, and the final amount is shown before you pay. Payments are processed
            by Razorpay — UPI, cards and net banking. Buying a new plan before the current one ends adds the new period after your remaining days.
          </p>
          <p>
            Refer &amp; Earn (limited-time offer): earn ₹5 credit for each friend who signs up with your code. Credits can pay for up to half
            of a 3, 6 or 12-month plan; the 1 Month plan takes no credits or coupons. See the <Link to="/terms/" className="font-semibold text-brand">terms</Link>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function Download() {
  return (
    <section id="download" className="pb-[92px]">
      <div className="wrap">
        <Reveal className="relative overflow-hidden rounded-xxl bg-brand-gradient px-6 py-14 text-center text-white shadow-[0_34px_70px_-34px_rgb(79_70_229/0.65)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-[90px] -top-[140px] h-[360px] w-[360px] rounded-full border-[48px] border-white/[0.06]" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-[160px] -left-[110px] h-[320px] w-[320px] rounded-full border-[48px] border-white/[0.06]" />

          <div className="relative">
            <img
              src="/images/logo-mark.png"
              alt=""
              width="76"
              height="76"
              loading="lazy"
              className="mx-auto h-[76px] w-[76px] rounded-[22px] shadow-[0_16px_34px_-12px_rgb(0_0_0/0.4)]"
            />
            <h2 className="mt-[22px] text-[clamp(28px,3.8vw,42px)] font-extrabold tracking-[-0.03em] text-white">Start with one free mock test.</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[17px] text-white/85">
              Install Rankveer from Google Play, choose your exam and take the first mock of its series free.
            </p>

            <PlayButton tone="light" className="mt-7" />
            <p className="mt-3.5 text-sm text-white/70">Free download · Android 7 or newer</p>

            {site.playStoreUrl && site.apkUrl && (
              <p className="mx-auto mt-5 max-w-[520px] text-[13px] text-white/65">
                Can't use Google Play?{" "}
                <a href={site.apkUrl} download className="font-semibold text-white underline underline-offset-[3px] hover:text-white">
                  Download the app file
                </a>{" "}
                (version {site.apkVersion}, {site.apkSizeMb} MB). Download it only from rankveer.com.
              </p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
