# Ballot integrity and privacy

This upgrade preserves the Next.js/React/SQLite architecture and existing API route names. It introduces schema version 2 in a **separate database**. It never imports, updates or wipes the tracked legacy database automatically. An existing database containing the legacy users/votes schema is refused. Legacy ballots remain identity-linked until an independently approved migration/retention decision; this code cannot make past disclosures secret.

## Acceptance and concurrency

Every mutation owns a separate SQLite connection and `BEGIN IMMEDIATE` transaction. An application-process write queue shared across Next.js route modules avoids SQLite busy waits occupying all native worker threads. Foreign keys and a 10-second busy timeout are enabled per connection; WAL is initialized once. Deploy as one application instance on a durable local disk. Multiple ephemeral serverless instances or a shared network filesystem are not supported by this storage design.

Registration validates and consumes the credential in the same transaction as account creation, including a conditional affected-row check. Codes use cryptographic random bytes, expire after seven days, are stored as SHA-256 digests, and are returned in full only once. An issued code is a credential for one account. The school must distribute one code per eligible student and prevent multiple-code enrollment; this software does not prove a physical person's identity.

A ballot validates active student status, election window and the approved office/candidate under the write transaction. `participation(user_id, position_id)` has a composite primary key. `ballots` contains a random UUID, office and candidate only, with no student ID, receipt join key or ballot timestamp, and uses `WITHOUT ROWID`. Inserting both and incrementing the snapshot revision is atomic. The already-accepted path returns the office acceptance status without comparing or revealing the selection. Thus retrying with a different selection cannot change the original accepted ballot or discover its choice.

Once voting is opened, candidate approval and election setup are frozen. Closing is irreversible through this API. Account deactivation revokes sessions but preserves participation, candidate rows, consumed codes and ballots. Database triggers prohibit ordinary application updates/deletes of accepted ballots/participation and reopening consumed codes. Administrative events are append-only through application/trigger controls and contain no ballot choices. A database owner can change schema or logs: these controls do not establish cryptographic tamper evidence against the operator.

## Scope of secrecy

Student APIs return participation status, never a history of chosen candidates. The live endpoint exposes aggregate counts for authenticated students and staff. Admin enrollment responses contain no passwords/hashes. Session tokens are random, stored as digests, expire server-side, and use HttpOnly/SameSite=Strict/Secure-in-production cookies.

Separation removes the direct voter-to-choice join. **It is not a guarantee of anonymity against a privileged host/database operator.** Transaction logging, backups, a tiny electorate or live before/after counts can still enable inference. The school explicitly requested live totals; its trade-off with secrecy must be understood. No UI should promise absolute anonymity, end-to-end verifiability or public-election certification.

Do not log ballot request payloads, account passwords, session tokens or per-student candidate selections. Default request error logging records only error categories. No third-party analytics or telemetry is installed by the application. Platform access logs and backups are the operator's responsibility.

## Authentication and browser boundaries

Passwords use asynchronous scrypt (N=131072, r=8, p=1) with random salts and timing-safe verification. New passwords have 12–128 characters. There is no default administrator password, password-recovery backdoor or automatic privileged seed. Bootstrap is explicit and refuses to overwrite an existing administrator.

Mutation endpoints reject mismatched origins and cross-site/same-site browser initiators, require JSON where a body is used, and cap JSON at 16 KiB while reading. Set APP_ORIGIN to the actual canonical origin behind a reverse proxy. JSON-only mutations without permissive CORS and SameSite cookies provide additional browser boundaries. Sign-in and registration use per-identifier and global attempt limits in SQLite. Default global caps are conservative and require capacity review for a large school; deploy trusted edge rate limiting as an additional control without trusting arbitrary forwarded-IP headers.

## Live results contract

`GET /api/results/live` requires authentication, returns no-store aggregate snapshots with election state, monotonically increasing revision, server observation time, registered-account and participation totals, and counts per approved candidate/office. It uses one read transaction. Counts are provisional while voting is active; a closed label does not substitute for school certification. Admin aggregate access does not expose individual choices. Registered-account turnout must be labelled as such, not as the percentage of the entire school.

The client should keep one poll in flight, stop while hidden, back off after failure, discard older revisions, distinguish stale/disconnected from live, and reconcile submission status before offering another vote after an uncertain response. No artificial vote counts, fabricated countdown or leader-biased ballot ordering is part of the design.

## Deliberately bounded capabilities

One election with the existing five offices is supported. The admin can name/schedule/open/close it. A new election cycle, roster imports, candidate portraits, external notifications, account recovery and public internet result access are separate future scopes. There is no operation that resets an existing election or erases ballots. Do not represent school-specific academic/attendance requirements as enforced rules without school-approved policy.
