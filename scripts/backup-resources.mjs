// Run privately on the owner's computer. Never bundle this script or its credentials.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { sha256 } from "../supabase/functions/_shared/validation.mjs";
const url = process.env.RESOURCE_BACKUP_URL;
const key = process.env.RESOURCE_BACKUP_SERVER_KEY;
if (!url || !key)
  throw Error(
    "Set RESOURCE_BACKUP_URL and RESOURCE_BACKUP_SERVER_KEY in this private terminal session.",
  );
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const root = path.resolve(
  "resource-backups",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
await fs.mkdir(root, { recursive: true });
const manifest = {
  format: "js-lab-resource-backup-v1",
  exported_at: new Date().toISOString(),
  tables: {},
  objects: [],
};
for (const table of [
  "learning_resources",
  "resource_versions",
  "resource_categories",
  "resource_settings",
  "resource_audit_log",
]) {
  const rows = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .range(start, start + 999);
    if (error) throw Error("Could not back up " + table);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  manifest.tables[table] = rows;
}
let failures = 0;
for (const version of manifest.tables.resource_versions) {
  if (version.state === "purged") continue;
  if (
    !/^resources\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.[a-z0-9]+$/.test(
      version.storage_path,
    )
  )
    throw Error("Unsafe object path in manifest.");
  const destination = path.resolve(root, "objects", version.storage_path);
  if (!destination.startsWith(root + path.sep))
    throw Error("Backup path escaped its destination.");
  const { data, error } = await db.storage
    .from("learning-resources")
    .download(version.storage_path);
  if (error) {
    manifest.objects.push({
      id: version.id,
      path: version.storage_path,
      error: "Object unavailable",
    });
    failures++;
    continue;
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const digest = await sha256(bytes);
  if (digest !== version.sha256) {
    manifest.objects.push({
      id: version.id,
      path: version.storage_path,
      error: "Checksum mismatch",
    });
    failures++;
    continue;
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, bytes, { flag: "wx" });
  manifest.objects.push({
    id: version.id,
    path: version.storage_path,
    sha256: digest,
    size: bytes.length,
  });
}
await fs.writeFile(
  path.join(root, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { flag: "wx" },
);
console.log(
  `Backup saved to ${root}. ${manifest.objects.length - failures} objects verified; ${failures} objects unavailable or invalid.`,
);
if (failures) process.exitCode = 1;
