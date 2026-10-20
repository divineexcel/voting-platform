# ApexVote

A Next.js school election workspace with student enrollment, neutral candidate ballots, reviewed submission, candidacy applications, election administration and authenticated live aggregate results. The approved green interface is integrated with the hardened server contracts. This branch is prepared for code review; deployment and legacy-data migration require separate owner decisions.

## Runtime and data boundary

Use Node 22.13–24 and `npm ci`. The supported framework version and SQLite driver are pinned in the lockfile. Copy `.env.example` into a private environment configuration and set `DATABASE_PATH` to a durable local location and `APP_ORIGIN` to the canonical application origin. Production startup requires an explicit database path.

The new schema is created only in a separate database. The old `database.sqlite` is retained locally and is no longer tracked by this branch. Pointing the new application at an old schema fails without migrating it. No election data is automatically copied, deleted or anonymized. Historical Git commits may still contain the legacy database: the owner must assess any real-data exposure and session/credential rotation separately.

Set `ADMIN_USERNAME`, `ADMIN_NAME` and a private `ADMIN_PASSWORD` (12–128 characters), then run `npm run bootstrap` once. Bootstrap refuses to replace an existing administrator. Remove the password from the environment after bootstrap. No default admin password is created or printed.

Local development uses `npm run dev`; a production build uses `npm run build` followed by `npm run start` (use `npm run build -- --webpack` if the host restricts Turbopack’s local CSS helper socket). Do not use an ephemeral/serverless filesystem or multiple application instances with this local SQLite architecture.

## Validation

- `npm test`: isolated Node tests for registration, accepted-ballot concurrency, private participation status, sessions, lifecycle, data preservation and request validation.
- `npm run check`: server/route/script syntax; `next build` validates JSX.
- `npm run verify:api`: mutating HTTP integration checks. Requires a fresh **disposable localhost** server, `ALLOW_TEST_FIXTURES=1`, `TEST_BASE_URL`, `TEST_ADMIN_USERNAME` and `TEST_ADMIN_PASSWORD`. Never run against school data; it creates and changes fixture accounts/election state.

See [architecture and privacy](docs/architecture-and-privacy.md) for invariants and limitations. Live aggregate visibility is intended for authenticated students and administrators; individual candidate choices are not returned in participation history. No claim of anonymity against privileged operators or certified public-election security is made.

## Skills

Repository-scoped skills live in `.agents/skills/`: RPI Production Engineering, Interface Forge and Superdesign. Their upstream instructions/licenses are preserved. Superdesign source: `superdesigndev/superdesign-skill` revision `f9f05cd988c247dce6c072eaf9ac6b162f2ffc4b`. The selected design context is in `.superdesign/`; generated temporary files are ignored. No database or credentials are design inputs.

## Interface and recovery

Students and staff see the same authoritative aggregate endpoint. Polling runs about every five seconds while visible, backs off on errors, preserves labelled stale totals and rejects older revisions. Results are provisional during voting. A registered-account denominator is not the whole school population.

The ballot requires candidate selection, review and explicit final submission. An acknowledgement erases the selected candidate from the displayed participation state. Interrupted submissions retain only a pending office ID in session storage, never a candidate choice. `POST /api/votes/reconcile` either confirms acceptance or atomically revokes the earlier attempt generation before a new choice is allowed; a delayed cancelled POST cannot win afterward.

Admin screens provide candidate reviews (locked after activation), code generation with one-time full reveal, masked code registry, searchable/paged student access controls, staff creation, election window configuration/activation/closing and recent audit events. Tables display ten records per page; their current API queries still load the complete operational register.

See [verification and rollout](docs/verification-and-rollout.md) for actual evidence, remaining validation and release conditions.
