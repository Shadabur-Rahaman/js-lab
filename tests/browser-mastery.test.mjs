import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { guardSource } from "../src/browser/native.mjs";
import {
  CookieModel,
  newStorageModel,
  storageArea,
  reloadModel,
  closeTabModel,
} from "../src/browser/storage.mjs";
import { lessons } from "../src/data/lessons.ts";
import { browserUnits } from "../src/browser/curriculum.ts";
import { browserProjects } from "../src/browser/projects.mjs";
import { readProgress } from "../src/utils/logic.mjs";
test("original nine chapter registry stays byte-equivalent after removing additive registration", () => {
  const before = JSON.parse(
    fs.readFileSync("tests/browser-original-source.json", "utf8"),
  ).sha256;
  const after = fs
    .readFileSync("src/data/lessons.ts", "utf8")
    .replaceAll("\r\n", "\n")
    .replace("import { browserLessons } from './browserLessons.ts';\n", "")
    .replace("\nlessons.push(...browserLessons);", "");
  assert.equal(createHash("sha256").update(after).digest("hex"), before);
  assert.deepEqual(
    lessons.map((l) => l.id),
    Array.from({ length: 14 }, (_, i) => i + 1),
  );
});
test("new chapters have unique assessment IDs, native examples and complete teaching fields", () => {
  const ids = [];
  assert.equal(browserProjects.length, 8);
  assert.equal(browserUnits.length, 22);
  for (const unit of browserUnits) {
    for (const field of [
      "why",
      "what",
      "analogy",
      "code",
      "broken",
      "hint",
      "task",
      "recap",
    ])
      assert.ok(unit[field].length > 20, unit.id + " " + field);
    assert.ok(unit.how.length >= 3);
    for (const q of unit.questions) {
      ids.push(q.id);
      assert.ok(q.answer >= 0 && q.answer < q.choices.length);
    }
  }
  for (const p of browserProjects) {
    assert.ok(p.requirements.length >= 3);
    ids.push(p.question.id);
  }
  assert.equal(new Set(ids).size, ids.length);
});
test("loop instrumentation preserves strict directives, loop bodies, recursion and normal results", () => {
  let calls = 0;
  const context = {
    guard() {
      if (++calls > 40) throw new RangeError("budget");
    },
  };
  for (const source of [
    "while(true);",
    "for(;;){}",
    "do{}while(true);",
    "function f(){return f()}f();",
  ]) {
    calls = 0;
    assert.throws(
      () => vm.runInNewContext(guardSource(source, "guard"), context),
      RangeError,
    );
  }
  calls = 0;
  assert.equal(
    vm.runInNewContext(
      guardSource(
        '(function(){"use strict";return this===undefined})()',
        "guard",
      ),
      context,
    ),
    true,
  );
  assert.equal(
    vm.runInNewContext(
      guardSource("let sum=0;for(let i=0;i<3;i++)sum+=i;sum", "guard"),
      { guard() {} },
    ),
    3,
  );
});
test("cookie model covers paths, host/domain, expiry precedence, transport and SameSite", () => {
  const jar = new CookieModel(),
    url = "https://learn.example.test/course/page";
  jar.set(
    "a=1; Path=/course; Max-Age=60; Expires=Wed, 01 Jan 2020 00:00:00 GMT; Secure; SameSite=Lax",
    url,
  );
  assert.equal(jar.visible(url), "a=1");
  assert.equal(jar.visible("https://learn.example.test/courses"), "");
  assert.equal(jar.visible("http://learn.example.test/course"), "");
  assert.equal(jar.request(url, { crossSite: true, method: "POST" }), "");
  assert.equal(jar.request(url, { crossSite: true, method: "GET" }), "a=1");
  jar.set(
    "shared=yes; Domain=example.test; Path=/; Secure; SameSite=None",
    url,
  );
  assert.equal(jar.visible("https://other.example.test/"), "shared=yes");
  jar.advance(61);
  assert.equal(jar.visible(url), "shared=yes");
  jar.set("shared=; Domain=example.test; Path=/; Max-Age=0", url);
  assert.equal(jar.visible(url), "");
  assert.throws(() => jar.set("x=y; Domain=attacker.test", url));
  assert.throws(() => jar.set("x=y; SameSite=None", url));
});
test("script cannot model-set HttpOnly; HTTP-set cookies are request-only and session cleanup is explicit", () => {
  const jar = new CookieModel(),
    url = "https://learn.example.test/";
  assert.throws(() => jar.set("session=x; HttpOnly", url));
  jar.set("session=x; HttpOnly; Secure; Path=/", url, true);
  assert.equal(jar.visible(url), "");
  assert.equal(jar.request(url), "session=x");
  jar.endSession();
  assert.equal(jar.request(url), "");
});
test("storage model separates origin and tab scopes; reload and tab close preserve appropriate state", () => {
  const model = newStorageModel();
  storageArea(model, "memory").x = "m";
  storageArea(model, "local").x = "l";
  storageArea(model, "session").x = "s";
  reloadModel(model);
  assert.equal(storageArea(model, "memory").x, undefined);
  assert.equal(storageArea(model, "session").x, "s");
  model.tab = "B";
  assert.equal(storageArea(model, "session").x, undefined);
  assert.equal(storageArea(model, "local").x, "l");
  model.tab = "A";
  closeTabModel(model);
  assert.equal(storageArea(model, "session").x, undefined);
  model.origin = "https://other.example.test";
  assert.equal(storageArea(model, "local").x, undefined);
});
test("legacy and new chapter progress round-trip additively", () => {
  const old = {
    completed: [1, 9],
    answers: { "1-a": true },
    current: 9,
    concepts: ["closure"],
  };
  assert.deepEqual(readProgress(JSON.stringify(old)), old);
  assert.deepEqual(
    readProgress(JSON.stringify({ ...old, completed: [1, 9, 14], current: 14 }))
      .completed,
    [1, 9, 14],
  );
});
