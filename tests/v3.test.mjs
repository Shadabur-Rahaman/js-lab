import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { DOMParser } from "linkedom";
import { zipSync, strToU8 } from "fflate";
import {
  compileProject,
  pathName,
  resolveFile,
  validateProject,
  zipProject,
  unzipProject,
} from "../src/v3/files.mjs";
import { fixtures, mockResponse } from "../src/v3/mock.mjs";
import { challenges, bugPrograms } from "../src/v3/challenges.mjs";
import { applicationProjects } from "../src/v3/projects.mjs";
import { languageUnits } from "../src/v3/language.mjs";
import { defaultFiles } from "../src/v3/examples.mjs";
import { readAcademy, mergeAcademy } from "../src/v3/progress.mjs";
import { readProgress } from "../src/utils/logic.mjs";
globalThis.DOMParser = DOMParser;
test("V2 curriculum, original runner, teacher verifier and styles remain byte-equivalent", () => {
  for (const file of [
    "src/data/lessons.ts",
    "src/data/newLessons.ts",
    "src/data/concepts.ts",
    "src/data/controlConcepts.ts",
    "src/data/advancedConcepts.ts",
    "src/data/appliedProjects.ts",
    "src/utils/sandbox.ts",
    "src/config/teacher.ts",
    "src/styles.css",
  ]) {
    const baseline = JSON.parse(
      fs.readFileSync("tests/v3-preservation.json", "utf8"),
    );
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(file, "utf8").replaceAll("\r\n", "\n"))
        .digest("hex"),
      baseline.hashes[file],
      file,
    );
  }
});
test("V3 progress defaults and merging do not overwrite original progress", () => {
  const legacy = {
    completed: [1, 9],
    answers: { x: true },
    current: 8,
    concepts: ["closure"],
  };
  assert.deepEqual(readProgress(JSON.stringify(legacy)), legacy);
  assert.deepEqual(readAcademy("bad"), {
    completed: [],
    current: "zero",
    attempts: {},
  });
  const a = readAcademy(
      '{"completed":["a"],"attempts":{"a":2},"current":"dom"}',
    ),
    b = readAcademy('{"completed":["b",4],"attempts":{"a":1,"b":3}}');
  assert.deepEqual(mergeAcademy(a, b), {
    completed: ["a", "b"],
    current: "dom",
    attempts: { a: 2, b: 3 },
  });
});
test("all 24 function challenge reference solutions satisfy ordinary and edge cases", () => {
  assert.equal(challenges.length, 24);
  for (const c of challenges) {
    for (const [input, expected, error] of c.cases) {
      const ctx = vm.createContext({});
      ctx.input = structuredClone(input);
      const before = JSON.stringify(ctx.input);
      if (error)
        assert.throws(
          () =>
            vm.runInContext(c.solution + ";solve(input)", ctx, {
              timeout: 100,
            }),
          { name: error },
        );
      else {
        const actual = vm.runInContext(c.solution + ";solve(input)", ctx, {
          timeout: 100,
        });
        assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, c.id);
        if (["sort", "state"].includes(c.id))
          assert.equal(JSON.stringify(ctx.input), before);
      }
    }
  }
});
test("all seven debugging references repair their published cases", () => {
  for (const [title, , , solution, cases] of bugPrograms)
    for (const [input, expected] of cases) {
      const ctx = vm.createContext({ input: structuredClone(input) });
      assert.deepEqual(
        JSON.parse(
          JSON.stringify(
            vm.runInContext(solution + ";solve(input)", ctx, { timeout: 100 }),
          ),
        ),
        expected,
        title,
      );
    }
});
test("additional language examples and repair references execute successfully", () => {
  for (const u of languageUnits)
    for (const code of [u.code, u.solution])
      vm.runInNewContext(
        "(function(){" + code + "})()",
        { console: { log() {} }, JSON, Date, Map, Set },
        { timeout: 200 },
      );
});
test("mock API distinguishes HTTP errors, network failures, empty data and pagination", () => {
  assert.equal(mockResponse("/api/students").status, 200);
  assert.equal(mockResponse("/api/nope").status, 404);
  assert.equal(mockResponse("/api/products", {}, "error").status, 500);
  assert.equal(mockResponse("/api/products", {}, "rate").status, 429);
  assert.deepEqual(mockResponse("/api/students", {}, "empty").body, []);
  assert.throws(() => mockResponse("/api/students", {}, "network"), TypeError);
  assert.throws(
    () => mockResponse("https://example.com/api/students"),
    TypeError,
  );
  assert.equal(mockResponse("/api/users?page=2&limit=2").body[0].name, "Mira");
  assert.equal(mockResponse("/api/products?q=lamp").body.length, 1);
});
test("mock mutation stays in its own explicit database and handles malformed JSON", () => {
  const db = structuredClone(fixtures);
  const p = mockResponse(
    "/api/tasks",
    { method: "POST", body: '{"title":"Test"}' },
    "success",
    db,
  );
  assert.equal(p.status, 201);
  assert.equal(db.tasks.length, 3);
  assert.equal(fixtures.tasks.length, 2);
  assert.equal(
    mockResponse(
      "/api/tasks/3",
      { method: "PATCH", body: '{"done":true}' },
      "success",
      db,
    ).body.done,
    true,
  );
  assert.equal(
    mockResponse("/api/tasks/3", { method: "DELETE" }, "success", db).status,
    204,
  );
  assert.equal(
    mockResponse("/api/tasks", { method: "POST", body: "bad" }, "success", db)
      .status,
    400,
  );
});
test("ZIP round trip preserves all required source; unsafe and oversized imports reject", () => {
  assert.deepEqual({ ...unzipProject(zipProject(defaultFiles)) }, defaultFiles);
  for (const p of [
    "../bad.js",
    "/bad.js",
    "x/../../y.js",
    "x\\y.js",
    ".git/config",
    "a//b.js",
  ])
    assert.throws(() => pathName(p));
  assert.throws(() => unzipProject(zipSync({ "../bad.js": strToU8("x") })));
  assert.throws(() =>
    unzipProject(
      zipSync({ "index.html": strToU8("x"), "bad.exe": strToU8("x") }),
    ),
  );
  assert.throws(() => unzipProject(new Uint8Array(1000001)));
  assert.throws(() => unzipProject(zipProject(defaultFiles).slice(0, -30)));
  assert.throws(() => validateProject({ "x.js": "x".repeat(80001) }));
  assert.equal(resolveFile("js/app.js", "./utils/math.js"), "js/utils/math.js");
  assert.equal(
    resolveFile("pages/start.html", "../css/style.css"),
    "css/style.css",
  );
});
test("native module graphs resolve named/default/re-exports and reject missing, external, cyclic or dynamic imports", () => {
  const result = compileProject(defaultFiles);
  assert.ok(result.code.includes("data:text/javascript"));
  assert.ok(result.css.includes("system-ui"));
  assert.ok(!result.html.includes("<script"));
  for (const source of [
    'import x from "package";',
    'import x from "./missing.js";',
    'import("./logic.js");',
  ])
    assert.throws(() =>
      compileProject({ ...defaultFiles, "js/app.js": source }),
    );
  assert.throws(() =>
    compileProject({ ...defaultFiles, "js/logic.js": 'import "./app.js";' }),
  );
  assert.doesNotThrow(() =>
    compileProject({
      ...defaultFiles,
      "js/app.js":
        'import add, {increment} from "./logic.js"; console.log(add(1),increment(2));',
    }),
  );
});
test("13 application references compile and retain distinct requirements, tests and downloadable files", () => {
  assert.equal(applicationProjects.length, 13);
  for (const p of applicationProjects) {
    assert.ok(p.requirements.length >= 3, p.id);
    assert.ok(p.tests.length >= 3, p.id);
    assert.doesNotThrow(() => compileProject(p.files), p.id);
    assert.deepEqual({ ...unzipProject(zipProject(p.files)) }, p.files);
  }
});
test("new execution and preview policies retain opaque origins, CSP, message identity and termination", () => {
  const runtime = fs.readFileSync("src/v3/runtime.ts", "utf8"),
    worker = fs.readFileSync("src/v3/worker.mjs", "utf8");
  assert.doesNotMatch(
    runtime,
    /sandbox[^;\n]*(?:add|=)[^;\n]*allow-same-origin/,
  );
  for (const rule of [
    "connect-src 'none'",
    "form-action 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
  ])
    assert.ok(runtime.includes(rule));
  assert.match(runtime, /e\.source\s*!==\s*frame\.contentWindow/);
  assert.match(runtime, /e\.data\?\.token\s*!==\s*token/);
  assert.ok(runtime.includes("worker.terminate()"));
  assert.match(worker, /["']indexedDB["']/);
  assert.ok(worker.includes("mockResponse"));
  assert.ok(worker.includes("600"));
});
