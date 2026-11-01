# JS LAB resource library: live verification

Verified on 1 November 2026 against the owner's connected Supabase project. This report distinguishes actual provider operations from local tests and describes remaining verification limits.

## Live backend

- Confirmed the project is healthy, migration `202611010001` is recorded and both resource Edge Functions are active.
- Audited all seven resource tables: RLS enabled. Public reads expose published metadata only; no anonymous or ordinary-user writes or self-promotion are permitted.
- Confirmed `learning-resources` is private, with the intended MIME allowlist and 50 MB infrastructure ceiling. Default application limit is 25 MB. Storage INSERT requires an authenticated teacher's exact unexpired reservation. Direct private reads and arbitrary signing/overwriting are not granted to clients.
- Authorized only the confirmed personal account UID selected by the owner as resource administrator. Its password was never accessed or changed. The classroom access-code verifier remains unchanged.
- Applied reviewed Auth configuration: existing email/password sign-in enabled, global public signup disabled, anonymous sign-ins disabled, JS LAB recovery redirects configured, minimum new password length 12. The hosted email-provider switch must remain enabled even when global registration is disabled; a real sign-in test caught and corrected that distinction.

## Seventeen real cloud acceptance checks

The owner-terminal test script uses the official CLI's existing login, retrieves a server credential into process memory, and never prints or stores it. It creates three clearly labeled disposable Auth users with private generated credentials. Tests used actual Auth, Edge Functions, Postgres and Storage, not a simulated adapter.

1. Authorized teacher signs in; ordinary account and unauthenticated management requests are denied.
2. Existing email sign-in remains enabled; public registration is rejected.
3. Anonymous and ordinary accounts cannot self-promote, insert resources or invoke privileged RPCs.
4. Actual resumable PDF upload persists as a private draft; public metadata and direct private access are denied.
5. Unreserved teacher paths and student uploads are denied by Storage.
6. Metadata edits persist category, chapter, topic and published status.
7. Published signed download returns the original PDF checksum and readable filename.
8. A fresh SDK client retrieves the persisted cloud metadata.
9. PPTX, PNG and DOCX independently upload and download with identical checksums.
10. Oversized and unsupported prepare requests reject without publication.
11. Misnamed actual bytes fail server verification and remain unpublished; cancellation cleans up the invalid test object.
12. Another teacher's edits and stale revisions reject.
13. Replacement keeps the resource ID, uses a different object path and downloads the new bytes.
14. Repeated prepare returns the original saved reservation rather than creating a duplicate.
15. A 7 MB multi-chunk TUS upload passes server checksum verification.
16. Unpublish denies fresh public links; trash hides records; restore returns to private draft.
17. Manifest and audit records reflect actual operations; non-admin manifest access is denied.

Result: **17 passed, zero failed.** Six disposable resource records, seven object paths and three test accounts were cleaned up with zero reported cleanup errors. The operator-local detailed report is ignored by Git and contains no credentials or signed links.

## Real browser workflow

Using the actual frontend connected to the actual backend and a separate disposable teacher account:

- Signed in through the ordinary email/password form.
- Selected a PDF, PNG, PPTX and text file through the file chooser. Each displayed `Saved to cloud` only after real byte transfer, validation and metadata persistence.
- Refreshed the website: all four files and the authenticated session were retained.
- Edited the PDF's title, description, category, chapter and visibility using the app's metadata dialog.
- Opened Study Materials: the published PDF appeared and all three drafts remained hidden.
- Opened the signed PDF preview in its sandboxed frame and dismissed its native dialog with Escape.
- Opened chapter 3: Additional Study Materials contained the associated PDF while the original chapter/playgrounds remained available.
- Confirmed moving the PDF to trash through the app's dialog. The persisted manager showed one deleted resource; an independent anonymous query returned zero published resources.
- Signed out and removed only this disposable account, its files/metadata and its temporary private credential file after testing.

Actual signed HTTP downloads and original-byte integrity were verified by the cloud acceptance suite. Browser PDF renderer features depend on browser support; no universal page-navigation behavior is claimed. Office files are download-only, not rendered through an external preview service.

## Approved daily retention

The owner explicitly approved permanent recurring retention cleanup. The `js-lab-resource-retention` Cron job is active at `03:20 UTC` daily, equivalent to `08:50 Asia/Calcutta`. Edge secrets and encrypted Vault values were configured without exposing them to the browser or repository.

The cleanup endpoint returned HTTP 200. A request issued through Postgres `pg_net` also returned HTTP 200 with zero failed deletions; anonymous direct invocation returned HTTP 403. Anonymous Vault SELECT was denied. No eligible real classroom files existed during these checks, so this verifies transport/authorization and invocation, not an observed scheduled purge of aged production files. Retention eligibility and invalidation were independently tested in local PostgreSQL.

## Preservation and limits

The 58 deterministic automated tests pass, including complete preservation checks for all nineteen chapter records, the arena, progress handling, runners and classroom verifier. The production build passes. GitHub Pages continues to use the original repository, workflow and public URL; only the public project URL/publishable key are passed to Vite.

No personal password was requested or tested. Password-recovery redirects are configured, but delivery of an actual recovery email to the owner was not exercised. No backup schedule or malware scanner has been configured. Database backups do not by themselves back up Storage object bytes: follow the separate backup procedure in [RESOURCE_LIBRARY_SETUP.md](RESOURCE_LIBRARY_SETUP.md).

## PDF preview repair

The original browser check confirmed a PDF frame existed, but did not verify that the browser plugin drew its contents. The owner subsequently reported Chrome's broken-document panel. The native embedded viewer has been replaced with patched PDF.js 6.4.299, bundled locally with its worker, character maps, standard fonts and image decoders. Previews instantiate only canvas rendering and escaped page text, with no PDF scripting manager, form/annotation actions or third-party preview service.

The three actual classroom PDFs were read into an ignored, temporary local-only verification folder, without changing their stored bytes, metadata or publication status. Browser checks verified nonblank rendered canvas pixels, zoom and page navigation for all three files, including the reported Day 2 document (16 pages). Tests also cover link renewal on expiry, bounded retries, incomplete/wrong file data, cancellation and bounded canvas memory. The deterministic suite now has 63 passing tests.

The PDF browser harness is development-only: `node scripts/build-pdf-browser-tests.mjs`, then `/tests/pdf-preview-browser.html` on Vite. It expects operator-provided authorized local PDF fixtures and a manifest under the ignored `.deployment/pdf-preview-fixtures/`; those documents are never committed or included in the published build. The release bundles its worker and rendering assets under relative GitHub Pages paths. Preview bytes remain temporary in memory and are released when closed; file downloads and authorization still use the existing resource API.
