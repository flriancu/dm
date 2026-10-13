# Dream Course (Cartea Visurilor)

A local-first web app plus a printable Dream Book for a seven-module course on working
with a personal dream, adapted from a 2026 Dream Management pilot (Mirela Oprea's
COPIL method). Private, non-commercial use among friends and family.

Design documents: [REQUIREMENTS.md](REQUIREMENTS.md), [COURSE-OUTLINE.md](COURSE-OUTLINE.md),
[ASSESSMENT.md](ASSESSMENT.md) (evidence review, peer-reviewed sources only).

## Status

All eight modules (0–7), the 19 printable sheets, the seven meeting plans in three
configurations, roles and configurations, if-then plans, export/import. Content and
app were walked through cold for every role and configuration (2026-10-13); the
cross-cutting decisions from that pass are in [COURSE-RULES.md](COURSE-RULES.md).

## Run

```
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: pure logic, export/import round trip, i18n
npm run lint       # oxlint, warnings are errors
npm run format     # prettier (no semicolons, single quotes, 120 columns); format:check in the build
npm run build      # content check + lint + format check + type check + vite build → dist/
node e2e/smoke.mjs http://localhost:5173/        # happy path per viewport (dev server running)
node e2e/adversarial.mjs http://localhost:5173/  # malformed, rapid and role-switch input
node e2e/import-poison.mjs http://localhost:5173/ # backups written by hand, older or newer versions
node e2e/flows.mjs http://localhost:5173/        # cross-module flows, roles, dates, time zones
node e2e/races.mjs http://localhost:5173/        # two tabs, quick taps, reloads, storage failures
```

## Layout

```
content/<lang>/modules/NN-slug.md   course modules (front matter + sections {#learn} {#do} {#friend} {#next} {#takeaway})
content/<lang>/friend/NN.md         meeting plans (preamble + one ## table per configuration + questions + lessons)
content/<lang>/sheets/*.md          printable sheet text
content/<lang>/pages/*.md           other pages (sources)
src/i18n/locales/<lang>.json        interface strings only
src/lib/                            pure logic: dates (local, never UTC), course calendar/progress, ics files, validators, paths
src/db/db.ts                        Dexie schema, types and constants, text limits (the only file that defines tables)
src/db/schema.ts                    what a valid row of each table looks like; every settings read and every import goes through it
src/db/{dreams,week,calm,vision,notes,settings}.ts  one data module per table group: read hooks + named mutations; pages never touch Dexie
src/db/docs.ts                      transactional merge-save used by the document modules (lists are edited inside the transaction)
src/db/exportImport.ts              backup: export, check (planImport), confirm, apply
src/db/lifecycle.ts                 wipe/import/upgrade in another tab: stop writing, reload
src/state/settings.tsx              settings context; roles.ts/combos.ts the role/configuration predicates (who sees what, who leads)
src/state/{useAction,saveErrors,useToday}.ts  one-off actions and draft submits, refused saves, the day that changes at midnight
src/app/                            app shell: crash screen, page error card, reload after a new version
src/content/loader.ts               content tree access; tools.ts = which app pages a module links to; plans.ts + plan-headings.json = the three configurations and their table headings (shared with the lint)
src/sections/{dream,vision,calm}/   one component per worksheet section (clarify, WOOP, habit, letter, wheel…)
src/sheets/                         printable sheets, one file per area, listed once in registry.ts
src/components/                     Shell (nav), AutoText (autosaving box), DateField (DayPicker in site colours), Stepper, SectionLinks, ErrorBoundary, RoleConfigPicker, DreamerOnly, WheelSvg
src/pages/                          one file per route; a page only composes sections and components
scripts/check-content.mjs           diffs every content locale against ro, validates ro
e2e/*.mjs                           Playwright: happy path per viewport; malformed, rapid and role-switch input; imports; flows; races
```

Design rules: a page never holds business logic that a test would want (that lives in
`src/lib` or `src/db`); a page or section reads and writes through a data module in
`src/db`, never through a Dexie table; adding a sheet, a module tool, a configuration or
a role rule is one entry in a registry (`src/sheets/registry.ts`, `src/content/tools.ts`,
`src/content/plans.ts`, `src/state/settings.tsx`);
every multi-field document is saved through `saveDoc` so quick edits never overwrite
each other, and a list inside it is changed by a function of the stored row, never rebuilt
from what the page last showed; every free-text box is an `AutoText`; every date is picked
with `DateField`; a form that adds a row clears at once (`submitDraft`) and a one-off
button is guarded (`useAction`); anything read from outside the app (a backup, an older
version's rows) goes through `src/db/schema.ts` first; every mutation a data module exports
is an `async` function (Dexie's own promises swallow an unhandled rejection, a native one
reaches the save-error banner even when nobody awaits it, e.g. a tap on a chip).
Libraries are used for what is not specific to the course (routing, storage, markdown,
the calendar); the course logic stays in this repo.

Interface languages: ro, en. Content: ro only in v1; add `content/<lang>/` with the same
file names to add a language. The build check lists what is missing or stale.

## Serve from this workstation (intranet)

`pwsh scripts/intranet.ps1 publish` runs the build checks and copies the build into `site/`
(new files first, `index.html` last; the previous version's files stay for tabs still open on
them). `pwsh scripts/intranet.ps1 start` serves `site/` at
`http://<COMPUTERNAME>.<domain>/dream_management/` through Windows HTTP.sys, in a hidden
window, until `pwsh scripts/intranet.ps1 stop` (or logoff); `status` says whether it runs. A
running server picks up a new publish without a restart. The server never reads `dist/`, so
`npm run build` during development cannot take the live site down; requests are answered by
a pool of workers, so one slow reader (a paused video) never holds up the others. It needs a
one-time URL reservation for port 80 and an inbound firewall rule, both by an administrator;
the commands (and how to undo them) are at the top of `serve-intranet.ps1`. To try a build
without touching the live site: `npx vite build --outDir <folder> --emptyOutDir`, then
`pwsh scripts/serve-intranet.ps1 -Prefix http://localhost:8099/dream_management/ -Root <folder>`.

## Deploy

`.github/workflows/deploy.yml` builds on push to `main` and syncs `dist/` to the S3 +
CloudFront site through an OIDC-assumed role. Set the secrets named in the workflow.
`vite.config.ts` uses `base: './'` so the build works at any prefix or subdomain.

## Privacy

All data lives in the browser's IndexedDB. The only way data leaves the device is the
export button in Settings, which produces a JSON file the learner can send.
