# Connect the JS LAB classroom library

JS LAB stays at https://shadabur-rahaman.github.io/js-lab/. Supabase provides teacher accounts, Postgres metadata, private file storage and two server functions. Once connected, uploads and publishing update the database immediately: **no GitHub commit or Pages deployment per file**.

**Current delivery:** the integration is implemented, but no Supabase project or teacher account was supplied. Live sign-in, uploads, Storage policies and downloads have not been verified against a hosted project. The deployed site deliberately shows a setup state until configured. Existing lessons, progress, playgrounds and classroom tools work independently.

## 1. Create your project

1. Sign in at [Supabase](https://supabase.com/dashboard) and create a project dedicated to JS LAB. Choose your region and keep its database password private. Do not purchase a plan unless you decide it is needed.
2. Wait for provisioning. In the project's Connect/API settings, find its URL and **publishable key** (`sb_publishable_…`). A legacy `anon` JWT is also supported. These are public configuration, not teacher credentials.
3. Keep service-role/secret keys, database passwords and account passwords out of Vite variables, GitHub source, screenshots and this chat. Never use a `service_role` JWT or `sb_secret_…` key in the frontend. The app rejects them as frontend configuration.

## 2. Apply the database migration

Open the project's SQL Editor. Run the full contents of [`supabase/migrations/202611010001_resources.sql`](supabase/migrations/202611010001_resources.sql) **once in a new project**. It runs transactionally; investigate an error before continuing. Do not run the local-only `supabase/tests/bootstrap.sql` in Supabase.

The migration creates tables, indexes, RLS policies, a private `learning-resources` bucket and default categories. Check Storage: the bucket must be **private**, with a 50 MB ceiling and the supplied MIME allowlist. Do not add public-read or unrestricted write policies. Existing policies on shared buckets could broaden access, which is why a dedicated project is recommended.

With the Supabase CLI, an alternative is `supabase link --project-ref YOUR_PROJECT_REF` then `supabase db push` from this repository. Review the migration plan first. Never reset a live database to apply this feature.

### What the permissions do

- Anonymous and signed-in students can select only published resource metadata. They cannot read draft metadata, write tables, change roles, read arbitrary private objects or call privileged database commands.
- A Storage INSERT requires an authenticated authorized teacher and an unexpired upload reservation for that exact generated object path. There is no client Storage SELECT, UPDATE or DELETE policy. Upsert is disabled.
- All metadata mutations and signed-link generation pass through `resource-api`. It verifies teacher JWTs with Auth and checks the server-maintained role mapping. The classroom access code is never consulted.
- A `teacher` manages their own resources; an `admin` manages all resources, categories, settings, retention and exports. There is no self-signup or self-promotion operation in the app.
- Service-only transactional commands repeat role checks, lock records and compare revision numbers. Conflicting edits require refresh; replacements keep the resource ID and use a new object path.

## 3. Create the first authorized teacher

1. In Authentication settings, disable public user signups for this dedicated teacher-only project. Enable the email/password provider, use the provider's email delivery configuration and choose suitable password/rate-limit settings. MFA can be enabled through Supabase; this first interface uses password sign-in and does not include an MFA challenge screen.
2. In Authentication → Users, create the teacher account using your own email and a strong private password, or invite the teacher using the dashboard. Complete the provider's account confirmation flow.
3. Copy that account's **User UID**, not its password. In SQL Editor, substitute the UID in:

```sql
insert into public.authorized_teachers(user_id, role)
values ('REPLACE_WITH_AUTH_USER_UUID'::uuid, 'admin');
```

Only the project owner runs this SQL. Future accounts can use role `teacher`, or `admin` if intended. Remove a mapping to revoke management rights. Sign out the old account as well. Existing short-lived file links expire separately.

In Authentication → URL Configuration, set Site URL to `https://shadabur-rahaman.github.io/js-lab/` and allow the exact recovery redirect `https://shadabur-rahaman.github.io/js-lab/?resource-recovery=1`. For local testing also allow `http://127.0.0.1:5177/?resource-recovery=1` (or your chosen port). The app uses PKCE; open the recovery email in the browser that requested it. Configure email templates to preserve the provider's confirmation redirect flow. Test an actual recovery email before relying on it.

## 4. Deploy the server functions

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), sign in with `supabase login`, then run from this repository:

```text
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy resource-api --no-verify-jwt
supabase functions deploy resource-maintenance --no-verify-jwt
```

The included `supabase/config.toml` declares the same gateway settings. Gateway JWT verification is off because published downloads are anonymous; **the handler explicitly verifies Auth JWTs for every management operation**. Do not remove those checks. `resource-maintenance` separately requires a server-only maintenance secret.

The server uses Supabase's automatic `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables. These stay in Edge Functions. Never copy them into a `VITE_` variable. Check the function environment if the provider changes automatic key availability.

Generate a long random `RESOURCE_MAINTENANCE_SECRET` privately and add it using the dashboard's Edge Function secrets interface. Never expose it to the browser. The maintenance endpoint requires it in `x-maintenance-secret`. An authenticated admin can also run retention cleanup from Manage Resources without this secret.

