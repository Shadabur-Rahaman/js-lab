import { createRoot } from "react-dom/client";
import { Preview } from "../src/resources/components";
import "../src/resources/resources.css";
import type { Resource } from "../src/resources/client";
const root = createRoot(document.getElementById("mount")!);
const records = await (
  await fetch("/.deployment/pdf-preview-fixtures/manifest.json")
).json();
const selector = document.getElementById("document") as HTMLSelectElement;
for (const record of records) {
  const option = document.createElement("option");
  option.value = record.id;
  option.textContent = record.title;
  selector.append(option);
}
function open(id: string) {
  const r = records.find((record: Resource) => record.id === id);
  root.render(
    <Preview
      resource={{
        ...r,
        version: 1,
        mime_type: "application/pdf",
        original_filename: r.title + ".pdf",
      }}
      onClose={() => root.render(null)}
    />,
  );
}
document.getElementById("open")!.onclick = () => open(selector.value);
const wait = async (check: () => boolean) => {
  for (let i = 0; i < 150; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("PDF did not finish rendering");
};
document.getElementById("run")!.onclick = async () => {
  document.getElementById("results")!.textContent = "";
  let passed = 0;
  for (const record of records) {
    const item = document.createElement("li");
    try {
      open(record.id);
      await wait(
        () =>
          document
            .querySelector('.resource-pdf-page[data-page="1"]')
            ?.getAttribute("data-rendered") === "true",
      );
      const canvas = document.querySelector("canvas")!;
      const pixels = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height).data;
      let ink = 0;
      for (let i = 0; i < pixels.length; i += 4)
        if (pixels[i] < 220 && pixels[i + 1] < 220 && pixels[i + 2] < 220)
          ink++;
      if (ink < 100) throw Error("PDF page was blank");
      const pages =
        document.querySelectorAll<HTMLElement>(".resource-pdf-page");
      if (pages.length < 2) throw Error("Expected a multi-page PDF");
      const controls = [...document.querySelectorAll("dialog button")].map(
        (button) => button.textContent?.trim(),
      );
      if (
        controls.some((text) =>
          /Previous page|Next page|Fit to width/.test(text || ""),
        )
      )
        throw Error("Page navigation controls should be absent");
      const scroll = document.querySelector<HTMLElement>(
        ".resource-pdf-pages",
      )!;
      scroll.scrollTo({ top: scroll.scrollHeight, behavior: "instant" });
      const last = pages[pages.length - 1];
      await wait(
        () =>
          last.getAttribute("data-rendered") === "true" &&
          !!last.querySelector("canvas"),
      );
      const lastCanvas = last.querySelector("canvas")!;
      if (!lastCanvas.width || !lastCanvas.height)
        throw Error("Last PDF page did not render");
      if (document.querySelectorAll("canvas").length >= pages.length)
        throw Error("Offscreen pages should release their canvases");
      scroll.scrollTo({ top: 0, behavior: "instant" });
      await wait(() => pages[0].getAttribute("data-rendered") === "true");
      item.textContent =
        "PASS continuous scrolling reaches the final page and returns to the first, without page controls: " +
        record.title;
      item.className = "pass";
      passed++;
    } catch (e) {
      item.textContent = "FAIL " + record.title + ": " + (e as Error).message;
      item.className = "fail";
    }
    document.getElementById("results")!.append(item);
    root.render(null);
    await new Promise((r) => setTimeout(r, 100));
  }
  document.getElementById("status")!.textContent =
    `${passed}/${records.length} actual classroom PDF checks passed`;
};
