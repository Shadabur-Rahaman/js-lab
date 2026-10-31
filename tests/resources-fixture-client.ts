// Test-only adapter. Never imported by application source or the production build.
export * from "../src/resources/client";
import { blank, type Resource } from "../src/resources/client";
export const fixtureCategories = [
  { id: "notes", name: "Lecture Notes", display_order: 0, archived: false },
];
export let outage = false;
export function setOutage(value: boolean) {
  outage = value;
}
export const fixtureRows: Resource[] = Array.from({ length: 14 }, (_, i) => ({
  id: "fixture-" + i,
  ...blank(),
  title: i === 0 ? "Variables notes" : `Practice ${String(i).padStart(2, "0")}`,
  description: "Local UI fixture, not a cloud upload",
  original_filename: i === 1 ? "practice.pptx" : "notes.pdf",
  mime_type:
    i === 1
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf",
  file_size: 1024 + i,
  category_id: "notes",
  chapter_id: i === 0 ? 3 : 4,
  tags: ["fixture"],
  status: "published",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
  version: 1,
}));
export const cloud = {
  auth: {
    getSession: async () => ({
      data: { session: { access_token: "test-only" } },
    }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signOut: async () => ({ error: null }),
  },
};
export async function api(action: string, body: any = {}) {
  if (outage)
    throw Error("Test fixture backend unavailable. Lessons remain accessible.");
  if (action === "profile")
    return {
      id: "fixture-teacher",
      email: "fixture@example.test",
      role: "admin",
    };
  if (action === "edit") {
    const row = fixtureRows.find((r) => r.id === body.id)!;
    Object.assign(row, body.metadata, { version: row.version + 1 });
    return row;
  }
  if (action === "settings") return {};
  if (action === "category") return {};
  if (action === "manifest") return { testOnly: true };
  throw Error("Not supported by test fixture: " + action);
}
export async function catalogs() {
  return { categories: fixtureCategories, max: 25 * 1024 * 1024 };
}
export async function published() {
  if (outage)
    throw Error("Test fixture backend unavailable. Lessons remain accessible.");
  return fixtureRows.filter((r) => r.status === "published");
}
export async function managed() {
  return fixtureRows;
}
