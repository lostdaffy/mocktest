import { Link } from "react-router-dom";
import Reveal from "../components/Reveal";
import Countdown from "../components/Countdown";
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
  PhoneIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  TrophyIcon,
} from "../components/icons";

export const meta = {
  title: "Rankveer – Mock Tests, PYQs & Live Exams for SSC, Railway, UP Police, Banking & CTET",
  description:
    "Practice like the real exam. Exam-pattern mock tests, genuine previous year papers and live exams with an all-India rank – in Hindi and English. Free to start.",
  organizationSchema: true,
};

/* ------------------------------------------------------------------ data */

const HIGHLIGHTS = [
  { Icon: LayersIcon, tint: "tint-blue", title: "Real exam pattern", text: "Same sections, timing and negative marking" },
  { Icon: ShieldCheckIcon, tint: "tint-green", title: "Genuine PYQs", text: "Actual previous-year questions, not look-alikes" },
  { Icon: BroadcastIcon, tint: "tint-red", title: "Live all-India rank", text: "Same paper, same start time for everyone" },
  { Icon: LanguageIcon, tint: "tint-violet", title: <><span lang="hi">हिंदी</span> + English</>, text: "Switch language any time during a test" },
];

const FEATURES = [
  {
    Icon: ClipboardCheckIcon,
    tint: "tint-blue",
    title: "Full-length mock tests",
    text: "The same sections, number of questions, time limit and negative marking as the real paper — so exam day feels familiar.",
  },
  {
    Icon: FileTextIcon,
    tint: "tint-green",
    title: "Previous year papers",
    text: "Real questions from past papers, organised by exam and year — practise them exactly as they were asked.",
    tag: "This year & last year free",
  },
  {
    Icon: BroadcastIcon,
    tint: "tint-red",
    title: "Live exams",
    text: "One paper, one start time, one all-India rank. Every attempt is submitted automatically when time runs out.",
  },
  {
    Icon: TrendingUpIcon,
    tint: "tint-orange",
    title: "Chapter-wise practice",
    text: "Start at Easy and move up to Medium, Hard and Advanced as your accuracy in each chapter improves.",
    tag: "Topic practice always free",
  },
  {
    Icon: BarChartIcon,
    tint: "tint-violet",
    title: "Detailed analysis",
    text: "Topic-by-topic accuracy with your weakest areas first — and whether you lose marks to speed or to concepts.",
  },
  {
    Icon: LanguageIcon,
    tint: "tint-teal",
    title: "Hindi and English",
    text: "Switch language in the middle of a test. Solutions appear in the same language you attempted it in.",
  },
];

const STEPS = [
  { title: "Choose your exam", text: "Pick SSC CGL, RRB NTPC, UP Police Constable, IBPS PO or CTET, and the subjects you're studying." },
  { title: "Practise and take mocks", text: "Build concepts chapter by chapter, then test yourself on full mocks and real previous-year papers." },
  { title: "Compete and improve", text: "Join live exams for an all-India rank, and use your analysis to fix weak topics before the real exam." },
];

const LIVE_POINTS = [
  "Starts at the same time for everyone — joining late doesn't buy extra time",
  "Every attempt is submitted automatically when time runs out",
  "Ranks are released once the exam ends, so every result is compared fairly",
  "A reminder notification before the exam begins, so you never miss one",
];

const EXAMS = [
  { abbr: "SSC", tint: "tint-blue", name: "SSC CGL", detail: "Tier 1" },
  { abbr: "RRB", tint: "tint-orange", name: "RRB NTPC", detail: "CBT 1" },
  { abbr: "UP", tint: "tint-red", name: "UP Police", detail: "Constable" },
  { abbr: "IBPS", tint: "tint-green", name: "IBPS PO", detail: "Prelims" },
  { abbr: "CTET", tint: "tint-violet", name: "CTET", detail: "Paper 1" },
];

