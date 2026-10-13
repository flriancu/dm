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
npm test           # vitest (export/import round trip)
npm run build      # content check + type check + vite build → dist/
```

## Layout

```
content/<lang>/modules/NN-slug.md   course modules (front matter + sections {#learn} {#do} {#friend} {#next} {#takeaway})
content/<lang>/friend/NN.md         meeting plans (preamble + one ## table per configuration + questions + lessons)
content/<lang>/sheets/*.md          printable sheet text
content/<lang>/pages/*.md           other pages (sources)
src/i18n/locales/<lang>.json        interface strings only
src/lib/                            pure logic: dates (local, never UTC), course calendar/progress, ics files
src/db/db.ts                        Dexie schema and constants; docs.ts transactional document saves; hooks.ts live queries
src/state/settings.tsx              settings context and the role/configuration predicates (who sees what, who leads)
src/content/loader.ts               content tree access; tools.ts = which app pages a module links to
src/sheets/                         printable sheets, one file per area, listed once in registry.ts
src/components/                     Shell (nav), AutoText (autosaving box), DateField (DayPicker in site colours), Stepper, RoleConfigPicker, DreamerOnly, WheelSvg
src/pages/                          one file per route; pages compose the pieces above
scripts/check-content.mjs           diffs every content locale against ro, validates ro
e2e/smoke.mjs, e2e/adversarial.mjs  Playwright: happy path per viewport; malformed, rapid and role-switch input
```

Design rules: a page never holds business logic that a test would want (that lives in
`src/lib` or `src/db`); adding a sheet, a module tool or a role rule is one entry in a
registry (`src/sheets/registry.ts`, `src/content/tools.ts`, `src/state/settings.tsx`);
every multi-field document is saved through `saveDoc` so quick edits never overwrite
each other; every free-text box is an `AutoText`; every date is picked with `DateField`.
Libraries are used for what is not specific to the course (routing, storage, markdown,
the calendar); the course logic stays in this repo.

Interface languages: ro, en. Content: ro only in v1; add `content/<lang>/` with the same
file names to add a language. The build check lists what is missing or stale.

## Deploy

`.github/workflows/deploy.yml` builds on push to `main` and syncs `dist/` to the S3 +
CloudFront site through an OIDC-assumed role. Set the secrets named in the workflow.
`vite.config.ts` uses `base: './'` so the build works at any prefix or subdomain.

## Privacy

All data lives in the browser's IndexedDB. The only way data leaves the device is the
export button in Settings, which produces a JSON file the learner can send.
