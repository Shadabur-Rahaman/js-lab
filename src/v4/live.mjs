export const liveOrigins = [
  "https://jsonplaceholder.typicode.com",
  "https://geocoding-api.open-meteo.com",
  "https://api.open-meteo.com",
  "https://api.tvmaze.com",
];
export function approvedURL(provider, query, coordinates) {
  const q = String(query || "")
    .trim()
    .slice(0, 80);
  if (provider === "users") return "https://jsonplaceholder.typicode.com/users";
  if (provider === "television") {
    if (!q) throw Error("Enter a show title");
    return "https://api.tvmaze.com/search/shows?q=" + encodeURIComponent(q);
  }
  if (provider === "weather") {
    if (coordinates) {
      const { latitude, longitude } = coordinates;
      if (
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90 ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180
      )
        throw Error("Invalid coordinates");
      return (
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        latitude +
        "&longitude=" +
        longitude +
        "&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=3&timezone=auto"
      );
    }
    if (q.length < 2) throw Error("Enter a city with at least two letters");
    return (
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(q) +
      "&count=1&language=en&format=json"
    );
  }
  throw Error("Provider is not approved");
}
// Fixed trusted controller only. No learner-supplied source, headers, destinations or credentials.
function liveController(token, approvedURL) {
  const send = (type, data = {}) =>
    parent.postMessage({ token, type, ...data }, "*");
  let controller = null,
    generation = 0;
  const cache = new Map(),
    starts = [];
  const strip = (value) =>
    String(value || "")
      .replace(/<[^>]*>/g, "")
      .slice(0, 1200);
  async function request(provider, query, force = false) {
    controller?.abort();
    controller = new AbortController();
    const c = controller,
      mine = ++generation,
      start = performance.now(),
      key = provider + "|" + query,
      trace = [];
    send("live-state", {
      status: "pending",
      source: "Waiting for live data",
      provider,
    });
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.time < 60000) {
      send("live-result", {
        ...cached.value,
        source: "Cached live response",
        ageSeconds: Math.round((Date.now() - cached.time) / 1000),
      });
      return;
    }
    const now = Date.now();
    while (starts.length && now - starts[0] > 60000) starts.shift();
    if (starts.length >= 6 || (starts.length && now - starts.at(-1) < 1500)) {
      send("live-error", {
        error:
          "Please wait before requesting again. This lab allows six operations per minute and at least 1.5 seconds between starts.",
      });
      return;
    }
    starts.push(now);
    const timeout = setTimeout(() => c.abort(), 10000);
    const get = async (url) => {
      trace.push({ url, phase: "request" });
      const response = await fetch(url, {
        signal: c.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        redirect: "error",
        headers: { Accept: "application/json" },
      });
      trace.push({
        url,
        phase: "response",
        status: response.status,
        contentType: response.headers.get("content-type"),
      });
      if (!response.ok)
        throw Error(
          "HTTP " +
            response.status +
            (response.status === 429
              ? " — rate limited; wait before retrying"
              : ""),
        );
      if (!response.headers.get("content-type")?.toLowerCase().includes("json"))
        throw Error("Expected a JSON response");
      const body = await response.text();
      if (body.length > 500000)
        throw Error("Response exceeds the teaching limit");
      return JSON.parse(body);
    };
    try {
      let rows = [],
        raw,
        credit,
        url;
      if (provider === "users") {
        url = approvedURL(provider, query);
        raw = await get(url);
        if (!Array.isArray(raw)) throw Error("Expected a user list");
        rows = raw
          .filter(
            (x) => x && typeof x.name === "string" && Number.isFinite(x.id),
          )
          .filter((x) =>
            x.name.toLowerCase().includes(String(query).toLowerCase()),
          )
          .slice(0, 10)
          .map((x) => ({
            title: x.name,
            description: "Online fictional user #" + x.id,
          }));
        credit = "JSONPlaceholder — online fictional REST data";
      } else if (provider === "television") {
        url = approvedURL(provider, query);
        raw = await get(url);
        if (!Array.isArray(raw))
          throw Error("Expected television search results");
        rows = raw
          .slice(0, 8)
          .filter((x) => x?.show && typeof x.show.name === "string")
          .map((x) => ({
            title: x.show.name,
            description: strip(x.show.summary) || "No description",
            rating:
              typeof x.show.rating?.average === "number"
                ? x.show.rating.average
                : null,
            link:
              typeof x.show.url === "string" &&
              x.show.url.startsWith("https://www.tvmaze.com/")
                ? x.show.url
                : "https://www.tvmaze.com/",
          }));
        credit = "TVMaze television data — CC BY-SA; not movie data";
      } else if (provider === "weather") {
        const locationURL = approvedURL(provider, query);
        const places = await get(locationURL);
        const place = places?.results?.[0];
        if (!place) {
          raw = places;
          rows = [];
          credit = "Open-Meteo geocoding — no location found";
        } else {
          url = approvedURL(provider, query, place);
          raw = await get(url);
          if (
            !Number.isFinite(raw?.current?.temperature_2m) ||
            !Array.isArray(raw?.daily?.time) ||
            !Array.isArray(raw?.daily?.temperature_2m_max)
          )
            throw Error("Unexpected weather schema");
          rows = [
            {
              title: String(place.name) + " — current",
              description:
                raw.current.temperature_2m +
                " " +
                String(raw.current_units?.temperature_2m || "°C") +
                "; observed " +
                String(raw.current.time),
            },
            ...raw.daily.time.slice(0, 3).map((date, i) => ({
              title: String(date),
              description:
                "Forecast high " +
                String(raw.daily.temperature_2m_max[i]) +
                " °C; low " +
                String(raw.daily.temperature_2m_min?.[i]) +
                " °C",
            })),
          ];
          credit =
            "Weather data by Open-Meteo — CC BY 4.0; educational/non-commercial free endpoint";
        }
      } else throw Error("Provider is not approved");
      if (c.signal.aborted || mine !== generation) return;
      const result = {
        provider,
        rows,
        credit,
        trace,
        elapsed: Math.round(performance.now() - start),
        receivedAt: new Date().toISOString(),
        source: "Live response",
        ageSeconds: 0,
        rawPreview: JSON.stringify(raw).slice(0, 12000),
      };
      cache.set(key, { time: Date.now(), value: result });
      send("live-result", result);
    } catch (error) {
      if (mine === generation)
        send("live-error", {
          provider,
          error:
            error.name === "AbortError"
              ? "Cancelled or timed out"
              : String(error.message),
          trace,
          source: "Live unavailable; no fictional data has been substituted",
        });
    } finally {
      clearTimeout(timeout);
    }
  }
  addEventListener("message", (event) => {
    const m = event.data;
    if (event.source !== parent || m?.token !== token) return;
    if (m.type === "live-cancel") {
      controller?.abort();
      generation++;
      send("live-state", {
        status: "cancelled",
        source: "Cancelled; no response rendered",
      });
      return;
    }
    if (
      m.type !== "live-request" ||
      !["users", "weather", "television"].includes(m.provider) ||
      typeof m.query !== "string" ||
      m.query.length > 80
    )
      return;
    request(m.provider, m.query, m.force === true);
  });
  send("live-ready");
}
export function liveDocument(token) {
  const script =
    `(${liveController.toString()})(${JSON.stringify(token)},${approvedURL.toString()})`.replace(
      /<\/script/gi,
      "<\\/script",
    );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${token}'; connect-src ${liveOrigins.join(" ")}; base-uri 'none'; form-action 'none'"></head><body><p>Controlled public-data request integration.</p><script nonce="${token}">${script}</script></body></html>`;
}
export function offlineLiveResult(provider, query = "") {
  const q = query.trim().toLowerCase();
  if (provider === "weather")
    return {
      rows: [
        {
          title: "Example City — fictional current conditions",
          description: "26 °C; Cloudy",
        },
        { title: "Fictional three-day forecast", description: "25, 27, 26 °C" },
      ],
      credit: "Bundled fictional weather fixture",
    };
  if (provider === "television")
    return {
      rows: [
        {
          title: "The Workshop — fictional television fixture",
          description: "No actual provider request was made.",
        },
      ].filter((x) => !q || x.title.toLowerCase().includes(q)),
      credit: "Bundled fictional television fixture; not TVMaze live data",
    };
  return {
    rows: [
      { title: "Asha", description: "Fictional designer" },
      { title: "Dev", description: "Fictional developer" },
    ].filter((x) => x.title.toLowerCase().includes(q)),
    credit: "Bundled fictional users; no real request",
  };
}
