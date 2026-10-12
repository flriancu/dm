# Dream Course (Cartea Visurilor)

A local-first web app plus a printable Dream Book for a seven-module course on working
with a personal dream, adapted from a 2026 Dream Management pilot (Mirela Oprea's
COPIL method). Private, non-commercial use among friends and family.

Design documents: [REQUIREMENTS.md](REQUIREMENTS.md), [COURSE-OUTLINE.md](COURSE-OUTLINE.md),
[ASSESSMENT.md](ASSESSMENT.md) (evidence review, peer-reviewed sources only).

## Status

Prototype: welcome module and module 1 (the 100 dreams list), the first three Dream
Book sheets, roles and configurations, if-then plans, export/import, Dream Friend
section with the module 1 session plan.

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
content/<lang>/friend/NN.md         Dream Friend session plans
content/<lang>/sheets/*.md          printable sheet text
content/<lang>/pages/*.md           other pages (sources)
src/i18n/locales/<lang>.json        interface strings only
src/db/                             Dexie schema, export/import
src/pages/                          one file per route
scripts/check-content.mjs           diffs every content locale against ro, validates ro
```

Interface languages: ro, en. Content: ro only in v1; add `content/<lang>/` with the same
file names to add a language. The build check lists what is missing or stale.

## Deploy

`.github/workflows/deploy.yml` builds on push to `main` and syncs `dist/` to the S3 +
CloudFront site through an OIDC-assumed role. Set the secrets named in the workflow.
`vite.config.ts` uses `base: './'` so the build works at any prefix or subdomain.

## Privacy

All data lives in the browser's IndexedDB. The only way data leaves the device is the
export button in Settings, which produces a JSON file the learner can send.
