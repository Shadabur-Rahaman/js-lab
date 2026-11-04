# Private access verification — 4 November 2026

## Executed

| Check | Actual result |
| --- | --- |
| `npm test` | 71 passed, 0 failed. Existing lesson/progress/runtime/resource tests plus 8 private security tests. |
| Disposable PostgreSQL resource tests | Passed the existing `permissions.sql` assertions. |
| Disposable PostgreSQL enrollment tests | `private-access.sql` passed, including pending/approved, subject binding, unapproved, revoke with existing identity, expiry, extension, suspension, non-admin RPC rejection, admin record protection, RLS and cutover metadata denial. Fixtures rolled back. |
| Private frontend UI fixtures | 9/9 passed at desktop and 390 px mobile width; mobile document had no horizontal overflow. Includes expiry/revocation/outage removing the app, student admin-route rejection, admin dashboard and reopening the original lesson UI. Fixture editor is a textarea and worker source is stubbed; this test does not claim to execute student code or Cloudflare sign-in. Existing runtime tests cover their logic. |
| Real Supabase private backend | 12/12 passed using only a disposable enrollment and text resource: pending/approved, anon enrollment isolation, RPC denial, persistent upload, listing, draft denial, published byte download, endpoint-only links, immediate next-request revocation, server-time expiry and trashed-file denial. All disposable resources, versions, objects and enrollment records removed. |
| Legacy production build | Passed; existing GitHub Pages build remains supported. |
| Private production build | Passed; bundled Pages worker compiled and deployed successfully. Vite reports the existing large PDF chunk warning. |
| Existing release preservation scan | Classroom code absent from built frontend assets; relative GitHub Pages URLs verified. |
| Private artifact scan | All 26 frontend text assets checked for privileged-key/JWT patterns; required authorization worker and catch-all routes verified. |
| `npm audit --omit=dev` | 0 production vulnerabilities reported. |
| Hosted production and hash URL, unsigned HTTP requests | 12/12 denied for HTML, a real bundled JS asset, session API, download API and PDF assets. At initial deployment these return 503 because Access bindings are incomplete. This proves fail-closed preparation, not completed sign-in. |
| Hosted Supabase schema/API | Both additive migrations applied; existing resource-api redeployed with the cutover guard. Confirmed one previously authorized admin was bootstrapped. No real enrollment dates or resource metadata changed. |

Security unit tests generate real RSA key pairs and signed JWTs: valid signature accepted; wrong signature/issuer/audience, expiry, missing token and invalid email rejected. They check every static path consults enrollment before assets, missing database/identity fail closed, CSRF/origin checks, student mutation denial and server-derived admin identity. Worker tests inject a fixture database where noted; the separate real-cloud tests use Supabase, with a fixture identity verifier for the revocation gateway check, not a fabricated Cloudflare login.

The first cloud acceptance run found a test-cleanup issue: published resources require a current version. Cleanup was corrected to mark only the disposable fixture deleted before clearing its version. The expiry fixture was corrected to derive timestamps from the remote database clock. The final acceptance run passed; failed-run fixtures were also removed. No security check was disabled to pass the tests.

## Still requiring real account verification

Cloudflare Zero Trust team: `broad-dew-2065.cloudflareaccess.com`. Pages project: `js-lab-private`. The Access application audience and policy setup are pending at this report revision.

Successful real OTP sign-in, the two real student accounts, actual Cloudflare allowlist rejection, real browser-to-private-gateway teacher uploads, authenticated alias tests, browser expiry/revocation timing under real Cloudflare sessions, and the complete sandbox/CSP interaction on the private host have **not yet been verified**. Private UI fixture passes do not substitute for them. Complete the matrix in DEPLOYMENT.md before retiring the public site.

The existing GitHub Pages site and anonymous legacy resource access remain enabled during migration. The `enforced` switch is false. Consequently the entire platform is **not yet fully private**, despite the replacement's fail-closed server. No old site is unpublished and no repository visibility is changed without explicit owner approval.

## Reproduce

```sh
npm test
npm run build
npm run build:private
node scripts/build-private-browser-tests.mjs
# Serve locally, open tests/private-access-browser.html, then run its checks.
# Disposable PostgreSQL only:
psql -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql
psql -v ON_ERROR_STOP=1 -f supabase/tests/private-access.sql
# Owner terminal, authenticated Supabase CLI, uses disposable cloud fixtures:
node scripts/test-private-cloud.mjs
# Unsigned live requests, never sends credentials:
node scripts/test-private-deployment.mjs https://js-lab-private.pages.dev/ https://DEPLOYMENT_HASH.js-lab-private.pages.dev/
```
