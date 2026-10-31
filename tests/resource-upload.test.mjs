import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
// Exercise the real upload coordinator with transport doubles. No provider traffic,
// no production adapter, and no claim that hosted Storage has passed integration.
const bundle = await build({
  entryPoints: ["src/resources/client.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  define: {
    "import.meta.env": JSON.stringify({
      VITE_SUPABASE_URL: "https://fixture.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test",
    }),
  },
  plugins: [
    {
      name: "unit-transports",
      setup(builder) {
        builder.onResolve(
          { filter: /^(@supabase\/supabase-js|tus-js-client)$/ },
          (args) => ({ path: args.path, namespace: "fixture" }),
        );
        builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
          contents:
            args.path === "tus-js-client"
              ? 'export class Upload { constructor(){ throw Error("Unexpected second byte transfer"); } }'
              : 'export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:"unit-token"}}})}};}',
          loader: "js",
        }));
      },
    },
  ],
});
const { uploadJob, blank } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundle.outputFiles[0].text).toString("base64")
);
test("retry after a completed byte transfer verifies existing object without uploading again", async () => {
  const original = globalThis.fetch;
  const calls = [];
  const phases = [];
  let finish;
  const pending = new Promise((r) => {
    finish = r;
  });
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body);
    calls.push(body.action);
    if (body.action === "prepare")
      return Response.json({
        id: "reserved",
        state: "uploading",
        storage_path: "reserved.pdf",
        object_exists: true,
      });
    if (body.action === "finalize") {
      await pending;
      return Response.json({ id: "resource" });
    }
    throw Error("Unexpected action");
  };
  try {
    const file = new File(["%PDF-1.7\nunit test"], "notes.pdf", {
      type: "application/pdf",
    });
    const job = uploadJob(
      {
        file,
        requestId: crypto.randomUUID(),
        metadata: { ...blank(), title: "Notes" },
      },
      25 * 1024 * 1024,
      (phase) => phases.push(phase),
    );
    for (let i = 0; i < 50 && !calls.includes("finalize"); i++)
      await new Promise((r) => setTimeout(r, 2));
    assert.deepEqual(calls, ["prepare", "finalize"]);
    assert.ok(
      !phases.includes("Saved to cloud"),
      "Must wait for server confirmation",
    );
    finish();
    await job.done;
    assert.equal(phases.at(-1), "Saved to cloud");
  } finally {
    globalThis.fetch = original;
    finish();
  }
});
test("unsupported content is rejected before reserving or sending bytes", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    throw Error("Unexpected network");
  };
  try {
    const operation = uploadJob(
      {
        file: new File(["<html>bad</html>"], "notes.pdf", {
          type: "application/pdf",
        }),
        metadata: { ...blank(), title: "Invalid" },
        requestId: crypto.randomUUID(),
      },
      25 * 1024 * 1024,
      () => {},
    );
    await assert.rejects(operation.done, /actual file contents/);
    assert.equal(count, 0);
  } finally {
    globalThis.fetch = original;
  }
});
test("cancel during local verification does not reserve or publish a resource", async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = async () => {
    count++;
    throw Error("Unexpected network");
  };
  try {
    const operation = uploadJob(
      {
        file: new File(["%PDF-1.7\nfixture"], "notes.pdf", {
          type: "application/pdf",
        }),
        metadata: { ...blank(), title: "Cancelled" },
        requestId: crypto.randomUUID(),
      },
      25 * 1024 * 1024,
      () => {},
    );
    const rejected = assert.rejects(operation.done, /cancelled/);
    await operation.cancel();
    await rejected;
    assert.equal(count, 0);
  } finally {
    globalThis.fetch = original;
  }
});
