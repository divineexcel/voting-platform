# ApexVote

An existing Next.js school voting platform. Upgrade branch status: server-side integrity/privacy changes are implemented and under test; the existing interface still awaits its Superdesign design and client-contract integration. **Do not deploy this work-in-progress branch.**

## Runtime and data boundary

Use Node 22.13–24 and `npm ci`. The supported framework version and SQLite driver are pinned in the lockfile. Copy `.env.example` into a private environment configuration and set `DATABASE_PATH` to a durable local location and `APP_ORIGIN` to the canonical application origin. Production startup requires an explicit database path.

The new schema is created only in a separate database. The old `database.sqlite` is retained locally and is no longer tracked by this branch. Pointing the new application at an old schema fails without migrating it. No election data is automatically copied, deleted or anonymized. Historical Git commits may still contain the legacy database: the owner must assess any real-data exposure and session/credential rotation separately.

Set `ADMIN_USERNAME`, `ADMIN_NAME` and a private `ADMIN_PASSWORD` (12–128 characters), then run `npm run bootstrap` once. Bootstrap refuses to replace an existing administrator. Remove the password from the environment after bootstrap. No default admin password is created or printed.

After the interface integration is completed, local development uses `npm run dev`; a production build uses `npm run build` followed by `npm run start`. Do not use an ephemeral/serverless filesystem or multiple application instances with this local SQLite architecture.

## Validation

- `npm test`: isolated Node tests for registration, accepted-ballot concurrency, private participation status, sessions, lifecycle, data preservation and request validation.
- `npm run check`: server/route/script syntax; `next build` validates JSX.
- `npm run verify:api`: mutating HTTP integration checks. Requires a fresh **disposable localhost** server, `ALLOW_TEST_FIXTURES=1`, `TEST_BASE_URL`, `TEST_ADMIN_USERNAME` and `TEST_ADMIN_PASSWORD`. Never run against school data; it creates and changes fixture accounts/election state.

See [architecture and privacy](docs/architecture-and-privacy.md) for invariants and limitations. Live aggregate visibility is intended for authenticated students and administrators; individual candidate choices are not returned in participation history. No claim of anonymity against privileged operators or certified public-election security is made.

## Skills

Repository-scoped skills live in `.agents/skills/`: RPI Production Engineering, Interface Forge and Superdesign. Their upstream instructions/licenses are preserved. Superdesign source: `superdesigndev/superdesign-skill` revision `f9f05cd988c247dce6c072eaf9ac6b162f2ffc4b`. The selected design context is in `.superdesign/`; generated temporary files are ignored. No database or credentials are design inputs.
