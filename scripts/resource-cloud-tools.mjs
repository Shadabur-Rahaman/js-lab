// Owner-terminal tools only. Never import into browser code.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
export function publicSettings() {
  const local = fs.existsSync(".env.local")
    ? Object.fromEntries(
        fs
          .readFileSync(".env.local", "utf8")
          .split(/\r?\n/)
          .filter((line) => line.includes("="))
          .map((line) => {
            const i = line.indexOf("=");
            return [line.slice(0, i), line.slice(i + 1)];
          }),
      )
    : {};
  const url = process.env.RESOURCE_TEST_URL || local.VITE_SUPABASE_URL;
  const key =
    process.env.RESOURCE_TEST_PUBLISHABLE_KEY ||
    local.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw Error(
      "Set RESOURCE_TEST_URL and RESOURCE_TEST_PUBLISHABLE_KEY, or the public settings in .env.local.",
    );
  const ref = new URL(url).hostname.split(".")[0];
  if (!/^[a-z]{20}$/.test(ref))
    throw Error("Expected a hosted Supabase project URL.");
  return { url, key, ref };
}
export function supabase(args) {
  if (args.some((arg) => /["'`;\r\n]/.test(arg)))
    throw Error("Unsafe CLI argument.");
  try {
    const raw =
      process.platform === "win32"
        ? execFileSync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              "npx --yes supabase " +
                args.map((arg) => '"' + arg + '"').join(" "),
            ],
            {
              encoding: "utf8",
              stdio: ["ignore", "pipe", "pipe"],
              timeout: 120000,
            },
          )
        : execFileSync("npx", ["--yes", "supabase", ...args], {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
            timeout: 120000,
          });
    return raw;
  } catch {
    throw Error(
      "Supabase CLI operation failed. Check this terminal’s login and project permissions. Private command output was suppressed.",
    );
  }
}
export function serverKey(ref) {
  const response = JSON.parse(
    supabase([
      "projects",
      "api-keys",
      "--project-ref",
      ref,
      "--reveal",
      "--output",
      "json",
    ]),
  );
  const rows = Array.isArray(response)
    ? response
    : response.api_keys || response.keys || [];
  const row =
    rows.find((item) => item.name === "service_role") ||
    rows.find((item) => item.type === "secret");
  const key = row?.api_key || row?.key;
  if (!key || key.includes("…") || key.includes("..."))
    throw Error(
      "The CLI did not provide a usable server key. Nothing was printed or saved.",
    );
  return key;
}