const PREMIUM = ["Unlimited mock tests", "Every live exam", "All previous year papers", "Personalised daily test", "Everything in Free"];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    sub: "No payment needed",
    cta: "Start free",
    features: [
      "5 full mock tests",
      "3 live exams",
      "This year's & last year's papers",
      "Unlimited topic-wise practice",
      "Detailed analysis of every test",
      "7-day trial of personalised daily test",
    ],
  },
  { name: "3 months", price: "₹149", sub: "About ₹1.66 a day", cta: "Get 3 months", features: PREMIUM },
  { name: "6 months", price: "₹249", sub: "About ₹1.38 a day", cta: "Get 6 months", features: PREMIUM, featured: true },
  { name: "12 months", price: "₹449", sub: "About ₹1.23 a day", cta: "Get 12 months", features: PREMIUM },
];

const FAQS = [
  {
    q: "Is Rankveer free?",
    a: "Yes, you can start without paying. The free plan includes 5 full mock tests, 3 live exams, this year's and last year's previous-year papers, and unlimited topic-wise practice. Upgrade only when you want more.",
  },
  { q: "Which exams can I prepare for?", a: "SSC CGL, RRB NTPC, UP Police Constable, IBPS PO and CTET, with more being added regularly." },
  {
    q: "Can I take tests in Hindi?",
    a: "Yes. Tests are available in Hindi and English, and you can switch language during the test. When you review your result, solutions are shown in the language you took the test in.",
  },
  {
    q: "How do live exams work?",
    a: "A live exam opens at a fixed time for everyone and runs for a fixed duration. If you join late, you only get the time that's left. When time is up, every attempt is submitted automatically, and ranks are released once the exam has ended. You'll get a reminder notification before it starts.",
  },
  { q: "Are the previous year papers real?", a: "Yes. The questions are taken from actual past papers — they are not written to look like them." },
  {
    q: "Can I use my account on two phones?",
    a: "One device at a time. Logging in on a new phone automatically logs you out of the old one, which keeps your account and subscription safe.",
  },
  {
    q: "What happens when my plan ends?",
    a: "Your account, test history and progress stay exactly as they are — the free-plan limits simply apply again. You can renew any time, and renewing early adds the new period on top of the days you have left.",
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

      {/* HIGHLIGHTS */}
      <section aria-label="Highlights" className="relative pb-2">
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
            <p className="kicker">Everything you need</p>
            <h2 className="section-title">One app for your whole preparation</h2>
            <p className="section-lead">From your first chapter to your final mock — practise, measure and improve in one place.</p>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-[22px]">
            {FEATURES.map(({ Icon, tint, title, text, tag }, i) => (
              <Reveal
                as="article"
                key={title}
                delay={stagger(i, 3)}
                className="card p-[26px] transition duration-200 hover:-translate-y-[3px] hover:border-brand/25 hover:shadow-card"
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
            <h2 className="section-title">From sign-up to rank in three steps</h2>
          </Reveal>

          <ol className="grid gap-4 min-[880px]:grid-cols-3 min-[880px]:gap-[22px]">
            {STEPS.map(({ title, text }, i) => (
              <Reveal as="li" key={title} delay={i * 70} className="rounded-lg border border-line bg-surface px-[26px] py-7">
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

      <LiveExamsBand />

      {/* EXAMS */}
      <section id="exams" className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <p className="kicker">Exams covered</p>
            <h2 className="section-title">Built for the exam you're preparing for</h2>
          </Reveal>

          <ul className="grid gap-3.5 min-[560px]:grid-cols-2 lg:grid-cols-5">
            {EXAMS.map(({ abbr, tint, name, detail }, i) => (
              <Reveal
                as="li"
                key={name}
                delay={i * 70}
                className="card flex items-center gap-3.5 rounded-md p-[18px] lg:flex-col lg:items-start lg:p-[22px]"
              >
                <span className={`grid h-[50px] w-[50px] flex-none place-items-center rounded-[14px] border font-display text-[13px] font-bold ${tint}`}>
                  {abbr}
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-[-0.01em]">{name}</h3>
                  <p className="mt-0.5 text-[13.5px] text-slate">{detail}</p>
                </div>
              </Reveal>
            ))}
          </ul>

          <Reveal as="p" className="mt-6 text-center text-[15px] text-slate">
            More exams are being added regularly.
          </Reveal>
        </div>
      </section>

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
    <section className="relative overflow-hidden pb-16 pt-11 lg:pb-24 lg:pt-[72px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-glow" />

      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-10">
        <div>
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-ink-soft shadow-soft">
            <span className="h-2 w-2 flex-none rounded-full bg-brand-gradient" />
            SSC · Railway · UP Police · Banking · CTET
          </p>

          <h1 className="mt-5 text-[clamp(34px,5.6vw,60px)] font-extrabold leading-[1.08] tracking-[-0.035em]">
            Practice like the real exam. <span className="text-gradient">Rank like a topper.</span>
          </h1>

          <p lang="hi" className="mt-4 text-[clamp(17px,2.1vw,21px)] font-semibold text-brand-dark">
            सरकारी परीक्षा की तैयारी — बिल्कुल असली परीक्षा जैसी।
          </p>

          <p className="mt-3 max-w-[560px] text-[clamp(16px,1.7vw,18px)] text-slate">
            Mock tests built on the actual exam pattern, genuine previous-year papers, and live exams that give you an all-India rank. In
            Hindi and English.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#download" className="btn btn-primary btn-lg max-sm:flex-[1_1_100%]">
              <PhoneIcon />
              Get the app
            </a>
            <a href="#pricing" className="btn btn-secondary btn-lg max-sm:flex-[1_1_100%]">
              See plans
            </a>
          </div>

          <ul className="mt-6 flex flex-wrap gap-x-[22px] gap-y-2.5 text-sm font-medium text-ink-soft">
            {["Free to start", "No card needed", "5 free mock tests"].map((point) => (
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
    <div aria-hidden="true" className="relative flex justify-center py-[50px]">
      <div className="relative w-[290px] -rotate-[2.5deg] rounded-[46px] bg-ink p-[11px] shadow-phone lg:w-[316px]">
        <div className="absolute left-1/2 top-[11px] z-10 h-[22px] w-[98px] -translate-x-1/2 rounded-b-[14px] bg-ink" />

        <div className="overflow-hidden rounded-[36px] bg-bg px-[15px] pb-[18px] pt-[38px]">
          <div data-ps-top className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate">SSC CGL · Mock 12</p>
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
        <span className="live-dot" />
        <div>
          <p className="text-[11px] font-semibold text-slate">Live exam</p>
          <p className="font-display text-base font-bold leading-tight tabular-nums">Starts in 12:40</p>
        </div>
      </div>

      <div
        data-float-rank
        className="absolute bottom-0.5 right-0 z-20 flex items-center gap-2.5 rounded-md border border-line bg-white/95 px-3 py-2.5 shadow-lift backdrop-blur min-[601px]:right-[calc(50%_-_272px)] min-[601px]:px-3.5 min-[601px]:py-3"
      >
        <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-warn-light text-warn">
          <TrophyIcon />
        </span>
        <div>
          <p className="text-[11px] font-semibold text-slate">All-India rank</p>
          <p className="font-display text-base font-bold leading-tight tabular-nums">#128</p>
        </div>
        <span className="rounded-full bg-success-light px-2 py-1 text-[11px] font-bold text-success max-[600px]:hidden">82% accuracy</span>
      </div>
    </div>
  );
}

function LiveExamsBand() {
  return (
    <section id="live-exams" className="relative overflow-hidden bg-live-band py-[84px] text-white lg:py-[108px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-live-glow" />

      <div className="wrap relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Reveal>
          <p className="kicker text-[#B8ADFF]">Live exams</p>
          <h2 className="mt-2.5 text-[clamp(30px,3.8vw,46px)] font-extrabold tracking-[-0.03em] text-white">The exam hall, on your phone.</h2>
          <p className="mt-4 max-w-[560px] text-[17px] text-white/80">
            Mock tests show what you know. Live exams show where you stand — against everyone preparing for the same exam, on the same
            paper, at the same moment.
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
          className="w-full max-w-[440px] justify-self-center rounded-xl border border-white/15 bg-white/[0.06] p-7 shadow-[0_40px_70px_-35px_rgb(0_0_0/0.6)] backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-[7px] rounded-full bg-red-500/20 px-[11px] py-[5px] text-xs font-extrabold tracking-[0.08em] text-red-300">
              <span className="live-dot" />
              LIVE
            </span>
            <span className="text-sm font-semibold text-white/80">SSC CGL · All-India Mock</span>
          </div>

          <p className="mt-6 text-[12.5px] font-bold uppercase tracking-[0.09em] text-white/60">Starts in</p>
          <Countdown seconds={760} />

          <div className="mt-[22px] grid gap-2.5 text-sm text-white/70">
            {[
              ["Questions", "100"],
              ["Duration", "60 minutes"],
              ["Negative marking", "0.50 per wrong"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-dashed border-white/15 pb-2.5">
                <span>{label}</span>
                <b className="text-white">{value}</b>
              </div>
            ))}
          </div>

          <span className="mt-[22px] flex items-center justify-center gap-2 rounded-[14px] bg-white p-[13px] text-[15px] font-bold text-brand-dark">
            <BellIcon className="!h-[18px] !w-[18px]" />
            Reminder set
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
          <p className="kicker">Simple pricing</p>
          <h2 className="section-title">Start free. Upgrade when you're ready.</h2>
          <p className="section-lead">One-time payment for the period you choose. No auto-renewal and no hidden charges.</p>
        </Reveal>

        <div className="grid items-stretch gap-[18px] sm:grid-cols-2 min-[1100px]:grid-cols-4 min-[1100px]:gap-4">
          {PLANS.map(({ name, price, sub, cta, features, featured }, i) => (
            <Reveal
              as="article"
              key={name}
              delay={i * 70}
              // `top` rather than a transform for the raised card: the reveal
              // animation owns transform and would snap it 10px on finishing.
              className={`relative flex flex-col rounded-xl px-6 pb-6 pt-[30px] ${
                featured ? "price-featured min-[1100px]:-top-2.5" : "border border-line bg-surface shadow-soft"
              }`}
            >
              {featured && (
                <span className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand-gradient px-3.5 py-1.5 text-xs font-bold text-white shadow-brand">
                  Best value
                </span>
              )}
              <h3 className="text-[17px] font-bold text-ink-soft">{name}</h3>
              <p className="mt-3.5 font-display text-[44px] font-extrabold leading-none tracking-[-0.03em]">{price}</p>
              <p className="mt-2 text-sm text-slate">{sub}</p>
              <ul className="mb-[26px] mt-[22px] grid flex-1 content-start gap-[11px] border-t border-line pt-[22px] text-[14.5px] leading-snug text-ink-soft">
                {features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <CheckIcon className="check-icon mt-px" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="#download" className={`btn w-full ${featured ? "btn-primary" : "btn-secondary"}`}>
                {cta}
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal as="p" className="mx-auto mt-[34px] max-w-[660px] text-center text-[14.5px] text-slate">
          Plans are bought inside the app. Payments are processed securely by Razorpay — UPI, cards and net banking. Renew before your plan
          ends and the new period is added on top, so you never lose remaining days.
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
            <h2 className="mt-[22px] text-[clamp(28px,3.8vw,42px)] font-extrabold tracking-[-0.03em] text-white">Your rank starts with one test.</h2>
            <p className="mx-auto mt-3 max-w-[520px] text-[17px] text-white/85">
              Download Rankveer, choose your exam and take your first mock test free.
            </p>

            {site.playStoreUrl ? (
              <a href={site.playStoreUrl} rel="noopener" className="btn btn-light btn-lg mt-7">
                <PhoneIcon />
                Get it on Google Play
              </a>
            ) : (
              <>
                <span aria-disabled="true" className="btn btn-light btn-lg btn-soon mt-7">
                  <PhoneIcon />
                  Android app — coming soon
                </span>
                <p className="mt-3.5 text-sm text-white/70">Launching on Google Play very soon.</p>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
