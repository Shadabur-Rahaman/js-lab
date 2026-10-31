import { createRoot } from "react-dom/client";
import Library from "../src/resources/Library";
import TeacherResources from "../src/resources/TeacherResources";
import { fixtureRows, setOutage } from "./resources-fixture-client";
const root = createRoot(document.getElementById("mount")!);
const sleep = () => new Promise((r) => setTimeout(r, 100));
const wait = async (check: () => boolean) => {
  for (let i = 0; i < 40; i++) {
    if (check()) return;
    await sleep();
  }
  throw Error("Timed out waiting for UI");
};
const text = () => document.getElementById("mount")!.textContent || "";
const button = (name: string) =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>("#mount button"),
  ).find((b) => b.textContent?.trim() === name)!;
let count = 0;
async function test(name: string, check: () => Promise<void> | void) {
  const item = document.createElement("li");
  try {
    await check();
    item.textContent = "PASS " + name;
    item.className = "pass";
    count++;
  } catch (error) {
    item.textContent = "FAIL " + name + ": " + (error as Error).message;
    item.className = "fail";
  }
  document.getElementById("results")!.append(item);
}
function assert(value: unknown, message: string) {
  if (!value) throw Error(message);
}
document.getElementById("run")!.onclick = async () => {
  document.getElementById("results")!.textContent = "";
  count = 0;
  setOutage(false);
  root.render(<Library />);
  await wait(() => text().includes("14 published materials"));
  await test("public pagination shows twelve cards", () =>
    assert(
      document.querySelectorAll(".resource-card").length === 12,
      "Expected 12 cards",
    ));
  await test("next page shows remaining two cards", async () => {
    button("Next").click();
    await wait(() => document.querySelectorAll(".resource-card").length === 2);
  });
  await test("search filters by title and resets pagination", async () => {
    const input =
      document.querySelector<HTMLInputElement>("input[type=search]")!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, "Variables");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(() => document.querySelectorAll(".resource-card").length === 1);
    assert(text().includes("Variables notes"), "Expected matching title");
  });
  await test("outage shows recoverable library error", async () => {
    setOutage(true);
    button("Refresh materials").click();
    await wait(() => text().includes("Test fixture backend unavailable"));
    setOutage(false);
    button("Refresh materials").click();
    await wait(() => !text().includes("Test fixture backend unavailable"));
  });
  root.render(<TeacherResources />);
  await wait(() => text().includes("fixture@example.test"));
  await test("teacher dashboard reads stored fixture counts", () =>
    assert(
      text().includes("Total resources") &&
        text().includes("Current managed files"),
      "Missing actual record summary",
    ));
  await test("metadata editor is a keyboard-native dialog", async () => {
    button("Edit details").click();
    await wait(() => !!document.querySelector("dialog[open]"));
    assert(
      document.querySelector("dialog")?.getAttribute("aria-label") ===
        "Edit resource details",
      "Missing dialog label",
    );
  });
  await test("metadata edit saves and updates the resource list", async () => {
    const input = document.querySelector<HTMLInputElement>("dialog input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Renamed fixture");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep();
    button("Save changes").click();
    await wait(() => !document.querySelector("dialog[open]"));
    assert(
      fixtureRows[0].title === "Renamed fixture",
      "Edit did not persist through fixture API",
    );
  });
  await test("trash requires confirmation and hides the public record", async () => {
    button("Move to trash").click();
    await wait(() => !!document.querySelector("dialog[open]"));
    assert(
      fixtureRows[0].status === "published",
      "Trashed before confirmation",
    );
    button("Confirm move to trash").click();
    await wait(() => fixtureRows[0].status === "deleted");
  });
  await test("restore returns a trashed resource to draft", async () => {
    button("Restore as draft").click();
    await wait(() => fixtureRows[0].status === "draft");
  });
  document.getElementById("status")!.textContent =
    `${count}/9 resource UI checks passed (fixtures only)`;
};
