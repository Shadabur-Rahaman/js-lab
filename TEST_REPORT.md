# Private access verification — 4 November 2026

## Executed

| Check | Actual result |
| --- | --- |
| `npm test` | 74 passed, 0 failed. Existing lesson/progress/runtime/resource tests plus 8 private security tests and 3 authenticated HTTP-response checks. |
| Disposable PostgreSQL resource tests | Passed the existing `permissions.sql` assertions. |
| Disposable PostgreSQL enrollment tests | `private-access.sql` passed, including pending/approved, subject binding, unapproved, revoke with existing identity, expiry, extension, suspension, non-admin RPC rejection, admin record protection, RLS and cutover metadata denial. Fixtures rolled back. |
| Private frontend UI fixtures | 9/9 passed at desktop and 390 px mobile width; mobile document had no horizontal overflow. Includes expiry/revocation/outage removing the app, student admin-route rejection, admin dashboard and reopening the original lesson UI. Fixture editor is a textarea and worker source is stubbed; this test does not claim to execute student code or Cloudflare sign-in. Existing runtime tests cover their logic. |
| Real Supabase private backend | 12/12 passed using only a disposable enrollment and text resource: pending/approved, anon enrollment isolation, RPC denial, persistent upload, listing, draft denial, published byte download, endpoint-only links, immediate next-request revocation, server-time expiry and trashed-file denial. All disposable resources, versions, objects and enrollment records removed. |
| Legacy production build | Passed; existing GitHub Pages build remains supported. |
| Private production build | Passed; bundled Pages worker compiled and deployed successfully. Vite reports the existing large PDF chunk warning. |
| Existing release preservation scan | Classroom code absent from built frontend assets; relative GitHub Pages URLs verified. |
| Private artifact scan | All 26 frontend text assets checked for privileged-key/JWT patterns; required authorization worker and catch-all routes verified. |
| `npm audit --omit=dev` | 0 production vulnerabilities reported. |
| Hosted production and hash URL, unsigned HTTP requests | 12/12 denied for HTML, a real bundled JS asset, session API, download API and PDF assets. Initial unconfigured deployment returned 503. After encrypted bindings and Access application activation, production redirects to Access (302) and the latest alternative deployment denies (403). This does not verify successful sign-in. |
| Encrypted Cloudflare bindings | Configured successfully for both production and preview through CLI stdin; no server credential printed or saved. Initial authenticated acceptance build: `7bb269f7.js-lab-private.pages.dev`. |
| Hosted Supabase schema/API | Both additive migrations applied; existing resource-api redeployed with the cutover guard. Confirmed one previously authorized admin was bootstrapped. No real enrollment dates or resource metadata changed. |

Security unit tests generate real RSA key pairs and signed JWTs: valid signature accepted; wrong signature/issuer/audience, expiry, missing token and invalid email rejected. They check every static path consults enrollment before assets, missing database/identity fail closed, CSRF/origin checks, student mutation denial and server-derived admin identity. Worker tests inject a fixture database where noted; the separate real-cloud tests use Supabase, with a fixture identity verifier for the revocation gateway check, not a fabricated Cloudflare login.

The first cloud acceptance run found a test-cleanup issue: published resources require a current version. Cleanup was corrected to mark only the disposable fixture deleted before clearing its version. The expiry fixture was corrected to derive timestamps from the remote database clock. The final acceptance run passed; failed-run fixtures were also removed. No security check was disabled to pass the tests.

## Still requiring real account verification

Cloudflare Zero Trust team: `broad-dew-2065.cloudflareaccess.com`. Pages project: `js-lab-private`. The public application AUD was obtained from the production login redirect and its signed public metadata was verified against the team's JWKS. The owner confirmed the same AUD. One-time PIN is enabled and the owner completed real email-code sign-in. The private server returned the existing administrator's correct ID and role. Student Management and its audited identity verification entry loaded successfully, with an empty student list.

On the authenticated private production host, verified the existing seven resources (five published, two drafts), loaded the 28-page Operators PDF through the protected gateway and scrolled to the last page, ran the console example (`Hello World!`) and the DOM bridge example (real iframe heading updated). A new disposable text file was uploaded through the actual file picker and private HTTP upload endpoint, persisted after a full refresh, previewed, renamed, categorized, published and observed in Study Materials, then trashed. The test object, versions and metadata were removed using its exact fixture identity; a hash comparison confirmed that all seven original resource records were unchanged. A local backup verified all seven real file objects against their SHA-256 checksums (zero failures).

One initial post-login page request denied access; a direct session check succeeded and a subsequent refresh loaded the app. No security checks were relaxed. Multiple subsequent navigation, refresh, PDF and upload operations succeeded. The transient initial denial was not reproduced or assigned an unverified cause.

The owner explicitly deferred adding the two students. Their real accounts, actual unapproved-email OTP rejection, authenticated alias tests with student sessions, and open-tab expiry/revocation timing under real Cloudflare student sessions have **not yet been verified**. Backend authorization and fixture UI checks cover these rules, but do not substitute for those future real-account checks. The existing console and DOM bridge examples were exercised; this is not a claim that every learning exercise was manually rerun.

The owner selected **Keep the public site for now** when asked about the final cutover. The existing GitHub Pages site, public repository and anonymous legacy resource access therefore remain enabled. The `enforced` switch is false. Consequently the entire platform is **not yet fully private**, despite the private replacement's server authorization. No old site is unpublished and no repository visibility is changed. The student list remains empty as requested.

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