## 5. Connect GitHub Pages once

In GitHub repository Settings → Secrets and variables → Actions → **Variables**, add:

| Repository variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your project's `https://PROJECT_REF.supabase.co` URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your project's public publishable key |

Run the existing **Deploy JS LAB to GitHub Pages** workflow once from Actions. The workflow already reads these variables at build time. No private key belongs here. The existing Pages URL and hash routes remain unchanged.

For local work, copy `.env.example` to `.env.local`, insert only the same public values and restart Vite. `.env*` secrets are ignored by Git; `.env.example` contains placeholders. Public settings changing requires one frontend rebuild; **file operations never require rebuilding**.

## 6. Upload and publish your first material

1. Open [Manage Resources](https://shadabur-rahaman.github.io/js-lab/#teacher/resources), or unlock classroom Teacher Mode and select Manage Resources. Sign in with the authorized account. The classroom code alone cannot sign in here.
2. Browse or drag in a small PDF. Expand its queued entry to edit title, description, category, chapter, specific topic, tags, visibility and display order. You may select multiple files with separate metadata.
3. Select **Upload / retry queued files**. The real byte transfer uses resumable TUS uploads with 6 MB chunks and bounded retries. The server then checks actual size, format signature and SHA-256 before confirming **Saved to cloud**. Keep this page open until verification finishes. Errors do not publish incomplete files.
4. Start as a draft. Confirm it appears after refreshing the manager. Select Publish, then open [Study Materials](https://shadabur-rahaman.github.io/js-lab/#resources) in a signed-out browser. It should appear without a new Pages deployment.
5. Resources assigned to a chapter also appear under **Additional Study Materials** on that chapter's page. A specific topic is a searchable optional label, kept independent of curriculum source IDs so curriculum changes do not delete resources.
6. Use Edit details for metadata-only changes. Replace file preserves the resource ID and stages a new object; it does not overwrite the old object. Review the replacement's visibility before uploading.
7. Unpublish hides the material from public metadata and new download links. Move to trash asks for confirmation and offers Restore as draft for 30 days. Republish explicitly after restoring.

PDF previews use the browser's PDF support in a sandboxed frame; available page/zoom controls vary by browser. Images support zoom/fullscreen. Text/CSV/Markdown previews are escaped plain text, capped at 1 MB. Office files and ZIPs are download-only; files are never sent to a third-party preview service or extracted into the app.

Each download requests a fresh signed URL valid for 60 seconds and preserves the readable original filename. Retry after an expired or failed link. Previously issued URLs may remain usable until expiry; downloaded copies cannot be recalled. A PDF viewer can retain an already loaded document even after its link expires.

## 7. Retention and scheduled cleanup

Replaced files are retained for 7 days. Trash can be restored for 30 days. Upload reservations expire after one hour. Cleanup first invalidates eligible records transactionally, then removes bytes through the Storage API. Failed deletions stay queued for another run. Unfinished TUS upload chunks are governed by the provider's separate upload expiry (currently 24 hours); cancelling a reservation does not guarantee immediate removal of every incomplete chunk.

Until you configure a schedule, an admin must use **Run scheduled retention cleanup** periodically. To automate, enable Supabase Cron (`pg_cron`) and `pg_net`, store `resource_maintenance_url` (the full `/functions/v1/resource-maintenance` URL) and `resource_maintenance_secret` in Supabase Vault, then run this SQL in the project:

```sql
select cron.schedule('js-lab-resource-retention', '20 3 * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'resource_maintenance_url' limit 1),
    headers := jsonb_build_object('Content-Type','application/json',
      'x-maintenance-secret', (select decrypted_secret from vault.decrypted_secrets
                              where name = 'resource_maintenance_secret' limit 1)),
    body := '{}'::jsonb
  );
$$);
```

Create each Vault value only once; avoid duplicate names. Inspect Cron history, Edge logs and `net._http_response` after the first run. A schedule entry alone does not prove the HTTP request succeeded. Rotate the maintenance secret if disclosed. No cleanup schedule has been created for you.

## 8. Back up metadata AND file bytes

**No automatic backup has been configured.** Supabase database backups do not by themselves back up Storage object bytes. Keep your original classroom files and an independent encrypted backup.

The admin's Export metadata manifest downloads resource/category/version metadata and checksums, **not files**. It contains object paths but no signed URLs or credentials. Keep it private.

For a complete local export, in a private terminal set `RESOURCE_BACKUP_URL` and `RESOURCE_BACKUP_SERVER_KEY` (server credential from your project's API settings), then run `node scripts/backup-resources.mjs`. Never put this server key in Vite, a browser, command history containing literal credentials, or committed files; use your terminal's private environment/secret mechanism. Clear the variables afterwards. The script paginates metadata, downloads every non-purged version, verifies SHA-256 and writes `resource-backups/TIMESTAMP/manifest.json` plus private object files. A nonzero exit means missing/invalid bytes: inspect and retry. The ignored backup folder is not a backup until copied to a separate protected location.

Run backups while teacher writes and retention cleanup are paused, since this export is not a cross-service transactional snapshot. Test restoration in a separate project: apply the migration, recreate authorized Auth users and role mappings, restore category IDs, resource rows with `current_version_id` temporarily null, version rows and private Storage paths, then restore current-version pointers and published status only after object checksum checks. Preserve the same UUIDs and association labels. The role/user mapping is deliberately not exported as credentials. Have a database-capable operator supervise restore; do not import a manifest into a live project blindly.

## 9. Limits, costs and validation

Default file limit is 25 MB (binary MiB in the UI). An admin can set 1–50 MB; the bucket and project-wide Storage limit must also permit that size. The app never upgrades your plan. The dashboard's current file total comes from managed records and **does not represent your complete storage quota**: retained versions, incomplete uploads and unrelated storage may add usage.

Check the current [Supabase pricing](https://supabase.com/pricing), Storage limits, egress, Auth email limits and Edge Function usage in your project. Free allowances can change. Upload verification reads the uploaded bytes once server-side, adding work/egress; student downloads consume bandwidth. Rate limits protect common API operations but are not a complete distributed abuse or billing guarantee. Configure provider spend controls and alerts where available.

Allowed extensions: PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, TXT, JPG/JPEG, PNG, GIF, WebP, ZIP, CSV, MD. Executables, HTML, SVG, JS and macro-enabled Office extensions are rejected. Server signature/checksum checks are **not antivirus scanning**; legacy Office files and archives can contain risky embedded material. Upload trusted classroom files and scan originals with your organization's antivirus. ZIPs are not unpacked; no malware scanner is configured or claimed.

## 10. Verify before teaching

Run `npm test` and `npm run build`. For the browser UI harness, run `node scripts/build-resource-browser-tests.mjs`, start Vite, open `/tests/resources-browser.html` and select Run resource UI checks. Its adapter is explicitly test-only; it is absent from the production build and does not verify cloud persistence. The existing V4/native/worker harnesses remain available.

Local database checks can run against an isolated new PostgreSQL test cluster: `psql -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql TEST_DATABASE` followed by `psql -v ON_ERROR_STOP=1 -f supabase/tests/permissions.sql TEST_DATABASE`. Bootstrap creates stand-in Supabase schemas and roles; **never run it on a live or existing database**. The Pages workflow also runs these checks in a disposable Postgres service. These tests verify real Postgres RLS/grants/transactions, but do not replace hosted Auth, Storage or Edge integration tests. The Edge functions can be type-checked with `deno check --no-lock supabase/functions/resource-api/index.ts supabase/functions/resource-maintenance/index.ts`.

After configuration, manually verify these hosted scenarios with disposable classroom files:

- Authorized login/recovery/logout; an ordinary Auth user and a visitor cannot manage files or assign a role. The classroom code alone cannot call CRUD.
- PDF, PPTX, image and multiple-file uploads; invalid extension, false MIME/signature, zero/oversized bytes, network interruption, resume/cancel, quota failure and expired session. Success appears only after verified persistence. Refresh and use a second device.
- Edit metadata, category, chapter/topic and ordering; publish/unpublish/archive; replace with stable ID and new bytes; trash/restore as draft; conflicting edits in two tabs; repeated retries do not create duplicate resource records.
- Anonymous metadata exposes published items only. Direct Storage reads, writes and signing arbitrary drafts fail. Signed downloads preserve names; fresh public links fail after unpublish/trash. Test expiry/retry and all previews.
- Search/filters/pagination, focus/manual refresh and chapter links reflect new resources without a GitHub deployment. Keyboard dialogs, phone layouts and provider outages leave learning tools usable.
- Run retention on disposable expired fixtures and inspect failed-delete retries and the audit table. Export both metadata and object bytes, and verify a test restore separately.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Setup state persists | Both public repository variables exist; rerun the Pages workflow; confirm the URL/key are from the same project. |
| Sign-in works but access denied | The Auth User UID must be in `authorized_teachers`; an email address or classroom code is not a UID. |
| Function missing / CORS or generic error | Both functions deployed, gateway flags correct, automatic server variables available; inspect private Edge logs. Do not paste server secrets into the app. |
| Upload fails at start | Reservation and Auth session, bucket MIME/size settings, unmodified Storage INSERT policy, project quota and network. |
| Retry fails after an hour | Cancel the expired reservation, clear the cancelled item and select the file again. |
| Resource changed | Another operation changed the revision. Refresh before editing/replacing again. |
| Recovery link fails | Correct redirect allowlist/email template, same PKCE browser, fresh email, email delivery provider settings. |
| Preview fails | Retry for a fresh URL; browser PDF support may vary. Download original Office/ZIP or large text files. |
| Unpublish appears delayed | Refresh materials or return focus after 30 seconds. Already issued links may work for 60 seconds. |
| Provider limit reached | Increase capacity only if you choose; reduce file size or run eligible retention cleanup. Existing saved resources remain intact. |

Reference: [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads), [password recovery](https://supabase.com/docs/guides/auth/passwords), [Edge Function configuration](https://supabase.com/docs/guides/functions/function-configuration).
