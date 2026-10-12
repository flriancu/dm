# Dream Course — Requirements

Status: draft v0.1, 2026-10-12. Owner: Florin Iancu. Reviewer: Florin.
Companion document: [COURSE-OUTLINE.md](COURSE-OUTLINE.md) (module-by-module content).

## 1. Purpose

Recreate, for people in Florin's life, the experience of the May–July 2026 employer
Dream Management pilot (facilitator Adina Stoicescu, certified Dream Manager, Mirela
Oprea's CHILD / COPIL method), without the employer: no Teams, no HR, no company goals.

The course must deliver the three things the pilot's closing survey said worked:
a paper Dream Book that the learner writes in by hand, a small set of concrete tools
(100 dreams list, Eisenhower, saboteurs, Wheel of Life, future-self letter, Dream
Vision), and a trusted human partner for the pair exercises and 1:1 sessions.

## 2. Decisions already taken (elicitation log, 2026-10-12)

| # | Topic | Decision |
|---|-------|----------|
| D1 | Audience | One learner first, with Florin as Dream Friend. Group use is desirable later, but participants may not want to share with close acquaintances, so a group is never required. |
| D2 | Roles | Roles are assignable, not fixed to people (revised 2026-10-12). Two roles, Dreamer and Dream Friend, and three supported configurations: (a) one Dreamer plus a non-participating Dream Friend, (b) a peer pair in which both are Dreamers and alternate as Dream Friend, (c) one Dream Friend plus a group of Dreamers. Content is written for the roles, never for a named person; each pair exercise and 1:1 script carries the variants for all three configurations. |
| D3 | Delivery | Interactive web app plus a printable Dream Book (PDF). Paper is the learner's preferred medium; the app must be equally good on laptop and phone. |
| D4 | Language | Interface (menus, buttons, labels, errors) in Romanian and English. Course content (module text, exercises, Dream Book sheets, Dream Friend scripts) in Romanian only for v1, COPIL letters. Infrastructure must make a further content language a matter of adding files, not code (revised 2026-10-12). |
| D5 | Cadence | 7 modules, one every two weeks, about 14 weeks. Sessions 1.5–2.5 h. Light between-session practice, never a long homework list. |
| D6 | Data sharing | Nothing leaves the learner's device by default. A share action produces a summary the learner chooses to send before a 1:1. |
| D7 | Licensing | Keep the CHILD/COPIL letters, the saboteur and Sage names, with explicit attribution. Link out to the official saboteurs test, the VIA survey and book pages. No book PDFs or long excerpts embedded. Private, non-commercial use among friends and family. |
| D8 | Stack | Static single-page app, no application backend. |
| D9 | Hosting and repo | Source repository on **GitHub**. Hosting on Florin's existing **S3 + CloudFront** site (floriniancu.ro), as a subpath or subdomain. A GitHub Actions workflow builds on push to main and syncs the build to S3, then invalidates CloudFront. No application backend. |
| D10 | Gaps in the source material | The 1:1 session content and the guest session on fear (session 4, no deck) are reconstructed from the method, Adina's notes and the referenced books. Florin corrects afterwards. |
| D11 | Next step | This requirements document and the outline, reviewed before any code. |
| D12 | Videos | The two short Chamine recordings from the pilot may be hosted inside the course (2026-10-12). |
| D13 | Framework | React (Vite + React + TypeScript). |
| D14 | Repository | Private GitHub repository. |
| D15 | Schedule | No fixed start date; the learner sets the start date and the two-week cadence runs from it. |
| D16 | 1:1 content | No additional 1:1 material beyond the reconstructed scripts; 1:1s depend strongly on the person, so scripts stay short and question-based. |
| D17 | Evidence review | An assessment of the materials against the scientific literature is part of the deliverable, see [ASSESSMENT.md](ASSESSMENT.md); every evidence claim there rests on a Crossref-verified peer-reviewed article (v0.2). |

## 3. Users and roles

Two roles, assignable per person and per session (D2):

- **Dreamer.** Works on their own dream. Adult, prefers paper, uses a laptop and a
  phone. Works alone between sessions, meets a Dream Friend every two weeks.
- **Dream Friend.** Runs the sessions, holds the Dream Friend section, plays the second
  role in pair exercises, never sees a Dreamer's data unless it is sent. In a peer pair
  the role rotates; in a group one person holds it for the session.

Supported configurations for v1, all local-first with no shared storage:

| Configuration | Who | What differs |
|---|---|---|
| Solo + Friend | one Dreamer, one non-participating Dream Friend (the first learner with Florin) | the base case; pair exercises run once, with the Dreamer in the learner seat |
| Peer pair | two Dreamers who alternate as Dream Friend | each pair exercise runs twice, seats swapped; 1:1 scripts run once per person; each device is set to "both" and marks who holds the role today |
| Friend + group | one Dream Friend, 3–8 Dreamers | session plans add a check-in round, pair forming and a group debrief; pair exercises run in pairs within the group; 1:1s are optional and booked per Dreamer |

A group's shared board and word cloud (FR-70) stay deferred; the group configuration
in v1 is content and session plans only, run live by the Dream Friend.

## 4. Functional requirements

Identifiers are stable; reference them from issues and commits.

### 4.1 Shell and navigation

- FR-01 The app presents 7 modules plus a welcome module and a maintenance section,
  in the order defined in the outline. Each module shows: Learn, Do, With your Dream
  Friend, Until next time, Takeaways.
- FR-02 Modules are not locked. A suggested schedule shows the next session date, set by
  the learner (default: every 14 days from the start date).
- FR-06 Role setting per device: Dreamer, Dream Friend, or Both, chosen at first start
  and changeable in settings. Dreamer hides the Dream Friend section; Dream Friend
  shows it and skips the learner exercises; Both shows everything and lets a session be
  marked "today I am the Dream Friend", which switches the pair-exercise text to the
  Friend seat and the schedule to the pair's alternation.
- FR-07 Configuration setting: Solo + Friend, Peer pair, or Friend + group. It selects
  which variant of each "With your Dream Friend" block and 1:1 script is shown first;
  the other variants stay one tap away. Validity (enforced in onboarding and settings):
  Dreamer + solo, Dreamer + group, Dream Friend + solo, Dream Friend + group, Both + pair,
  Both + group are valid. Choosing pair sets the role to Both and says why; a Dream Friend
  cannot choose pair (a pair has no non-participating Friend); Both + solo shows a notice
  asking for pair or group, since "Both" needs someone whose Dream Friend this person is.
- FR-03 Interface language toggle RO/EN on every screen; the choice persists. All
  interface strings live in locale dictionaries, never in components. Course content
  is served from a per-locale content tree; v1 ships `ro` only. When the interface is
  set to a language that has no content tree, content falls back to `ro` and a short
  notice says so. Adding a content language means adding a new locale folder with the
  same file names and front matter keys, and a build-time check reports what is
  missing or untranslated.
- FR-04 A "Dream Book" page lists every printable sheet and prints the whole book or a
  single sheet, A4 and Letter, with print CSS; no PDF generation library required for v1.
- FR-05 Every module ends with a one-word feedback field and a takeaways list the
  learner edits. Both appear in the retrospective in module 7.

### 4.2 Dream list and prioritization (modules 1–3)

- FR-10 100 dreams list: add, edit, date-added, date-achieved, free tags, one of Kelly's
  twelve life areas (physical, emotional, intellectual, spiritual, psychological,
  material, professional, financial, creative, adventure, legacy, character), optional.
- FR-11 Rating: each dream gets a 1–10 importance score against criteria the learner
  writes for themselves; the "how do I feel about this dream" criterion is always
  present, plus an intrinsic/extrinsic tag with a warning when the top of the list is
  all extrinsic. Sort by score.
- FR-12 Choose one dream to work on; the chosen dream is visible in every later module.
- FR-13 Eisenhower matrix: drag items (tasks from a real week, and dreams) into four
  quadrants; the reflection questions from session 3 are shown beside it; the learner
  records one task moved to "Plan".
- FR-14 The paper Dream Book is the primary medium: the app never nags to transcribe.
  The 100-dreams screen offers "I keep this on paper" and then only stores the chosen
  dream and the count.

### 4.3 One dream through CHILD / COPIL (modules 2–4)

- FR-20 Clarify (C): guided clarification questions and the five-step imagery table
  (Clarity, Imagine, Feel, Anchor, Act) with the learner's answers, and a
  "three routes" field for alternative paths to the dream.
- FR-21 Hurdles (H / O): a WOOP sheet (Wish, Outcome, Obstacle, Plan) for the main
  hurdle, with the "if obstacle, then I will" plan line.
- FR-25 Every module's "until next time" is captured as an if-then sentence
  (if [situation], then I will [action]); the list of active if-then plans is visible
  from the home screen.
- FR-22 Inch by inch (I / P): tiny-habit recipe (after I [anchor], I will [tiny
  behaviour], then I celebrate by [..]) plus the "small step, small fear, cortex
  access" rationale from the kick-off deck. Horizon wording is "two to five months,
  varies a lot"; the tracker and the weekly one-line report run through month three.
- FR-23 Loyal friends (L / I): a map of people around the dream: supporter,
  accountability partner, someone to ask for help; one concrete ask written down.
  The page tells the learner to share actions and progress, not the identity they
  aspire to, and to pick someone they look up to.
- FR-24 The four sheets above print as one two-page "My dream" spread.

### 4.4 Diplomacy of the mind (modules 4–5)

- FR-30 Saboteurs: the ten names and one-paragraph descriptions in the app's own words,
  with attribution to Shirzad Chamine, and a link to the official free assessment.
  The learner types their top three scores; no test is reproduced. The page says
  the names are a coaching vocabulary, not a diagnosis; no PQ score or statistics.
- FR-31 "Catch the saboteur" journal: situation, thought, feeling, action, saboteur
  spotted, what the Sage would say, framed as "what would I say to a friend here".
  Repeatable entries, dated.
- FR-32 Sage powers reference (Empathize, Explore, Innovate, Navigate, Activate) with the
  five short games from the Sage Powers handout, rewritten; the Sage dialogue is
  presented as a two-chair exercise.
- FR-33 PQ reps: a 10-second to 2-minute guided tactile exercise with a timer and the
  two short Chamine videos hosted in the course (D12).
- FR-34 Wheel of Life: interactive 8-spoke wheel (the Co-Active Coaching areas), saved
  with a date so it can be redrawn at the vision check-ins and compared, with the
  five-item Satisfaction With Life Scale beside it, scored and dated.
- FR-36 Signature strength in a new way: the learner enters top five VIA strengths and
  logs one new use per day for a week, tied to the chosen dream.
- FR-35 Fear and courage page (reconstructed session 4): fear as a signal, courage born
  from fear, "good enough" over perfect, one reflection prompt.

### 4.5 Dream Vision (modules 6–7)

- FR-40 Values: list 10, narrow to 5, mark non-negotiables.
- FR-41 Letter from the future self: written in-app or on paper (then photographed or
  summarised), with a prompt to keep it vivid and the same person, older; then a reply
  written as the future self. Both sealed with a delivery date 3–12 months out. The app
  re-surfaces them on that date when opened and offers a calendar invite (.ics).
- FR-42 Dream Vision worksheet: the nine sections of Adina's worksheet rebuilt in the
  app's own layout (values, at my best, energy check, 10 years ahead more/stop,
  impact, ideal day, recognition and identity, vision statement, three focus areas),
  with the authenticity / stretch / yes-no check.
