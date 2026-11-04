import test from "node:test";
import assert from "node:assert/strict";
import { pdfBytes, pdfViewport } from "../src/resources/pdf.mjs";
const pdf = new TextEncoder().encode("%PDF-1.7\nfixture");
test("PDF preview reads bytes once with same-origin cookies only and no browser persistence", async () => {
  let calls = 0;
  const data = await pdfBytes(
    async () => "/private.pdf",
    pdf.length,
    new AbortController().signal,
    async (_url, options) => {
      calls++;
      assert.equal(options.credentials, "same-origin");
      assert.equal(options.cache, "no-store");
      return new Response(pdf);
    },
  );
  assert.deepEqual(data, pdf);
  assert.equal(calls, 1);
});
test("expired PDF links regenerate once before loading and do not retry forever", async () => {
  let links = 0,
    requests = 0;
  const data = await pdfBytes(
    async () => "/link-" + ++links,
    pdf.length,
    undefined,
    async () =>
      ++requests === 1 ? new Response("", { status: 403 }) : new Response(pdf),
  );
  assert.equal(links, 2);
  assert.deepEqual(data, pdf);
  let attempts = 0;
  await assert.rejects(
    pdfBytes(
      async () => "/expired",
      0,
      undefined,
      async () => {
        attempts++;
        return new Response("", { status: 403 });
      },
    ),
    /could not be loaded/,
  );
  assert.equal(attempts, 2);
});
test("PDF preview rejects missing, invalid and incomplete bytes and provider errors", async () => {
  for (const value of [
    new Uint8Array(),
    new TextEncoder().encode("<html>not a PDF</html>"),
  ])
    await assert.rejects(
      pdfBytes(
        async () => "/file",
        0,
        undefined,
        async () => new Response(value),
      ),
    );
  await assert.rejects(
    pdfBytes(
      async () => "/file",
      pdf.length + 1,
      undefined,
      async () => new Response(pdf),
    ),
    /incomplete/,
  );
  await assert.rejects(
    pdfBytes(
      async () => "/file",
      0,
      undefined,
      async () => new Response("missing", { status: 404 }),
    ),
    /could not be loaded/,
  );
  await assert.rejects(
    pdfBytes(
      async () => "/file",
      0,
      undefined,
      async () =>
        new Response(pdf, {
          headers: { "content-length": String(51 * 1024 * 1024) },
        }),
    ),
    /size limit/,
  );
});
test("PDF fetch cancellation propagates instead of continuing after close", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    pdfBytes(
      async () => "/file",
      0,
      controller.signal,
      async (_url, { signal }) => {
        signal.throwIfAborted();
        return new Response(pdf);
      },
    ),
    { name: "AbortError" },
  );
});
test("PDF fitting supports page sizes, mobile widths, zoom and bounded canvas memory", () => {
  const fit = pdfViewport(612, 792, 600, 1, 2),
    zoom = pdfViewport(612, 792, 600, 1.5, 2),
    phone = pdfViewport(612, 792, 320, 1, 3);
  assert.equal(Math.round(fit.cssWidth), 576);
  assert.ok(zoom.cssWidth > fit.cssWidth);
  assert.ok(phone.cssWidth <= 320);
  for (const dimensions of [
    [612, 792, 4000, 3, 4],
    [100000, 200000, 3000, 3, 4],
    [612, 792, 320, 1, 2],
  ]) {
    const result = pdfViewport(...dimensions);
    assert.ok(result.pixelWidth * result.pixelHeight <= 8_000_000);
    assert.ok(result.cssWidth <= 10000);
    assert.ok(result.cssHeight <= 20000);
  }
  assert.throws(() => pdfViewport(Infinity, 792, 320, 1));
  assert.throws(() => pdfViewport(0, 792, 320, 1));
});
