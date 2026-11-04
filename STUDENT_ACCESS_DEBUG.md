# Student OTP return investigation — 5 November 2026

## Root cause and reproduction

The worker rejected **every** request with `Sec-Fetch-Site: cross-site` before checking its Access assertion. A successful OTP form submission returns from the Cloudflare team domain to the Pages domain as a cross-site, top-level document navigation. That legitimate return was denied with the generic Access Required page even though the user's cookie, signed identity and enrollment were valid.

This was reproduced before the fix in two ways:

1. A normal link from a local page to the protected production origin failed with an already-valid administrator session.
2. The affected student completed a fresh real OTP login privately. The browser landed on Access Required with `__cf_access_message=logged_out`. Navigating directly to the session endpoint then returned `allowed: true`, the expected student role/email and the original future expiry. This isolated the navigation filter from JWT and enrollment checks.

The student record was approved, its start/expiry were valid under server time, its verified email matched the signed session, and its existing Access subject binding matched. Neither that binding nor the email, role, application AUD, issuer, Cloudflare policies or cookie settings needed to be reset.

## Logout versus failure

Clicking Sign out was separately tested and produced Cloudflare's “You successfully logged out” sign-in page. That is intentional sign-out. The query marker can remain in the return URL of the **next** successful login; its presence alone does not mean the new session is logged out. The pre-fix generic denial and logout-only action obscured that distinction and invited another sign-out cycle.

The fix permits only GET + `Sec-Fetch-Mode: navigate` + `Sec-Fetch-Dest: document` through the cross-site metadata rule. The same JWT signature, issuer, AUD, expiry, email/subject, live database approval, dates, revocation, rate limit and resource checks remain mandatory. Cross-site script/image/iframe loads, API fetches and POST navigations remain blocked. No Access Bypass, anonymous allowance, cookie-token fallback, identity reset or client-only permission was introduced.

An authorized return containing the stale marker now receives one 303 redirect to the same path with that marker removed. Authorization runs first, and again on the resulting request. Unapproved/expired/revoked users do not receive this success redirect. An unauthenticated fallback with the marker says Signed Out and offers a clean Sign in link; it never grants content or starts another automatic logout.

## Executed verification

| Scenario | Actual result |
| --- | --- |
| Fresh affected-student OTP before fix | Reproduced Access Required immediately after OTP. Direct session check confirmed the correct allowed student identity. |
| Fresh affected-student OTP after fix | Entered the app directly without a refresh or alternate-entry workaround; return URL was clean. All 19 lesson navigation entries visible. |
| Cross-site link with valid student session | App opened successfully after the fix. |
| Student lesson and runner | First-program lesson opened and its isolated console returned `Hello World!`. Administrator shortcut was absent. |
| Unapproved enrollment | Existing authenticated student was temporarily marked pending. Real production browser request displayed Awaiting Approval and no lesson content. Original state restored and verified. This is a pending-enrollment test, not a claim that another mailbox was allowed through Access. |
| Expired enrollment | With the same real Access session, the open lesson tab became Access Expired on its next permission poll. The production session endpoint returned `code: expired`. Original access dates restored and verified. |
| Revoked enrollment | Same real session immediately received `code: revoked` from the session endpoint and Access Revoked on a fresh page request. Original state restored and verified. |
| Deliberate sign-out | Cloudflare displayed its logged-out sign-in page; protected lesson content was absent. A subsequent real OTP login landed directly in the app. |
| Automated regressions | 79 Node tests passed, 0 failed, including five new navigation/logout/privacy regressions plus existing signature, wrong issuer/AUD, expiry, authorization, CSRF, curriculum and progress tests. |
| Private production build | Passed, including required worker/catch-all routes and privileged-key artifact scan. |

Temporary denial tests used the already-authorized affected account with an automatic restoration timer and revision checks. Each test restored the original approval, start, expiry and revocation fields, without changing email, role or subject binding. Diagnostic state changes/restorations are recorded in the private enrollment audit log. No real enrollment was permanently suspended, extended or revoked. No lesson completions, quiz answers, saved projects, classroom files, design or curriculum were edited; navigation can update the current-lesson pointer normally.

The provider's cookie values and user JWT were never copied out of the browser. Fresh OTP, the signed session endpoint, successful lesson loads, and deliberate logout verified cookie/session behavior. The server continues to validate the Access assertion header, as recommended by Cloudflare, rather than trust a browser-supplied email or a query parameter.

## Logs and limits

The existing private database audit log was inspected, including its earlier unapproved denial and the affected student's verified identity. The faulty navigation was rejected before enrollment authorization, explaining the lack of a corresponding database denial event. The corrected worker now emits sanitized `jslab_access_denied` events with coarse route categories, bounded JWT error reasons, assertion-presence and navigation flags. It never logs emails, subject IDs, JWT/cookie values, full resource IDs or query strings.

Live Wrangler tail attempts initially failed because this CLI required an explicit deployment URL, despite its environment-selection option. A bounded explicit-URL attempt did not yield a captured event in its window; no raw request trace was exposed or claimed as inspected. Browser outcomes, server session codes and database audit/restoration checks provided the executed evidence above. Separate no-record unapproved identity and wrong-JWT cases were exercised in the automated tests; the live unapproved case used pending approval on an existing verified identity.

The public GitHub Pages site and legacy resource mode remain as previously requested. This fix does not perform the deferred privacy cutover.

References: [Cloudflare assertion validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Cloudflare session/logout behavior](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/).
