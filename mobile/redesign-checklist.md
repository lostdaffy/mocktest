# App redesign + dark/light checklist

Per screen: new design (same look as Welcome / Login: navy header band, soft cards, one clear action) + works in light AND dark (colours from `useTheme()`, never the static `colors`).
`[x]` = done, verified in the browser preview in both light and dark.

## 0. Foundation (once, before the screens)
- [ ] theme.js: `useTheme()` hook (follows the phone's light/dark setting), dark palette checked for contrast
- [ ] app.json: `userInterfaceStyle` "light" -> "automatic" (right now dark is switched off for the whole app)
- [ ] App.js: StatusBar, tab bar, stack headers, ResponsiveShell, LiveTab follow the theme
- [ ] Shared components: AppAlert, ContinueCard, FirstRunGuide, OfficialSources, QuestionOfDayCard, QuestionVisual, ReferEarnCard, TodayPlanCard

## 1. Start (signed out)
- [x] Splash (dark by design)
- [x] Welcome (dark by design)
- [ ] Login: dark/light for the form card
- [ ] Signup (2 steps: details, OTP): dark/light
- [ ] ForgotPassword (1737 lines): new design + dark/light
- [ ] ForceUpdate

## 2. The 5 bottom tabs
- [ ] Home (2656 lines)
- [ ] Mock Tests tab: ExamPicker (2180) - already half dark-aware
- [ ] Practice tab: Subjects (1403)
- [ ] Previous Papers tab: PyqExamPicker (1445)
- [ ] Live tab (in App.js)

## 3. Practice flow
- [ ] SelectSubjects (1548)
- [ ] ChapterList (2018) - already half dark-aware
- [ ] PracticeMode (300) - already half dark-aware
- [ ] ChapterPractice (2967) - already half dark-aware
- [ ] TestList (2722) - already half dark-aware

## 4. Mock / PYQ flow
- [ ] ExamSeries (2283)
- [ ] PyqYearList (1531)
- [ ] PyqPapers (1871)

## 5. Taking a test and after it
- [ ] TestTaking (3550) - the exam screen; careful, nothing may break
- [ ] Result (2682)
- [ ] Analysis (1438) - already half dark-aware
- [ ] History (1737)
- [ ] QuizBoard (184)

## 6. Account and money
- [ ] Profile (2715)
- [ ] Notifications (193)
- [ ] Subscription (1551)
- [ ] Payment (2596) - payment flow, no logic change
- [ ] Referral (1776)

## Rules for every screen
- Logic, API calls and navigation stay as they are; only layout, colours, spacing, text size.
- Fewer words, clearer hierarchy (same rule as the Welcome feedback).
- Checked in the browser preview at 390x844 in light and dark before the commit; one commit per screen or small group.
- Some screens need a logged-in user. The browser can't reach the live API (CORS), so those are checked against a local server with a test account.
