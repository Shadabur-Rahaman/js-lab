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
            .querySelector(".resource-pdf-pages")
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
      const initial = canvas.width;
      (
        document.querySelector(
          '[aria-label="Zoom in PDF"]',
        ) as HTMLButtonElement
      ).click();
      await wait(
        () =>
          document
            .querySelector(".resource-pdf-pages")
            ?.getAttribute("data-rendered") === "true" &&
          document.querySelector("canvas")!.width > initial,
      );
      const next = [...document.querySelectorAll("button")].find(
        (b) => b.textContent === "Next page",
      )!;
      if (!next.disabled) {
        next.click();
        await wait(
          () =>
            document
              .querySelector(".resource-pdf-pages")
              ?.getAttribute("data-rendered") === "true" &&
            document
              .querySelector("canvas")
              ?.getAttribute("aria-label")
              ?.includes("page 2") === true,
        );
      }
      item.textContent =
        "PASS actual PDF rendered with visible content, zoom and page controls: " +
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
