export class CookieModel {
  constructor() {
    this.cookies = [];
    this.now = Date.parse("2026-01-01T00:00:00Z");
  }
  set(
    source,
    url = "https://learn.example.test/course/page.html",
    fromHTTP = false,
  ) {
    if (new TextEncoder().encode(source).length > 4096)
      throw Error(
        "Model limit: 4096 bytes per cookie; actual browser limits vary.",
      );
    const u = new URL(url),
      parts = source.split(";").map((s) => s.trim()),
      first = parts.shift(),
      equals = first.indexOf("=");
    if (equals <= 0) throw Error("Use one name=value assignment.");
    const name = first.slice(0, equals),
      value = first.slice(equals + 1);
    if (/[\s,;]/.test(name)) throw Error("Unsupported cookie name.");
    const attributes = Object.fromEntries(
      parts.map((p) => {
        const i = p.indexOf("=");
        return i < 0
          ? [p.toLowerCase(), true]
          : [p.slice(0, i).toLowerCase(), p.slice(i + 1)];
      }),
    );
    if (attributes.httponly && !fromHTTP)
      throw Error(
        "JavaScript cannot set HttpOnly. Use the fictional HTTP-response button.",
      );
    const domain = String(attributes.domain || u.hostname)
      .replace(/^\./, "")
      .toLowerCase();
    if (domain !== u.hostname && !u.hostname.endsWith("." + domain))
      throw Error("The Domain does not match this host.");
    if (domain !== "example.test" && !domain.endsWith(".example.test"))
      throw Error(
        "This model supports only example.test teaching hosts; it is not a public-suffix implementation.",
      );
    const secure = !!attributes.secure;
    if (secure && u.protocol !== "https:")
      throw Error("Secure requires HTTPS in this model.");
    const sameSite = String(attributes.samesite || "Lax").toLowerCase();
    if (!["strict", "lax", "none"].includes(sameSite))
      throw Error("Use SameSite Strict, Lax or None.");
    if (sameSite === "none" && !secure)
      throw Error("SameSite=None requires Secure.");
    const path =
      typeof attributes.path === "string" && attributes.path.startsWith("/")
        ? attributes.path
        : u.pathname.slice(0, u.pathname.lastIndexOf("/")) || "/";
    let expires = null;
    if (attributes["max-age"] !== undefined) {
      if (!/^-?\d+$/.test(String(attributes["max-age"])))
        throw Error("Max-Age must be an integer in this model.");
      expires = this.now + Number(attributes["max-age"]) * 1000;
    } else if (attributes.expires) {
      expires = Date.parse(String(attributes.expires));
      if (!Number.isFinite(expires)) throw Error("Use a valid Expires date.");
    }
    const cookie = {
      name,
      value,
      domain,
      hostOnly: !attributes.domain,
      path,
      secure,
      sameSite,
      httpOnly: !!attributes.httponly,
      expires,
    };
    if (
      !fromHTTP &&
      this.cookies.some(
        (c) =>
          c.httpOnly &&
          c.name === name &&
          c.domain === domain &&
          c.path === path &&
          (c.expires === null || c.expires > this.now),
      )
    )
      throw Error("Script cannot overwrite an existing HttpOnly cookie.");
    this.cookies = this.cookies.filter(
      (c) => !(c.name === name && c.domain === domain && c.path === path),
    );
    if (expires === null || expires > this.now) this.cookies.push(cookie);
    return cookie;
  }
  matching(url) {
    const u = new URL(url);
    this.cookies = this.cookies.filter(
      (c) => c.expires === null || c.expires > this.now,
    );
    return this.cookies.filter(
      (c) =>
        (c.hostOnly
          ? u.hostname === c.domain
          : u.hostname === c.domain || u.hostname.endsWith("." + c.domain)) &&
        (u.pathname === c.path ||
          u.pathname.startsWith(
            c.path.endsWith("/") ? c.path : c.path + "/",
          )) &&
        (!c.secure || u.protocol === "https:"),
    );
  }
  visible(url) {
    return this.matching(url)
      .filter((c) => !c.httpOnly)
      .map((c) => c.name + "=" + c.value)
      .join("; ");
  }
  request(url, { crossSite = false, topLevel = true, method = "GET" } = {}) {
    return this.matching(url)
      .filter(
        (c) =>
          !crossSite ||
          c.sameSite === "none" ||
          (c.sameSite === "lax" &&
            topLevel &&
            ["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase())),
      )
      .map((c) => c.name + "=" + c.value)
      .join("; ");
  }
  advance(seconds) {
    this.now += seconds * 1000;
  }
  endSession() {
    this.cookies = this.cookies.filter((c) => c.expires !== null);
  }
}
export function newStorageModel() {
  return {
    origin: "https://learn.example.test",
    tab: "A",
    memory: {},
    local: {},
    session: {},
  };
}
export function storageArea(model, type) {
  if (type === "memory")
    return (model.memory[model.origin + "|" + model.tab] ??= {});
  if (type === "session")
    return (model.session[model.origin + "|" + model.tab] ??= {});
  return (model.local[model.origin] ??= {});
}
export function reloadModel(model) {
  model.memory[model.origin + "|" + model.tab] = {};
}
export function closeTabModel(model) {
  reloadModel(model);
  model.session[model.origin + "|" + model.tab] = {};
}
