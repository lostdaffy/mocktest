# Rankveer marketing brief

Everything a marketing session needs, without reading the app code.

## The product
- **Rankveer**: an Android app for Indian government-job exam preparation. It is live on Google Play (India): https://play.google.com/store/apps/details?id=com.satya.smarttestengine
- Website: https://rankveer.com
- Spelling is always **Rankveer** (never "RankVeer"). Tagline: **Learn • Practice • Improve**.
- **Exams covered:** SSC (CGL, CHSL, MTS, GD), Railway (RRB NTPC, Group D), UP Police Constable, UPTET, CTET, Super TET, UPSSSC PET, IBPS PO (Banking), Agniveer.
- **Features:**
  - full mock tests, 10 per exam
  - chapter-wise practice from easy to advanced
  - previous-year papers (PYQs)
  - a new Daily GK Quiz every day at 12 AM, with a rank board
  - live exams
  - result analysis that shows weak topics
  - questions in Hindi and English, with solutions
  - dark mode
- **Price:** free to start, no card needed. Paid plans start at ₹59/month, with 3-, 6- and 12-month plans. Check current prices in the admin Payments page before quoting a number.
- **Refer & Earn:** students earn credit when a friend signs up with their code.

## Rules for every piece of marketing
1. **Never imply a government link.**
   - Do not use official logos (SSC, RRB, UP Police, UPSSSC, Army) or emblems.
   - Use the exam names as plain text only.
   - Add the line "Rankveer एक स्वतंत्र ऐप है, किसी सरकारी संस्था से संबद्ध नहीं।" where there is room.
2. **No made-up numbers.** No fake student counts, selections, ratings or "toppers". Use only what is true and checkable.
3. **Brand colours:**
   - navy `#0b1033` / `#172554`
   - indigo `#4F46E5` / `#6d5dfc`
   - violet `#a78bfa`
   - accent amber `#fbbf24`
4. **Language:** captions and voice in Hindi (Devanagari), with English for exam and feature names where students say them that way.
5. **Before posting:** anything that goes public (posting, sending, paid promotion) needs the owner's yes first.

## Assets
- `mobile/assets/icon.png`: app icon (1024²). `mobile/assets/brand-logo.png` has dark text, so use it on light backgrounds only.
- `mobile/store-screenshots/1-home … 6-practice.png`: real app screens (450×800).
- `mobile/assets/play-feature-graphic-1024x500.png`, `mobile/store-listing.md`: Play Store graphic and listing text.

## Reel pipeline (`marketing/reel/`)
Free tools only, no accounts. Run `npm install` once in `marketing/reel/`.

1. `script.js`: scenes. `say` is the voice text, `show` is the on-screen caption. Voice is `hi-IN-SwaraNeural` (Microsoft Edge TTS, free). `hi-IN-MadhurNeural` is the male voice.
2. `node voice.js`: makes `audio/voice.wav` and `audio/timeline.json`.
3. `reel.html`: the animation. Every motion is a Web Animation timed from the timeline.
4. `node render.js 2 7 13`: preview stills go into `preview/`.
5. `node render.js`: full render to `rankveer-reel.mp4` (1080×1920, 30 fps).

The first reel (28.7 s, made 2026-11-05) is `marketing/reel/rankveer-reel.mp4`. It has no background music, so add music inside Instagram.
