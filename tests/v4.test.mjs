import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { lessons, arena } from "../src/data/lessons.ts";
import {
  advancedUnits,
  advancedLessons,
  finalQuestions,
} from "../src/v4/curriculum.ts";
import { advancedProjects } from "../src/v4/projects.mjs";
import {
  advancedResponse,
  advancedFixtures,
  validateRows,
  offlineAdapterSource,
} from "../src/v4/api.mjs";
import {
  createCounter,
  lookupCase,
  bindingCases,
  contextSource,
  contextTrace,
  parameterSource,
  parameterTrace,
  asyncSource,
  asyncTrace,
} from "../src/v4/models.mjs";
import {
  approvedURL,
  liveDocument,
  liveOrigins,
  offlineLiveResult,
} from "../src/v4/live.mjs";
import { readProgress } from "../src/utils/logic.mjs";
import { guardSource } from "../src/browser/native.mjs";
test("V4 retains every chapter 1–14 field and protected V2/V3 source", () => {
  const baseline = JSON.parse(
    fs.readFileSync("tests/v4-preservation.json", "utf8"),
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(lessons.slice(0, 14))),
    baseline.lessons,
  );
  for (const [path, hash] of Object.entries(baseline.hashes))
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path, "utf8").replaceAll("\r\n", "\n"))
        .digest("hex"),
      hash,
      path,
    );
  assert.deepEqual(
    lessons.map((l) => l.id),
    Array.from({ length: 19 }, (_, i) => i + 1),
  );
});
test("closure state is shared per factory and independent between factories", () => {
  const first = createCounter(),
    second = createCounter(10, 2);
  assert.deepEqual(
    [first.increment(), first.increment(), first.decrement()],
    [1, 2, 1],
  );
  assert.equal(second.increment(), 12);
  assert.equal(first.getValue(), 1);
  assert.equal(first.count, undefined);
  assert.throws(() => createCounter(NaN), TypeError);
});
test("every selected scope model has matching executable source and every reference parses", () => {
  for (const id of ["shadow", "outer", "global", "missing", "tdz"]) {
    const item = lookupCase(id),
      output = [];
    vm.runInNewContext(item.code, { console: { log: (v) => output.push(v) } });
    assert.equal(output.at(-1), item.result, id);
  }
  for (const unit of advancedUnits)
    assert.doesNotThrow(() => guardSource(unit.code), unit.id);
  for (const project of advancedProjects)
    assert.doesNotThrow(() => guardSource(project.code), project.id);
});
test("lexical lookup stops at shadowing/TDZ and does not use caller locals", () => {
  assert.equal(lookupCase("shadow").result, "Inner");
  assert.equal(lookupCase("outer").result, 2);
  assert.equal(lookupCase("global").result, 7);
  assert.equal(lookupCase("missing").result, "ReferenceError");
  assert.equal(lookupCase("tdz").result, "ReferenceError");
  const output = [];
  vm.runInNewContext(contextSource, {
    console: { log: (v) => output.push(v) },
  });
  assert.deepEqual(output, contextTrace.at(-1).output);
  assert.deepEqual(contextTrace[4].stack, ["script", "caller", "read"]);
  assert.equal(contextTrace[4].bindings.lookup, "read → script");
});
test("fixed this cases obey strict, ordinary, lexical, bound and class invocation semantics", () => {
  for (const item of bindingCases.filter((c) => c.verify)) {
    const result = item.verify();
    assert.equal(
      String(result),
      item.id === "standalone" ? "true" : item.expected,
      item.id,
    );
    const output = [];
    vm.runInNewContext(item.code, {
      console: { log: (v) => output.push(String(v)) },
    });
    assert.equal(output[0], String(result), item.id);
  }
});
test("authored async ordering agrees with actual microtasks, nested microtasks and timers", async () => {
  const output = [];
  vm.runInNewContext(asyncSource, {
    console: { log: (v) => output.push(v) },
    setTimeout,
    queueMicrotask,
  });
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(output, asyncTrace.at(-1).output);
});
test("parameter/return trace agrees with its exact JavaScript source", () => {
  const output = [];
  vm.runInNewContext(parameterSource, {
    console: { log: (v) => output.push(String(v)) },
  });
  assert.deepEqual(output, parameterTrace.at(-1).output);
  assert.deepEqual(parameterTrace[2].bindings, {
    n: 4,
    a: 4,
    b: 4,
    sum: "<uninitialized>",
  });
});
test("Promise adoption, recovery, return types, combinators and rejected inputs have explicit outcomes", async () => {
  let resolveInner;
  const inner = new Promise((r) => (resolveInner = r)),
    outer = Promise.resolve(inner);
  let fulfilled = false;
  outer.then(() => (fulfilled = true));
  await Promise.resolve();
  assert.equal(fulfilled, false);
  resolveInner(4);
  assert.equal(await outer, 4);
  assert.equal(
    await Promise.reject(Error("fail"))
      .catch(() => 8)
      .finally(() => {}),
    8,
  );
  assert.ok((async () => 42)() instanceof Promise);
  assert.deepEqual(
    await Promise.all([Promise.resolve(2), Promise.resolve(1)]),
    [2, 1],
  );
  assert.equal(
    (await Promise.allSettled([Promise.reject(Error()), 1]))[0].status,
    "rejected",
  );
  assert.equal(await Promise.any([Promise.reject(Error()), "ok"]), "ok");
  await assert.rejects(Promise.any([]), AggregateError);
});
test("extended offline API validates status, query/pagination, CRUD and per-run persistence", () => {
  const db = structuredClone(advancedFixtures);
  assert.equal(
    advancedResponse("/api/users?limit=2&page=2", {}, "success", db).body[0]
      .name,
    "Mira",
  );
  assert.equal(advancedResponse("/api/users?q=dev").body.length, 1);
  assert.equal(advancedResponse("/api/users/99").status, 404);
  assert.equal(
    advancedResponse("/api/users", { method: "POST", body: "invalid" }).status,
    400,
  );
  const made = advancedResponse(
    "/api/users",
    { method: "POST", body: '{"name":"Fictional"}' },
    "success",
    db,
  );
  assert.equal(made.status, 201);
  assert.equal(
    advancedResponse(
      "/api/users/" + made.body.id,
      { method: "PATCH", body: '{"role":"Tester"}' },
      "success",
      db,
    ).body.role,
    "Tester",
  );
  assert.equal(
    advancedResponse(
      "/api/users/" + made.body.id,
      { method: "DELETE" },
      "success",
      db,
    ).status,
    204,
  );
  assert.equal(advancedFixtures.users.length, 4);
  for (const [scenario, status] of Object.entries({
    bad: 400,
    unauthorized: 401,
    forbidden: 403,
    missing: 404,
    rate: 429,
    error: 500,
    unavailable: 503,
  }))
    assert.equal(advancedResponse("/api/users", {}, scenario).status, status);
  assert.throws(() => advancedResponse("https://example.com/"), TypeError);
  assert.throws(() => advancedResponse("/api/users", {}, "network"), TypeError);
  assert.equal(
    advancedResponse("/api/users", {}, "type").headers["content-type"],
    "text/html",
  );
  assert.deepEqual(advancedResponse("/api/users", {}, "empty").body, []);
});
test("schemas and text-like external data are retained as data, invalid records excluded", () => {
  assert.throws(() => validateRows({ error: "wrong type" }), TypeError);
  const rows = validateRows([
    null,
    { id: 1, name: "<script>plain data</script>" },
    { id: "2", name: "Invalid id" },
    { id: 3, title: "Movie" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "<script>plain data</script>");
});
test("exported offline adapter works on a learner origin, aborts and delegates unrelated requests", async () => {
  let delegated = false;
  const window = {
    fetch: async () => {
      delegated = true;
      return new Response("external placeholder");
    },
  };
  vm.runInNewContext(offlineAdapterSource(), {
    window,
    location: {
      href: "https://learner.example.test/project/index.html",
      origin: "https://learner.example.test",
    },
    URL,
    structuredClone,
    setTimeout,
    clearTimeout,
    Response,
    DOMException,
  });
  const response = await window.fetch("/api/users");
  assert.equal(response.status, 200);
  assert.equal((await response.json())[0].name, "Asha");
  const controller = new AbortController(),
    pending = window.fetch("/api/users", { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  await window.fetch("https://allowed-own-service.example.test/");
  assert.equal(delegated, true);
});
test("controlled live URLs reject arbitrary destinations and unsafe coordinates; CSP and credentials stay restricted", () => {
  for (const provider of ["users", "weather", "television"]) {
    const u = new URL(approvedURL(provider, "Kolkata"));
    assert.ok(liveOrigins.includes(u.origin));
    assert.equal(u.username, "");
    assert.equal(u.password, "");
  }
  assert.throws(() => approvedURL("https://evil.test", "x"));
  assert.throws(() =>
    approvedURL("weather", "x", { latitude: 999, longitude: 0 }),
  );
  const doc = liveDocument("testtoken");
  assert.ok(doc.includes("default-src 'none'"));
  assert.match(doc, /credentials\s*:\s*["']omit["']/);
  assert.ok(!doc.includes("allow-same-origin"));
  assert.ok(!doc.includes("eval("));
  assert.ok(offlineLiveResult("weather").credit.includes("fictional"));
});
test("V4 teaching and assessments use stable unique IDs and all eight projects have runnable references", () => {
  assert.equal(advancedLessons.length, 5);
  assert.equal(advancedProjects.length, 8);
  assert.ok(advancedUnits.length >= 23);
  const questions = [
    ...arena,
    ...lessons.flatMap((l) => [l.predict, ...l.quiz]),
    ...advancedUnits.flatMap((u) => u.questions),
    ...advancedProjects.map((p) => p.question),
    ...finalQuestions,
  ];
  assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
  for (const q of questions)
    assert.ok(q.answer >= 0 && q.answer < q.choices.length);
  for (const unit of advancedUnits) {
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
    assert.ok(unit.how.length >= 4);
  }
  for (const project of advancedProjects) {
    assert.ok(project.tests.length >= 4);
    assert.ok(project.requirements.length >= 4);
    assert.ok(project.code.length > 500);
  }
});
test("progress migration preserves old records, new chapters and V4 assessment evidence", () => {
  const old = {
    completed: [1, 9, 14],
    answers: { "14-a": true },
    current: 14,
    concepts: ["browser-tree"],
  };
  assert.deepEqual(readProgress(JSON.stringify(old)), old);
  const next = {
    ...old,
    completed: [...old.completed, 19],
    current: 19,
    answers: { ...old.answers, "v4-final-19-1": true },
    concepts: [...old.concepts, "v4-lexical"],
  };
  assert.deepEqual(readProgress(JSON.stringify(next)), next);
});
