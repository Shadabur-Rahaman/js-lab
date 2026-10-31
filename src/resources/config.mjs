export function publicConfig(env = {}) {
  const url = String(env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY || "");
  if (!url && !key) return null;
  try {
    const parsed = new URL(url);
    if (
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password ||
      !(
        parsed.protocol === "https:" ||
        (parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname))
      )
    )
      return null;
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      if (payload.role !== "anon") return null;
    }
    return { url, key };
  } catch {
    return null;
  }
}
