// Owner-only setup. Secrets stay in Edge secrets/Vault and private process memory.
import fs from "node:fs/promises";
import { publicSettings, supabase } from "./resource-cloud-tools.mjs";
const { url, ref } = publicSettings();
if (!process.argv.includes("--confirm"))
  throw Error(
    "Pass --confirm only after approving daily permanent retention cleanup for this project.",
  );
await fs.mkdir(".deployment", { recursive: true });
async function query(sql) {
  const file = ".deployment/resource-retention-" + crypto.randomUUID() + ".sql";
  try {
    await fs.writeFile(file, sql, { mode: 0o600 });
    return JSON.parse(
      supabase([
        "db",
        "query",
        "--linked",
        "--project-ref",
        ref,
        "--file",
        file,
        "--output",
        "json",
      ]),
    ).rows;
  } finally {
    await fs.unlink(file).catch(() => {});
  }
}
await query(
  "create extension if not exists pg_cron with schema pg_catalog; create extension if not exists pg_net with schema extensions; select true as ready;",
);
const existing = await query(
  "select name,decrypted_secret from vault.decrypted_secrets where name in ('resource_maintenance_url','resource_maintenance_secret');",
);
if (
  existing.filter((r) => r.name === "resource_maintenance_secret").length > 1 ||
  existing.filter((r) => r.name === "resource_maintenance_url").length > 1
)
  throw Error(
    "Duplicate maintenance Vault names. Resolve them before scheduling.",
  );
const endpoint = url + "/functions/v1/resource-maintenance";
const storedUrl = existing.find(
  (r) => r.name === "resource_maintenance_url",
)?.decrypted_secret;
if (storedUrl && storedUrl !== endpoint)
  throw Error(
    "Existing maintenance URL belongs to a different endpoint. Review before proceeding.",
  );
const secret =
  existing.find((r) => r.name === "resource_maintenance_secret")
    ?.decrypted_secret || crypto.randomUUID() + crypto.randomUUID();
const envFile =
  ".deployment/resource-maintenance-" + crypto.randomUUID() + ".env";
try {
  await fs.writeFile(envFile, "RESOURCE_MAINTENANCE_SECRET=" + secret + "\n", {
    mode: 0o600,
  });
  supabase(["secrets", "set", "--project-ref", ref, "--env-file", envFile]);
} finally {
  await fs.unlink(envFile).catch(() => {});
}
const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
if (!storedUrl)
  await query(
    `select vault.create_secret(${literal(endpoint)},'resource_maintenance_url');`,
  );
if (!existing.some((r) => r.name === "resource_maintenance_secret"))
  await query(
    `select vault.create_secret(${literal(secret)},'resource_maintenance_secret');`,
  );
const command =
  "select net.http_post(url := (select decrypted_secret from vault.decrypted_secrets where name='resource_maintenance_url' limit 1),headers := jsonb_build_object('Content-Type','application/json','x-maintenance-secret',(select decrypted_secret from vault.decrypted_secrets where name='resource_maintenance_secret' limit 1)),body := '{}'::jsonb,timeout_milliseconds := 10000)";
await query(
  `select cron.schedule('js-lab-resource-retention','20 3 * * *',${literal(command + ";")});`,
);
const check = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-maintenance-secret": secret,
  },
  body: "{}",
  signal: AbortSignal.timeout(30000),
});
const data = await check.json();
if (!check.ok || data.failed)
  throw Error(
    "Retention endpoint check failed. The schedule exists; inspect provider diagnostics before relying on it.",
  );
const queued = await query(command + " as request_id;");
const status = await query(
  "select schedule,active from cron.job where jobname='js-lab-resource-retention';",
);
console.log(
  JSON.stringify({
    project: ref,
    schedule: status[0],
    endpoint_check: "passed",
    removed: data.removed,
    failed: data.failed,
    queued_database_http_request: queued[0]?.request_id,
    note: "Secrets stored in Edge secrets/Vault; temporary transfer files removed.",
  }),
);
