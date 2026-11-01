// Owner-only account authorization through the existing Supabase CLI session.
// This creates no account, changes no password and offers no public registration.
import { createClient } from "@supabase/supabase-js";
import { publicSettings, serverKey } from "./resource-cloud-tools.mjs";
const id = process.argv[2],
  role = process.argv.includes("--admin") ? "admin" : "teacher";
if (
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
    id || "",
  )
)
  throw Error("Provide the exact confirmed Auth User UID.");
if (!process.argv.includes("--confirm"))
  throw Error(
    "Pass --confirm to authorize this exact existing account. Add --admin only for a library administrator.",
  );
const { url, ref } = publicSettings();
const db = createClient(url, serverKey(ref), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await db.auth.admin.getUserById(id);
if (
  error ||
  !data.user ||
  !data.user.email_confirmed_at ||
  data.user.is_anonymous
)
  throw Error(
    "The UID must belong to an existing confirmed, non-anonymous Auth user.",
  );
const result = await db
  .from("authorized_teachers")
  .upsert({ user_id: id, role });
if (result.error)
  throw Error(
    "Authorization failed. Check the migration and owner permissions.",
  );
const audit = await db
  .from("resource_audit_log")
  .insert({
    actor: id,
    action: "teacher_authorized",
    detail: { role, method: "owner-cli" },
  });
if (audit.error)
  throw Error(
    "Account authorized, but the audit entry could not be saved. Check the database.",
  );
console.log(
  `Authorized confirmed account ${id} as ${role} in project ${ref}. Its password was not accessed or changed.`,
);