- FR-43 Vision statement builder: "I am a person who [identity], creating [impact]
  while living [lifestyle]". Product-vision analogy shown once as a hint.
- FR-44 Regret minimization (age 75 look-back) and Say Yes / Say No lists; the Yes/No
  list is reusable later as a decision filter.
- FR-45 Vision check-in: every 3 or 6 months (learner's choice) the app proposes a
  30-minute check-in: redraw the wheel, reread the statement, revisit the dream list,
  update focus areas, re-read the dream list, fill the five-item scale. Calendar
  invite offered.
- FR-46 Letting go with honour: a sheet with action-crisis signs, a cost-benefit page
  and a re-engagement prompt back to the dream list; the dream is marked "released"
  with a date, never deleted.

### 4.6 Share and export

- FR-50 Export everything as one JSON file; import restores it. This is the backup.
- FR-51 "Prepare for my 1:1": the learner ticks which items to include (chosen dream,
  CHILD sheets, saboteur scores, wheel, vision statement); the app produces a plain
  text or PDF summary to send by any channel. Nothing is sent by the app itself.
- FR-52 Nothing is stored anywhere except the browser's IndexedDB and the files the
  learner exports.

### 4.7 Dream Friend section

- FR-60 A Dream Friend section, shown by the role setting (FR-06), holds per-module
  session plans with timings in three variants (solo, peer pair, group), the
  pair-exercise scripts for both seats, the powerful questions list, the three 1:1
  scripts with their peer-pair notes, the group mechanics (check-in round, pair forming,
  debrief, one-word feedback round), and the stuck-learner lens (agency versus
  pathways) with the tool to reach for in each case.
- FR-61 Dream Friend notes are a separate local store, never mixed with Dreamer data,
  so a device in "Both" mode keeps the two apart and exports them separately.
- FR-62 The Dream Friend can print "session cards" for a module in the chosen
  configuration, including a group version with the round structure and timings.

### 4.8 Later (not v1, must not be blocked)

- FR-70 Group shared features: a shared feedback board, word cloud, and opt-in sharing
  of chosen dreams. Would need shared storage; a small serverless component on the
  existing AWS account is the first candidate. The group configuration itself (FR-07)
  is in v1 without these.
- FR-71 Email delivery of the future-self letter and check-in reminders.
- FR-72 Audio versions of the guided exercises.

## 5. Non-functional requirements

- NFR-01 Privacy: local-first, no analytics, no third-party scripts that see content.
  External links open in a new tab and carry no learner data.
- NFR-02 Devices: equally usable on a phone (360 px wide) and a laptop; no horizontal
  scroll; touch targets at least 44 px; drag interactions have a tap alternative.
- NFR-03 Offline: installable as a PWA; the whole app works offline after first load.
- NFR-04 Print: every sheet prints cleanly in black and white; no screen chrome.
- NFR-05 Accessibility: keyboard navigation, visible focus, WCAG AA contrast, Romanian
  diacritics rendered correctly in the chosen fonts.
- NFR-06 Performance: first load under 500 KB of JS, usable in under 2 s on a mid-range
  phone.
- NFR-07 Maintainability: content is Markdown or JSON, not code; a non-developer could
  fix a typo through the GitHub web editor.
- NFR-08 Attribution: a Sources page credits Mirela Oprea (CHILD/COPIL), Matthew Kelly
  (The Dream Manager), Shirzad Chamine (Positive Intelligence), Gabriele Oettingen
  (WOOP), BJ Fogg (Tiny Habits), Co-Active Coaching
  (Wheel of Life), Brené Brown (Atlas of the Heart), and Adina Stoicescu (pilot design,
  Dream Vision worksheet). Each tool page carries its own one-line credit.

## 6. Content requirements

- CR-01 The learner's voice is addressed with "tu" in Romanian; no corporate
  vocabulary (no "pilot", "employee", "company value", "KPI"). Content is written
  in Romanian only for v1; a future translation keeps the same informal register.
  The method letters are COPIL in content; CHILD appears only on the Sources page.
- CR-02 Each module has one key takeaway sentence, as the pilot decks did.
- CR-06 No Matthews goal-writing percentages, no Positive Intelligence statistics or
  PQ score, no fixed habit-duration number anywhere in the course text.
- CR-07 Watertight wording (added 2026-10-12 after live testing). Every sentence of
  course content and every interface string passes six checks, enforced by the build
  lint where mechanical and by a stranger-read review before content reaches Florin:
  1. An instruction names its object in the same sentence; no dangling "scrie-l",
     "fă-o", "transformă-l".
  2. Nothing refers to anything outside the course: no pilot, session, slide, deck,
     unknown person, "earlier" or "as before".
  3. A code, letter, abbreviation or coined term is expanded the first time it appears
     on each screen (COPIL letters carry their names; "Prietenul Visului" is defined
     where it first appears).
  4. Every input has a label saying what to type and a placeholder with an example;
     every button says what happens; two inputs on one screen never share a label.
  5. Every empty state says what to do next; labels describe the reader's action, not
     the author's purpose.
  6. Every exercise step says what to do, with what, where, for how long when it
     matters, and is concrete enough to start now; each "Fă" section has at least one
     worked example.
  Process: `npm run check:content` fails on rule 1–3 violations it can detect and on
  interface keys missing from a locale; CONTENT-GUIDE.md holds the templates; a
  reviewer pass in the persona of a cold reader runs on every new or changed content
  file before it is shown to Florin, and its findings are fixed first.
- CR-03 Reconstructed content (1:1 scripts, fear module) is marked "reconstructed" in
  the source file front matter until Florin reviews it, and the marker is not shown to
  the learner.
- CR-04 Material from Atlas of the Heart is used only as a reading pointer and one or
  two short quotes; the book is not summarised at length.
- CR-05 The Dream Vision worksheet and the Wheel of Life are rebuilt, not scanned. The
  Wheel of Life page permits reproduction for client use, but a rebuild keeps one
  visual language.

## 7. Technical approach (proposal)

- Vite + React + TypeScript (D13). Keep the bundle within NFR-06 by lazy-loading module routes.
- Storage: IndexedDB through Dexie, one database, versioned schema, JSON export.
- i18n: interface strings in `src/locales/<lang>.json` (ro, en) loaded through one
  `t()` helper; course content in `content/<lang>/<module>/*.md` with front matter,
  compiled at build time into a per-locale bundle and lazy-loaded. Locale is a single
  value in app state; components never branch on language. Date, number and list
  formatting go through `Intl` with the active locale. A build step diffs every content
  locale against `ro` and lists missing or stale files (stale = `ro` modified after the
  translation's front-matter `source_version`). Text direction and font fallback are
  defined per locale so a right-to-left or non-Latin language needs no layout change.
- Routing: hash router so S3 needs no rewrite rules (a CloudFront function could add clean URLs later).
- PWA: vite-plugin-pwa, precached app shell.
- Printing: dedicated print routes with `@media print` styles.
- Calendar invites: generated client-side as .ics files.
- Repository: GitHub repository `dream-course`. GitHub Actions builds on push to main,
  uploads `dist/` to the S3 bucket under the chosen prefix with an OIDC-assumed IAM
  role (no long-lived keys in GitHub), and invalidates the CloudFront path.
- Tests: Vitest for stores and export/import; Playwright smoke test for phone and
  laptop viewports and for print routes.

## 8. Acceptance criteria for v1

1. A learner can, on a phone, start the course in Romanian, add dreams or declare
   they keep them on paper, choose one dream, complete the CHILD sheets, record
   saboteur scores, draw the Wheel of Life, write and seal a future-self letter,
   build a vision statement and schedule a vision check-in, without creating an account.
2. The same learner can print the full Dream Book on A4 from a laptop and every sheet
   is usable with a pen.
3. Closing the browser and reopening keeps everything; exporting then importing on
   another device restores everything.
4. A device set to Dream Friend shows the Dream Friend section and can run a 1:1 from
   the script without any other document; a device set to Dreamer never shows it.
4a. Two devices set to Both, configured as a peer pair, show opposite seats of the same
   pair exercise when one is marked "today I am the Dream Friend", and the group
   session card for a module prints with the round structure.
5. The English toggle changes every interface string; content stays Romanian with the
   fallback notice visible. A dummy `content/xx/` folder with one translated module
   builds, lazy-loads, and the build check lists the untranslated remainder.
6. The site is served from the S3 + CloudFront site, deployed by the GitHub workflow,
   and passes the Playwright smoke test on push.

## 9. Open questions for Florin

- OQ-1 Which URL: a subpath of the blog (blog.floriniancu.ro/dream) or a new subdomain
  (dream.floriniancu.ro)? The apex and www had no DNS records as of 2026-10.

Resolved on 2026-10-12: videos may be hosted (D12), React (D13), private repository
(D14), no fixed start date (D15), no further 1:1 material (D16).

## 10. Out of scope for v1

Group mode, accounts, email, AI conversation partner, certification or any commercial
use, reproduction of the saboteurs assessment, embedding the books.
