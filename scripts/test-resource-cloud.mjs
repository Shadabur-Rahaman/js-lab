import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { Upload } from "tus-js-client";
import { zipSync, strToU8 } from "fflate";
import { sha256, formats } from "../supabase/functions/_shared/validation.mjs";
import { publicSettings, serverKey } from "./resource-cloud-tools.mjs";
const { url, key, ref } = publicSettings();
if (!process.argv.includes("--confirm-disposable-tests"))
  throw Error(
    "Pass --confirm-disposable-tests to create and clean up clearly named test accounts and files in the selected project.",
  );
const admin = createClient(url, serverKey(ref), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const visitor = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const report = {
  project: ref,
  started_at: new Date().toISOString(),
  checks: [],
  cleanup: null,
};
const users = [],
  resources = new Set(),
  objects = new Set();
const prefix = "js-lab-test-" + Date.now();
const clients = [];
async function test(name, run) {
  try {
    await run();
    report.checks.push({ name, pass: true });
    console.log("PASS " + name);
  } catch (error) {
    report.checks.push({
      name,
      pass: false,
      error: String(error.message)
        .replace(/https?:\/\/\S+/g, "[URL omitted]")
        .slice(0, 400),
    });
    console.log("FAIL " + name);
    throw Error("Integration check failed: " + name);
  }
}
async function checked(result) {
  const { data, error } = await result;
  if (error) throw Error(error.message);
  return data;
}
async function endpoint(action, body = {}, token) {
  const result = await fetch(url + "/functions/v1/resource-api", {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(60000),
  });
  const data = await result.json();
  return { status: result.status, data };
}
async function api(action, body = {}, token) {
  const result = await endpoint(action, body, token);
  if (result.status !== 200)
    throw Error(result.data.error || "API request failed");
  return result.data;
}
async function account(role) {
  const email = prefix + "-" + (role || "student") + "@example.invalid",
    password = crypto.randomUUID() + "!Aa9";
  const user = await checked(
    admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { resource_integration_test: prefix },
    }),
  );
  users.push(user.user.id);
  if (role)
    await checked(
      admin.from("authorized_teachers").insert({ user_id: user.user.id, role }),
    );
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const session = await checked(
    client.auth.signInWithPassword({ email, password }),
  );
  return { id: user.user.id, client, token: session.session.access_token };
}
function metadata(title, status = "draft") {
  return {
    title: prefix + " " + title,
    description: "Disposable JS LAB integration fixture",
    category_id: null,
    chapter_id: 3,
    lesson_id: "test-topic",
    tags: ["integration-test"],
    display_order: 0,
    status,
  };
}
async function prepare(
  teacher,
  name,
  bytes,
  meta = metadata(name),
  replacement,
) {
  const ext = name.split(".").at(-1);
  const body = {
    request_id: crypto.randomUUID(),
    original_filename: name,
    file_size: bytes.length,
    mime_type: formats[ext],
    sha256: await sha256(bytes),
    metadata: meta,
    ...(replacement
      ? { resource_id: replacement.id, version: replacement.version }
      : {}),
  };
  const reserved = await api("prepare", body, teacher.token);
  resources.add(reserved.resource_id);
  objects.add(reserved.storage_path);
  return { reserved, body };
}
async function transfer(teacher, reserved, bytes) {
  await new Promise((resolve, reject) => {
    new Upload(Buffer.from(bytes), {
      endpoint:
        url.replace(".supabase.co", ".storage.supabase.co") +
        "/storage/v1/upload/resumable",
      headers: {
        Authorization: "Bearer " + teacher.token,
        apikey: key,
        "x-upsert": "false",
      },
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      retryDelays: [0, 1000, 3000],
      metadata: {
        bucketName: "learning-resources",
        objectName: reserved.storage_path,
        contentType: reserved.mime_type,
        cacheControl: "60",
      },
      onError: () =>
        reject(
          Error(
            "Resumable transfer failed; no credentials or upload URLs were logged.",
          ),
        ),
      onSuccess: () => resolve(),
    }).start();
  });
}
async function upload(
  teacher,
  name,
  bytes,
  meta = metadata(name),
  replacement,
) {
  const { reserved, body } = await prepare(
    teacher,
    name,
    bytes,
    meta,
    replacement,
  );
  await transfer(teacher, reserved, bytes);
  const row = await api("finalize", { upload_id: reserved.id }, teacher.token);
  return { row, reserved, body };
}
async function publicRows() {
  return await checked(visitor.from("published_resources").select("*"));
}
const pdf = strToU8(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4X0AAAAASUVORK5CYII=",
    "base64",
  ),
);
const pptx = zipSync({
  "[Content_Types].xml": strToU8(
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>',
  ),
  "_rels/.rels": strToU8(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>',
  ),
  "ppt/presentation.xml": strToU8(
    '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst/><p:sldSz cx="9144000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>',
  ),
});
const docx = zipSync({
  "[Content_Types].xml": strToU8(
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  ),
  "_rels/.rels": strToU8(
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  ),
  "word/document.xml": strToU8(
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>JS LAB integration test</w:t></w:r></w:p></w:body></w:document>',
  ),
});
let failed = false;
try {
  let teacher, student, other, pdfUpload;
  await test("authorized test account signs in; ordinary account is denied", async () => {
    teacher = await account("admin");
    student = await account(null);
    other = await account("teacher");
    assert.equal((await api("profile", {}, teacher.token)).role, "admin");
    assert.equal((await endpoint("profile", {}, student.token)).status, 403);
    assert.equal((await endpoint("prepare", {}, undefined)).status, 401);
  });
  await test("email sign-in stays enabled while public registration is blocked", async () => {
    const settings = await (
      await fetch(url + "/auth/v1/settings", { headers: { apikey: key } })
    ).json();
    assert.equal(settings.external.email, true);
    assert.equal(settings.disable_signup, true);
    const result = await visitor.auth.signUp({
      email: prefix + "-forbidden@example.invalid",
      password: crypto.randomUUID() + "!Aa9",
    });
    if (result.data.user) users.push(result.data.user.id);
    assert.ok(result.error);
    assert.equal(result.data.user, null);
  });
  await test("anonymous and ordinary users cannot self-promote or call privileged RPCs", async () => {
    assert.ok(
      (
        await visitor
          .from("authorized_teachers")
          .insert({ user_id: student.id, role: "admin" })
      ).error,
    );
    assert.ok(
      (
        await student.client
          .from("authorized_teachers")
          .insert({ user_id: student.id, role: "admin" })
      ).error,
    );
    assert.ok(
      (
        await visitor.rpc("resource_command", {
          actor: teacher.id,
          command: "settings",
          body: { max_file_size: 1 },
        })
      ).error,
    );
    assert.ok(
      (
        await visitor
          .from("learning_resources")
          .insert({ title: "forged", uploaded_by: student.id })
      ).error,
    );
  });
  await test("PDF resumable upload persists as a private draft", async () => {
    pdfUpload = await upload(teacher, "Test notes.pdf", pdf);
    assert.equal(pdfUpload.row.status, "draft");
    assert.ok(!(await publicRows()).some((r) => r.id === pdfUpload.row.id));
    assert.equal(
      (await endpoint("link", { id: pdfUpload.row.id })).status,
      404,
    );
    assert.ok(
      (
        await visitor.storage
          .from("learning-resources")
          .download(pdfUpload.reserved.storage_path)
      ).error,
    );
    assert.ok(
      (
        await student.client.storage
          .from("learning-resources")
          .createSignedUrl(pdfUpload.reserved.storage_path, 60)
      ).error,
    );
  });
  await test("private storage rejects unreserved teacher uploads and student uploads", async () => {
    assert.ok(
      (
        await teacher.client.storage
          .from("learning-resources")
          .upload("unreserved-test.pdf", pdf, {
            contentType: "application/pdf",
          })
      ).error,
    );
    assert.ok(
      (
        await student.client.storage
          .from("learning-resources")
          .upload("unreserved-student.pdf", pdf, {
            contentType: "application/pdf",
          })
      ).error,
    );
  });
  await test("metadata edit publishes with category, chapter and searchable topic", async () => {
    const categories = await checked(
      visitor.from("resource_categories").select("id").limit(1),
    );
    pdfUpload.row = await api(
      "edit",
      {
        id: pdfUpload.row.id,
        version: pdfUpload.row.version,
        metadata: {
          ...metadata("Renamed notes", "published"),
          category_id: categories[0].id,
        },
      },
      teacher.token,
    );
    const row = (await publicRows()).find((r) => r.id === pdfUpload.row.id);
    assert.ok(row);
    assert.equal(row.chapter_id, 3);
    assert.equal(row.lesson_id, "test-topic");
  });
  await test("published download returns original PDF bytes and readable filename", async () => {
    const signed = await api("link", { id: pdfUpload.row.id });
    const response = await fetch(signed.url);
    assert.equal(response.status, 200);
    assert.match(
      response.headers.get("content-disposition") || "",
      /Test.*notes\.pdf/i,
    );
    assert.equal(
      await sha256(new Uint8Array(await response.arrayBuffer())),
      await sha256(pdf),
    );
  });
  await test("fresh client reload retrieves persistent cloud metadata", async () => {
    const reloaded = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const data = await checked(
      reloaded
        .from("published_resources")
        .select("*")
        .eq("id", pdfUpload.row.id)
        .single(),
    );
    assert.equal(data.title, pdfUpload.row.title);
  });
  await test("PPTX, PNG and DOCX uploads finish independently and retain original bytes", async () => {
    for (const [name, bytes] of [
      ["Test slides.pptx", pptx],
      ["Test image.png", png],
      ["Test worksheet.docx", docx],
    ]) {
      const item = await upload(
        teacher,
        name,
        bytes,
        metadata(name, "published"),
      );
      const { url: signed } = await api("link", { id: item.row.id });
      const response = await fetch(signed);
      assert.equal(response.status, 200);
      assert.equal(
        await sha256(new Uint8Array(await response.arrayBuffer())),
        await sha256(bytes),
      );
    }
  });
  await test("oversize and unsupported inputs are rejected without publication", async () => {
    const valid = {
      request_id: crypto.randomUUID(),
      original_filename: "Too large.pdf",
      file_size: 26 * 1024 * 1024,
      mime_type: "application/pdf",
      sha256: await sha256(pdf),
      metadata: metadata("Rejected", "published"),
    };
    assert.notEqual(
      (await endpoint("prepare", valid, teacher.token)).status,
      200,
    );
    assert.notEqual(
      (
        await endpoint(
          "prepare",
          {
            ...valid,
            file_size: 10,
            original_filename: "script.html",
            mime_type: "text/html",
          },
          teacher.token,
        )
      ).status,
      200,
    );
  });
  await test("actual invalid file bytes fail server verification and remain unpublished", async () => {
    const invalid = strToU8("This is not a PDF.");
    const { reserved } = await prepare(
      teacher,
      "Invalid contents.pdf",
      invalid,
      metadata("Invalid bytes", "published"),
    );
    await transfer(teacher, reserved, invalid);
    assert.notEqual(
      (await endpoint("finalize", { upload_id: reserved.id }, teacher.token))
        .status,
      200,
    );
    assert.ok(!(await publicRows()).some((r) => r.id === reserved.resource_id));
    await api("cancel", { upload_id: reserved.id }, teacher.token);
  });
  await test("second teacher cannot edit another teacher’s resource; stale revisions reject", async () => {
    const data = {
      id: pdfUpload.row.id,
      version: pdfUpload.row.version,
      metadata: metadata("Unauthorized change"),
    };
    assert.notEqual((await endpoint("edit", data, other.token)).status, 200);
    assert.notEqual(
      (await endpoint("edit", { ...data, version: 0 }, teacher.token)).status,
      200,
    );
  });
  await test("replacement retains resource ID, changes object path and returns new bytes", async () => {
    const replacement = strToU8(
      "%PDF-1.4\nReplacement integration fixture\n%%EOF",
    );
    const item = await upload(
      teacher,
      "Replacement notes.pdf",
      replacement,
      metadata("Replacement", "published"),
      pdfUpload.row,
    );
    assert.equal(item.row.id, pdfUpload.row.id);
    assert.notEqual(
      item.reserved.storage_path,
      pdfUpload.reserved.storage_path,
    );
    pdfUpload = item;
    const signed = await api("link", { id: item.row.id });
    assert.equal(
      await sha256(
        new Uint8Array(await (await fetch(signed.url)).arrayBuffer()),
      ),
      await sha256(replacement),
    );
  });
  await test("idempotent upload retry returns the same saved reservation", async () => {
    const retry = await api("prepare", pdfUpload.body, teacher.token);
    assert.equal(retry.id, pdfUpload.reserved.id);
    assert.equal(retry.state, "ready");
    assert.equal(retry.object_exists, true);
  });
  await test("7 MB multi-chunk resumable upload passes full server checksum verification", async () => {
    const bytes = new Uint8Array(7 * 1024 * 1024);
    bytes.fill(32);
    bytes.set(pdf);
    await upload(teacher, "Large notes.pdf", bytes);
  });
  await test("unpublish denies new public links; trash hides records; restore stays private", async () => {
    const edit = async (status) => {
      pdfUpload.row = await api(
        "edit",
        {
          id: pdfUpload.row.id,
          version: pdfUpload.row.version,
          metadata: metadata("Lifecycle", status),
        },
        teacher.token,
      );
    };
    await edit("draft");
    assert.equal(
      (await endpoint("link", { id: pdfUpload.row.id })).status,
      404,
    );
    await edit("deleted");
    assert.ok(!(await publicRows()).some((r) => r.id === pdfUpload.row.id));
    await edit("draft");
    assert.equal(pdfUpload.row.status, "draft");
    assert.equal(
      (await endpoint("link", { id: pdfUpload.row.id })).status,
      404,
    );
  });
  await test("admin manifest and audit records reflect persisted operations", async () => {
    const manifest = await api("manifest", {}, teacher.token);
    assert.ok(manifest.resources.some((r) => r.id === pdfUpload.row.id));
    const audit = await checked(
      admin.from("resource_audit_log").select("id").eq("actor", teacher.id),
    );
    assert.ok(audit.length >= 10);
    assert.equal((await endpoint("manifest", {}, other.token)).status, 403);
  });
} catch {
  failed = true;
} finally {
  const cleanupErrors = [];
  for (const client of clients) await client.auth.signOut().catch(() => {});
  if (objects.size) {
    const { error } = await admin.storage
      .from("learning-resources")
      .remove([...objects]);
    if (error) cleanupErrors.push("Test object cleanup failed");
  }
  for (const id of resources) {
    for (const op of [
      () =>
        admin
          .from("learning_resources")
          .update({
            status: "deleted",
            current_version_id: null,
            storage_path: null,
          })
          .eq("id", id),
      () => admin.from("resource_versions").delete().eq("resource_id", id),
      () => admin.from("learning_resources").delete().eq("id", id),
    ]) {
      const { error } = await op();
      if (error) cleanupErrors.push("Test metadata cleanup failed");
    }
  }
  for (const id of users) {
    await admin.from("authorized_teachers").delete().eq("user_id", id);
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) cleanupErrors.push("Test account cleanup failed");
  }
  report.cleanup = {
    created_test_accounts: users.length,
    created_resource_records: resources.size,
    created_objects: objects.size,
    errors: cleanupErrors,
  };
  report.finished_at = new Date().toISOString();
  await fs.mkdir(".deployment", { recursive: true });
  await fs.writeFile(
    ".deployment/resource-cloud-test-report.json",
    JSON.stringify(report, null, 2),
  );
  console.log(
    `${report.checks.filter((c) => c.pass).length} cloud checks passed; ${report.checks.filter((c) => !c.pass).length} failed. Cleanup errors: ${cleanupErrors.length}.`,
  );
  if (failed || cleanupErrors.length) process.exitCode = 1;
}
