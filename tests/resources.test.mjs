import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { lessons, arena } from "../src/data/lessons.ts";
import { zipSync, strToU8 } from "fflate";
import {
  fileInfo,
  validateBytes,
  sha256,
  metadata,
  MiB,
  HARD_LIMIT,
} from "../supabase/functions/_shared/validation.mjs";
import { publicConfig } from "../src/resources/config.mjs";
test("V5 preserves all nineteen chapter records, arena, progress, runners and classroom verifier", () => {
  const baseline = JSON.parse(
    fs.readFileSync("tests/v5-preservation.json", "utf8"),
  );
  const sha = (value) => createHash("sha256").update(value).digest("hex");
  assert.equal(sha(JSON.stringify(lessons)), baseline.lessons);
  assert.equal(sha(JSON.stringify(arena)), baseline.arena);
  for (const [file, expected] of Object.entries(baseline.hashes))
    assert.equal(
      sha(fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n")),
      expected,
      file,
    );
});
test("resource configuration rejects secret and service-role keys, unsafe origins and partial setup", () => {
  assert.equal(publicConfig({}), null);
  for (const key of [
    "sb_secret_private",
    "ey.invalid.token",
    "",
    "a." + btoa(JSON.stringify({ role: "service_role" })) + ".c",
  ])
    assert.equal(
      publicConfig({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: key,
      }),
      null,
    );
  for (const url of [
    "http://remote.example",
    "javascript:alert(1)",
    "https://user:pass@example.com",
    "https://example.com/path",
  ])
    assert.equal(
      publicConfig({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
      null,
    );
  assert.equal(
    publicConfig({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    }).url,
    "https://example.supabase.co",
  );
  assert.ok(
    publicConfig({
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY:
        "a." + btoa(JSON.stringify({ role: "anon" })) + ".c",
    }),
  );
});
test("classroom files enforce allowlist, size, readable filename and MIME consistency", () => {
  assert.equal(
    fileInfo("Notes.PDF", 1024, "application/pdf").mime,
    "application/pdf",
  );
  assert.equal(
    fileInfo("data.csv", 10, "application/vnd.ms-excel").mime,
    "text/csv",
  );
  for (const filename of [
    "run.exe",
    "page.html",
    "icon.svg",
    "evil.js",
    "macro.docm",
    "a/notes.pdf",
    "..\\notes.pdf",
    "bad\nname.pdf",
  ])
    assert.throws(() => fileInfo(filename, 10));
  for (const n of [0, -1, NaN, 25 * MiB + 1])
    assert.throws(() => fileInfo("a.pdf", n));
  assert.throws(() => fileInfo("a.pdf", 10, "image/png"));
  assert.equal(fileInfo("a.pdf", HARD_LIMIT, "", HARD_LIMIT).size, HARD_LIMIT);
  assert.throws(() => fileInfo("a.pdf", HARD_LIMIT + 1, "", 100 * MiB));
});
test("actual signatures reject renamed content and Office macro packages without extraction", () => {
  validateBytes(strToU8("%PDF-1.7\nfixture"), "pdf");
  assert.throws(() =>
    validateBytes(strToU8("<script>alert(1)</script>"), "pdf"),
  );
  for (const ext of ["docx", "pptx", "xlsx"]) {
    const folder = { docx: "word", pptx: "ppt", xlsx: "xl" }[ext];
    validateBytes(
      zipSync({
        "[Content_Types].xml": strToU8("<Types/>"),
        [folder + "/document.xml"]: strToU8("<doc/>"),
      }),
      ext,
    );
    assert.throws(() =>
      validateBytes(
        zipSync({
          "[Content_Types].xml": strToU8("<Types/>"),
          [folder + "/vbaProject.bin"]: new Uint8Array([1]),
        }),
        ext,
      ),
    );
    assert.throws(() =>
      validateBytes(zipSync({ "notes.txt": strToU8("hi") }), ext),
    );
  }
  validateBytes(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), "png");
  validateBytes(new Uint8Array([255, 216, 255, 224]), "jpg");
  validateBytes(strToU8("<script>text is displayed literally</script>"), "txt");
  assert.throws(() => validateBytes(new Uint8Array([0xff, 0xfe]), "txt"));
  assert.throws(() => validateBytes(strToU8("hello\0"), "csv"));
});
test("file checksum and metadata bounds are deterministic", async () => {
  assert.equal(
    await sha256(strToU8("abc")),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  const data = metadata({
    title: " Notes ",
    tags: [" a ", "a", "b"],
    chapter_id: "3",
    display_order: "2",
  });
  assert.deepEqual(data.tags, ["a", "b"]);
  assert.equal(data.title, "Notes");
  assert.equal(data.chapter_id, 3);
  for (const value of [
    { title: "" },
    { title: "a", chapter_id: -1 },
    { title: "a", tags: Array(13).fill("x") },
    { title: "a", status: "admin" },
    { title: "a", display_order: Infinity },
  ])
    assert.throws(() => metadata(value));
});
test("cloud feature keeps classroom code out of its authentication path and upload bytes out of browser persistence", () => {
  const source = [
    "client.ts",
    "TeacherResources.tsx",
    "Library.tsx",
    "components.tsx",
  ]
    .map((n) => fs.readFileSync("src/resources/" + n, "utf8"))
    .join("\n");
  assert.doesNotMatch(
    source,
    /teacherAccess|teacherVerifier|localStorage\.setItem|indexedDB\.open|service_role|sb_secret_/,
  );
  assert.match(source, /resource-api/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /showModal/);
  assert.match(source, /Saved to cloud/);
  const backend = fs.readFileSync(
    "supabase/functions/resource-api/index.ts",
    "utf8",
  );
  assert.match(backend, /validateBytes\(bytes/);
  assert.match(backend, /sha256\(bytes\)/);
  assert.match(backend, /actor\(req,\s*db\)/);
});
