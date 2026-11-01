import { useEffect, useRef, useState } from "react";
import {
  AnnotationMode,
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { link, type Resource } from "./client";
import { pdfBytes, pdfViewport } from "./pdf.mjs";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({
  resource,
  attempt,
}: {
  resource: Resource;
  attempt: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    surface = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(600),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Loading PDF…"),
    [rendered, setRendered] = useState(false);
  const [accessibleText, setAccessibleText] = useState("");
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let task: ReturnType<typeof getDocument> | undefined;
    setPdf(null);
    setPage(1);
    setError("");
    setStatus("Loading PDF…");
    setRendered(false);
    setAccessibleText("");
    void (async () => {
      try {
        const data = await pdfBytes(
          () => link(resource, true),
          resource.file_size,
          controller.signal,
        );
        if (!active) return;
        const assets = new URL("./pdf-assets/", document.baseURI).href;
        // Canvas-only rendering: no scripting manager, HTML forms, links, XFA or
        // annotation actions are instantiated. PDF content is never app HTML.
        task = getDocument({
          data,
          cMapUrl: assets + "cmaps/",
          cMapPacked: true,
          standardFontDataUrl: assets + "standard_fonts/",
          wasmUrl: assets + "wasm/",
          enableXfa: false,
          maxImageSize: 32_000_000,
          canvasMaxAreaInBytes: 32 * 1024 * 1024,
        });
        const loaded = await task.promise;
        if (active) {
          setPdf(loaded);
          setStatus("Rendering PDF…");
        }
      } catch (e) {
        if (active) {
          setError(
            (e as Error).name === "PasswordException"
              ? "This PDF is password-protected. Download it to open with its password."
              : (e as Error).message ||
                  "PDF preview failed. Retry or download the original.",
          );
          setStatus("");
        }
      }
    })();
    return () => {
      active = false;
      controller.abort();
      void task?.destroy().catch(() => {});
    };
  }, [resource.id, resource.version, attempt]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(100, Math.floor(entries[0].contentRect.width))),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf) return;
    let active = true,
      render: RenderTask | undefined;
    // A fresh canvas per render avoids overlapping PDF.js render tasks when a
    // user rapidly changes page/zoom or resizes the dialog.
    const target = document.createElement("canvas");
    target.setAttribute("role", "img");
    target.setAttribute(
      "aria-label",
      `${resource.title}, PDF page ${page} of ${pdf.numPages}`,
    );
    if (!surface.current) return;
    setError("");
    setRendered(false);
    setStatus(`Rendering page ${page}…`);
    setAccessibleText("");
    void (async () => {
      try {
        const pdfPage = await pdf.getPage(page);
        if (!active) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const bounds = pdfViewport(
          base.width,
          base.height,
          width,
          zoom,
          window.devicePixelRatio || 1,
        );
        const viewport = pdfPage.getViewport({ scale: bounds.scale });
        target.width = bounds.pixelWidth;
        target.height = bounds.pixelHeight;
        target.style.width = bounds.cssWidth + "px";
        target.style.height = bounds.cssHeight + "px";
        render = pdfPage.render({
          canvas: target,
          viewport,
          transform: [bounds.outputScale, 0, 0, bounds.outputScale, 0, 0],
          annotationMode: AnnotationMode.DISABLE,
          background: "#ffffff",
        });
        await render.promise;
        if (active) {
          surface.current?.replaceChildren(target);
          setRendered(true);
          setStatus(`Page ${page} of ${pdf.numPages}`);
        }
        try {
          const text = await pdfPage.getTextContent();
          if (active) setAccessibleText(text.items.map((item) => ("str" in item ? item.str : "")).join(" "));
        } catch { /* A missing text layer must not hide a successfully drawn page. */ }
      } catch (e) {
        if (active && (e as Error).name !== "RenderingCancelledException") {
          setError(
            "This PDF page could not be rendered. Retry preview or download the original.",
          );
          setStatus("");
        }
      }
    })();
    return () => {
      active = false;
      render?.cancel();
    };
  }, [pdf, page, zoom, width, resource.title]);
  return (
    <section className="resource-pdf" aria-label="PDF document viewer">
      <div className="resource-actions resource-pdf-controls">
        <button
          className="button secondary"
          disabled={!pdf || page === 1}
          onClick={() => setPage((n) => n - 1)}
        >
          Previous page
        </button>
        <span aria-live="polite">
          {pdf ? `Page ${page} of ${pdf.numPages}` : "PDF preview"}
        </span>
        <button
          className="button secondary"
          disabled={!pdf || page === pdf.numPages}
          onClick={() => setPage((n) => n + 1)}
        >
          Next page
        </button>
        <button
          className="button secondary"
          disabled={!pdf || zoom <= 0.5}
          onClick={() => setZoom((n) => Math.max(0.5, n - 0.25))}
          aria-label="Zoom out PDF"
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          className="button secondary"
          disabled={!pdf || zoom >= 3}
          onClick={() => setZoom((n) => Math.min(3, n + 0.25))}
          aria-label="Zoom in PDF"
        >
          +
        </button>
        <button
          className="button secondary"
          disabled={!pdf}
          onClick={() => setZoom(1)}
        >
          Fit to width
        </button>
        <button
          className="button secondary"
          onClick={async () => { try { const target=container.current?.parentElement;if(!target?.requestFullscreen)throw Error();await target.requestFullscreen(); }catch{setError('Fullscreen is unavailable.');} }}
        >
          Fullscreen
        </button>
      </div>
      {error && (
        <p className="resource-notice" role="alert">
          {error}
        </p>
      )}
      <p className="resource-pdf-status" role="status">
        {status}
      </p>
      <div
        className="resource-pdf-pages"
        ref={container}
        data-rendered={rendered ? "true" : "false"}
        aria-busy={!rendered}
      >
        <div ref={surface} />
      </div>
      {accessibleText && (
        <details className="resource-pdf-text">
          <summary>Read page text</summary>
          <p>{accessibleText}</p>
        </details>
      )}
    </section>
  );
}
