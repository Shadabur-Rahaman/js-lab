import { useEffect, useRef, useState } from "react";
import {
  AnnotationMode,
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentProxy,
  type PDFPageProxy,
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
  const container = useRef<HTMLDivElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [ratio, setRatio] = useState(1.414),
    [width, setWidth] = useState(600),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let task: ReturnType<typeof getDocument> | undefined;
    setPdf(null);
    setError("");
    void (async () => {
      try {
        const data = await pdfBytes(
          () => link(resource, true),
          resource.file_size,
          controller.signal,
        );
        if (!active) return;
        const assets = new URL("./pdf-assets/", document.baseURI).href;
        // Only canvas and escaped text: no PDF scripting, forms or link actions.
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
        const first = await loaded.getPage(1),
          viewport = first.getViewport({ scale: 1 });
        if (active) {
          setRatio(viewport.width / viewport.height);
          setPdf(loaded);
        }
      } catch (e) {
        if (active)
          setError(
            (e as Error).name === "PasswordException"
              ? "This PDF is password-protected. Download it to open with its password."
              : "PDF could not be loaded. Please retry or download the original.",
          );
      }
    })();
    return () => {
      active = false;
      controller.abort();
      void task?.destroy().catch(() => {});
    };
  }, [resource.id, resource.version, attempt, retry]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      setWidth(Math.max(100, element.clientWidth)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <section className="resource-pdf" aria-label="PDF document viewer">
      {error ? (
        <div className="resource-notice" role="alert">
          <p>{error}</p>
          <button
            className="button secondary"
            onClick={() => setRetry((n) => n + 1)}
          >
            Retry preview
          </button>
        </div>
      ) : !pdf ? (
        <p className="resource-pdf-status" role="status">
          Loading PDF…
        </p>
      ) : null}
      <div
        className="resource-pdf-pages"
        ref={container}
        role="region"
        aria-label="PDF pages"
        tabIndex={0}
        aria-busy={!pdf && !error}
      >
        {pdf &&
          Array.from({ length: pdf.numPages }, (_, i) => (
            <PdfPage
              key={i + 1}
              pdf={pdf}
              number={i + 1}
              title={resource.title}
              width={width}
              ratio={ratio}
              root={container.current}
            />
          ))}
      </div>
    </section>
  );
}

function PdfPage({
  pdf,
  number,
  title,
  width,
  ratio,
  root,
}: {
  pdf: PDFDocumentProxy;
  number: number;
  title: string;
  width: number;
  ratio: number;
  root: HTMLDivElement | null;
}) {
  const frame = useRef<HTMLDivElement>(null),
    surface = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false),
    [pageRatio, setPageRatio] = useState(ratio),
    [rendered, setRendered] = useState(false),
    [error, setError] = useState(""),
    [text, setText] = useState("");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setNear(entries[0].isIntersecting),
      { root, rootMargin: "800px 0px" },
    );
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    if (!near) {
      surface.current?.replaceChildren();
      setRendered(false);
      setText("");
      return;
    }
    let active = true,
      render: RenderTask | undefined,
      page: PDFPageProxy | undefined;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `${title}, PDF page ${number} of ${pdf.numPages}`,
    );
    setRendered(false);
    setError("");
    void (async () => {
      try {
        page = await pdf.getPage(number);
        if (!active) return;
        const base = page.getViewport({ scale: 1 }),
          bounds = pdfViewport(
            base.width,
            base.height,
            width,
            1,
            window.devicePixelRatio || 1,
          );
        setPageRatio(base.width / base.height);
        canvas.width = bounds.pixelWidth;
        canvas.height = bounds.pixelHeight;
        canvas.style.width = bounds.cssWidth + "px";
        canvas.style.height = bounds.cssHeight + "px";
        render = page.render({
          canvas,
          viewport: page.getViewport({ scale: bounds.scale }),
          transform: [bounds.outputScale, 0, 0, bounds.outputScale, 0, 0],
          annotationMode: AnnotationMode.DISABLE,
          background: "#ffffff",
        });
        await render.promise;
        if (!active) return;
        const old = surface.current?.querySelector("canvas");
        surface.current?.replaceChildren(canvas);
        if (old) {
          old.width = 0;
          old.height = 0;
        }
        setRendered(true);
        try {
          const content = await page.getTextContent();
          if (active)
            setText(
              content.items
                .map((item) => ("str" in item ? item.str : ""))
                .join(" "),
            );
        } catch {
          /* Image-only pages do not need a text layer. */
        }
      } catch (e) {
        if (active && (e as Error).name !== "RenderingCancelledException")
          setError(
            "This page could not be displayed. Download the original to view it.",
          );
      }
    })();
    return () => {
      active = false;
      render?.cancel();
      const release = () => {
        if (!canvas.isConnected) {
          canvas.width = 0;
          canvas.height = 0;
        }
        page?.cleanup();
      };
      if (render) void render.promise.then(release, release);
      else release();
    };
  }, [pdf, number, width, near, title]);
  return (
    <div
      className="resource-pdf-page"
      ref={frame}
      style={{ aspectRatio: pageRatio }}
      data-page={number}
      data-rendered={rendered ? "true" : "false"}
      aria-busy={near && !rendered && !error}
    >
      <div ref={surface} />
      {near && !rendered && !error && (
        <span className="resource-pdf-page-loading" role="status">
          Loading page…
        </span>
      )}
      {error && (
        <p className="resource-notice" role="alert">
          {error}
        </p>
      )}
      {text && <p className="resource-pdf-page-text">{text}</p>}
    </div>
  );
}
