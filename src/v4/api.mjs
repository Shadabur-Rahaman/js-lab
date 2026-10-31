export const advancedFixtures = {
  users: [
    { id: 1, name: "Asha", role: "Designer" },
    { id: 2, name: "Dev", role: "Developer" },
    { id: 3, name: "Mira", role: "Reviewer" },
    { id: 4, name: "Sam", role: "Student" },
  ],
  posts: [
    {
      id: 1,
      userId: 1,
      title: "Plan a small feature",
      body: "Test one input at a time.",
    },
    {
      id: 2,
      userId: 2,
      title: "Explain an error",
      body: "Keep feedback clear.",
    },
  ],
  locations: [
    { id: 1, name: "Example City", latitude: 22.57, longitude: 88.36 },
  ],
  weather: [
    {
      id: 1,
      city: "Example City",
      temperature: 26,
      condition: "Cloudy",
      forecast: [25, 27, 26],
      fictional: true,
    },
  ],
  movies: [
    {
      id: 1,
      title: "The Bridge Workshop",
      description: "A fictional engineering adventure.",
      rating: 8.1,
      year: 2024,
    },
    {
      id: 2,
      title: "Signals at Dawn",
      description: "A fictional story about communication.",
      rating: 7.4,
      year: 2025,
    },
    {
      id: 3,
      title: "The Quiet Compiler",
      description: "Fictional offline movie fixture, not TMDB data.",
      rating: null,
      year: 2023,
    },
  ],
  products: [
    { id: 1, name: "Notebook", price: 45 },
    { id: 2, name: "Lamp", price: 320 },
  ],
};
// Standalone so its exact implementation can be embedded in the opaque native runtime.
export function advancedResponse(
  url,
  options = {},
  scenario = "success",
  database = structuredClone(advancedFixtures),
) {
  const u = new URL(url, "https://mock.invalid");
  if (u.origin !== "https://mock.invalid" || !u.pathname.startsWith("/api/"))
    throw new TypeError(
      "Only /api/ offline endpoints are supported; no network request was sent.",
    );
  if (scenario === "network" || scenario === "cors")
    throw new TypeError(
      scenario === "cors"
        ? "Simulated CORS/network rejection: inspect browser DevTools for the actual cause."
        : "Simulated network failure",
    );
  const name = u.pathname.split("/")[2],
    id = Number(u.pathname.split("/")[3]),
    method = String(options.method || "GET").toUpperCase(),
    headers = {
      "content-type": scenario === "type" ? "text/html" : "application/json",
      "x-learning-source": "fictional-offline",
      "x-total-count": String(database[name]?.length || 0),
    };
  const errors = {
    bad: 400,
    unauthorized: 401,
    forbidden: 403,
    missing: 404,
    rate: 429,
    error: 500,
    unavailable: 503,
  };
  if (errors[scenario])
    return {
      status: errors[scenario],
      headers: {
        ...headers,
        ...(scenario === "rate" ? { "retry-after": "2" } : {}),
      },
      body: { error: "Simulated HTTP " + errors[scenario] },
    };
  if (!Object.hasOwn(database, name))
    return { status: 404, headers, body: { error: "Endpoint not found" } };
  if (method === "GET") {
    let rows = structuredClone(database[name]);
    if (scenario === "empty") rows = [];
    if (id) {
      const row = rows.find((x) => x.id === id);
      return {
        status: row ? 200 : 404,
        headers,
        body: row || { error: "Record not found" },
      };
    }
    const q = (u.searchParams.get("q") || "").trim().toLowerCase();
    rows = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
    const userId = Number(u.searchParams.get("userId"));
    if (userId) rows = rows.filter((row) => row.userId === userId);
    const page = Math.max(1, Number(u.searchParams.get("page")) || 1),
      limit = Math.min(
        20,
        Math.max(1, Number(u.searchParams.get("limit")) || 20),
      );
    return {
      status: 200,
      headers,
      body: rows.slice((page - 1) * limit, page * limit),
    };
  }
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method))
    return { status: 405, headers, body: { error: "Method not supported" } };
  if (method === "DELETE") {
    const index = database[name].findIndex((row) => row.id === id);
    if (index < 0)
      return { status: 404, headers, body: { error: "Record not found" } };
    database[name].splice(index, 1);
    return { status: 204, headers, body: null };
  }
  let value;
  try {
    value = JSON.parse(options.body || "{}");
  } catch {
    return { status: 400, headers, body: { error: "Malformed request JSON" } };
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return { status: 400, headers, body: { error: "Use a JSON object" } };
  if (method === "POST") {
    if (typeof value.name !== "string" || !value.name.trim())
      return {
        status: 400,
        headers,
        body: { error: "A fictional name is required" },
      };
    const item = {
      ...value,
      id: Math.max(0, ...database[name].map((x) => x.id)) + 1,
    };
    database[name].push(item);
    return { status: 201, headers, body: item };
  }
  const index = database[name].findIndex((row) => row.id === id);
  if (index < 0)
    return { status: 404, headers, body: { error: "Record not found" } };
  database[name][index] =
    method === "PUT"
      ? { ...value, id }
      : { ...database[name][index], ...value, id };
  return { status: 200, headers, body: database[name][index] };
}
export function validateRows(value) {
  if (!Array.isArray(value)) throw new TypeError("Expected a list of records");
  return value.filter(
    (x) =>
      x &&
      typeof x === "object" &&
      Number.isFinite(x.id) &&
      typeof (x.name ?? x.title) === "string",
  );
}
export function offlineAdapterSource() {
  return `/* FICTIONAL OFFLINE PRACTICE. No server, credentials or persistent shared database. */
(()=>{
const advancedFixtures=${JSON.stringify(advancedFixtures)},database=structuredClone(advancedFixtures);
const advancedResponse=${advancedResponse.toString()};
const originalFetch=window.fetch.bind(window);
window.fetch=(input,options={})=>{
const raw=typeof input==='string'?input:input?.url||String(input),url=new URL(raw,location.href);
if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return originalFetch(input,options);
return new Promise((resolve,reject)=>{
const signal=options.signal;if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return}
const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);try{const result=advancedResponse(url.pathname+url.search,options,'success',database);resolve(new Response(result.status===204?null:JSON.stringify(result.body),{status:result.status,headers:result.headers}))}catch(error){reject(error)}},200);
function abort(){clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'))}signal?.addEventListener('abort',abort,{once:true});
});};
})();`;
}
