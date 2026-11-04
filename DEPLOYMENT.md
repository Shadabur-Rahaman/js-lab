# JS Lab private deployment

The private replacement uses Cloudflare Pages Advanced Mode. `_worker.js` authorizes **every** request before calling `env.ASSETS.fetch`, and `_routes.json` includes `/*` with no exclusions. No production, preview, branch or custom hostname is implicitly trusted. An unconfigured deployment returns a denial, never the static app.

## Current migration boundary

Keep GitHub Pages running until the private site is verified and the owner approves retirement. While the old public deployment and its legacy resource gateway remain enabled, the whole platform cannot honestly be called private. Source and lessons already published in the public GitHub repository also remain public. Changing repository visibility is a separate owner decision; no code can recall copies already obtained.

## Build and deploy

1. `npm ci`, `npm test`, `npm run build:private`.
2. Sign in with `npx wrangler login`. Create a Pages project: `npx wrangler pages project create js-lab-private --production-branch main`. On CLI versions that attempt automatic conversion to Workers, use `--force` **only for project creation** to keep Pages.
3. Apply the additive schema: `npx supabase db push --remote` (older CLI versions may use `--linked`). Deploy the legacy API cutover guard: `npx supabase functions deploy resource-api --project-ref dacvuxwlowdgrdhukryj --no-verify-jwt`.
4. Configure Cloudflare Zero Trust and choose your team name. Enable One-time PIN as the login method. Create a **Self-hosted Access application** covering `js-lab-private.pages.dev` and `*.js-lab-private.pages.dev`; include every custom hostname if one is added. Follow Cloudflare's Pages known-issues instructions to protect the production pages.dev domain as well as previews.
5. Create an **Allow** policy with **Emails** for the existing verified JS Lab administrator and the two approved student emails only. Do not use Everyone, email domain rules, Bypass, service-token bypass, or “One-time PIN” alone as the allow condition. The hosting-account email can differ from the classroom administrator's email; it does not automatically grant classroom access.
6. Copy the application's **Application Audience (AUD) tag**. Configure all these bindings for **Production and Preview** in Workers & Pages → js-lab-private → Settings → Variables and Secrets:

| Binding | Value |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | `https://your-team.cloudflareaccess.com` |
| `ACCESS_AUD` | Exact Access application AUD; comma-separated only when intentionally protecting another host with its own application |
| `PROTECTED_HOSTS` | Exact hosts, comma-separated: initially `js-lab-private.pages.dev`; no wildcard and no scheme |
| `SUPABASE_URL` | Existing Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **Encrypted server secret**; never a `VITE_` variable |

Secret values may be piped into `wrangler pages secret bulk --project-name js-lab-private` through stdin, never command arguments or tracked files. Run the bulk command separately with `--env production` and `--env preview`, and verify both in the dashboard. The server key never goes to the browser. No Cloudflare Access administration token is needed by the application.

7. `npx wrangler pages deploy dist-private --project-name js-lab-private --branch main`. Every deployment must include the built `_worker.js` and `_routes.json`. Never deploy plain `dist` to this project. Dashboard Git builds, if enabled, must use `npm run build:private`, output `dist-private`, and the same bindings in both environments.
8. Sign in through Access using the **existing verified teacher email**, then open Student Management. Add student name/email, approve duration and add that same email to Cloudflare's allow policy. The UI deliberately reports the allowlist as separately configured; it cannot claim synchronization it does not perform. No public enrollment or administrator signup exists.

## Verify before cutover

Check the real production URL on desktop and mobile. Sign out in a separate browser and verify HTML, known JS/CSS/PDF worker assets, `/api/session` and `/api/files/<id>` require Access. Request a deployment hash URL, branch alias and any custom hostname: unknown hosts must deny, even if a token for production is copied there. Explicitly approving a preview hostname also requires its Access application/audience configuration.

Test administrator upload, preview, download, edit and trash/restore using a disposable file, then refresh. Test both real students: approved sign-in, pending denial, expiry, suspension, role-change attempts, revoke on next HTTP request and locking an open tab within about 15 seconds (background browser throttling can delay timers; focus/pageshow immediately rechecks). Simulate missing bindings and unavailable database/JWKS; there is no fallback access.

Students cannot access drafts. Even an administrator's download URL contains only a resource ID: it must pass Access and live enrollment again. Files are streamed through the server without sending a Storage signed URL to the client. Private uploads use a server endpoint, with reservation ownership, size, file signature and SHA-256 checks; existing metadata, private objects and retention rules are preserved.

## Progress migration

On the old origin open **Development academy → Roadmap** (`#academy/roadmap`) and click **Export my progress**. On the private origin open the same screen and choose **Import and merge progress**. The existing importer validates the format, limits the file to 500 KB and merges completions/answers without discarding current progress. Project files remain separate: export/import their ZIPs in the workspace. Do this separately for each student's browser profile. Cross-origin localStorage cannot be read automatically. Never export the entire browser storage, Auth sessions, access tokens, classroom code or cookies. The old origin's data is not deleted.

## Explicitly approved final cutover

Do not execute this stage until the owner approves retiring the public deployment **after** real private-login tests pass.

1. Preserve a release tag and verify an object backup according to RESOURCE_LIBRARY_SETUP.md.
2. Set `public.private_access_settings.enforced=true` for its single row in the Supabase SQL editor. This immediately removes legacy anonymous metadata visibility, direct browser upload permission and old Edge API operations. No file rows/bytes are deleted. Old signed links may last up to 60 seconds; copies downloaded earlier cannot be erased.
3. Disable the GitHub Pages publish workflow (keep CI checks separately), then Settings → Pages → Unpublish site. Obtain explicit owner approval before either action. Check the actual old URL is no longer serving the public app, and check old raw resource API calls return 403 and public metadata is empty.
4. Optionally make the source repository private with separate owner approval. Git history and copies previously shared cannot be recalled.

## Rollback

Before cutover, leave the old site intact and correct/redeploy the private build; an absent service denies access. After cutover, revert to the last working **private** Cloudflare deployment while retaining Access, secrets and the database guard. Keep enrollment tables and file data. Re-enabling GitHub Pages or setting `enforced=false` reopens public access and requires explicit owner approval; never do it as an automatic availability fallback. No down migration deletes enrollments or learning resources.

References: [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [Pages Access caveats](https://developers.cloudflare.com/pages/platform/known-issues/), [Access email policy rules](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/common-policies/).
