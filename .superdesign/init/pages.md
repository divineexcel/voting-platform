# Complete UI local-import dependency trees

There are exactly two page entries. Neither imports a local component or local client utility; both are monolithic client files. External React, Next navigation and Lucide imports are excluded from these local dependency trees. HTTP fetch targets are not JavaScript imports and are listed separately. Shared ancestor layout dependencies are included explicitly.

## / — student authentication, ballot and candidacy
Entry: `src/app/page.js`

```text
src/app/page.js
  (no local imports)
Shared App Router ancestor:
  src/app/layout.js
    src/app/globals.css
```

States: session loading, login, registration, position accordion/candidates, review-vote overlay, candidacy requirements, application form and application history. All are defined inside `Home`; no omitted local component dependency exists.

HTTP data dependencies: `/api/auth/me`, `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/positions`, `/api/votes/cast`, `/api/candidates/apply`.

Candidate design context: page source; root layout; compact theme summary; approved design-system brief. The page is approximately 800+ lines: budget each generation, selecting target-state excerpts only when required rather than automatically uploading every monolithic source and both init/raw CSS copies.

## /admin — administrator authentication and operational dashboard
Entry: `src/app/admin/page.js`

```text
src/app/admin/page.js
  (no local imports)
Shared App Router ancestor:
  src/app/layout.js
    src/app/globals.css
```

States: session loading, admin login, metric cards, results and turnout, code generation/list, candidate review, student registry/delete, subadmin creation. All are defined inside `AdminPortal`; no omitted local component dependency exists.

HTTP data dependencies: `/api/auth/me`, `/api/auth/login`, `/api/auth/logout`, `/api/admin/results`, `/api/admin/codes`, `/api/admin/candidates`, `/api/admin/students`, `/api/admin/subadmins`.

Candidate design context: admin source; root layout; compact theme summary; approved design-system brief. Backend source is not necessary for visual reproduction, but its authorization and privacy contracts must constrain implementation.

## Scope and approved direction
The existing audit is in `outputs/voting-platform-audit/`. User approved staged integrity/privacy work and green UI refinement. Both student and admin should have live aggregate candidate totals; individual students' choices remain private. Proposed separation: Ballot / Live results / Candidacy for students; operational tasks for admins. Keep truthful provisional status, stale/reconnecting states and timestamps; no invented turnout denominators or fake suspense. These are planned changes, not existing routes/components.
