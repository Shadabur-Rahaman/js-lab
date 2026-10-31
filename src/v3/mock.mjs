export const fixtures = {
  students: [
    { id: 1, name: "Asha", marks: 86 },
    { id: 2, name: "Dev", marks: 61 },
    { id: 3, name: "Mira", marks: 93 },
  ],
  products: [
    { id: 1, name: "Notebook", category: "study", price: 45 },
    { id: 2, name: "Lamp", category: "tools", price: 320 },
    { id: 3, name: "Pencil", category: "study", price: 12 },
  ],
  courses: [
    { id: 1, name: "HTML fundamentals" },
    { id: 2, name: "JavaScript applications" },
  ],
  weather: [
    {
      id: 1,
      city: "Example City",
      temperature: 26,
      condition: "Cloudy",
      fictional: true,
    },
  ],
  posts: [
    { id: 1, title: "Welcome to the workshop" },
    { id: 2, title: "Test one change at a time" },
  ],
  tasks: [
    { id: 1, title: "Plan the interface", done: false },
    { id: 2, title: "Test with keyboard", done: true },
  ],
  countries: [
    {
      id: 1,
      name: "Example Republic",
      capital: "Sample Town",
      fictional: true,
    },
  ],
  users: [
    { id: 1, name: "Asha", role: "Designer" },
    { id: 2, name: "Dev", role: "Developer" },
    { id: 3, name: "Mira", role: "Reviewer" },
    { id: 4, name: "Sam", role: "Student" },
  ],
};
export function mockResponse(
  url,
  options = {},
  scenario = "success",
  database = structuredClone(fixtures),
) {
  const u = new URL(url, "https://mock.invalid");
  if (u.origin !== "https://mock.invalid")
    throw new TypeError(
      "Only /api/... offline mock endpoints are supported. No real network request was made.",
    );
  if (scenario === "network") throw new TypeError("Simulated network failure");
  const name = u.pathname.split("/")[2],
    method = (options.method || "GET").toUpperCase();
  let status =
    scenario === "error"
      ? 500
      : scenario === "rate"
        ? 429
        : Object.hasOwn(database, name)
          ? 200
          : 404;
  let body =
    status === 404
      ? { error: "Endpoint not found" }
      : status === 500
        ? { error: "Simulated server error" }
        : status === 429
          ? { error: "Simulated rate limit" }
          : structuredClone(database[name]);
  if (status === 200) {
    if (method === "GET") {
      if (scenario === "empty") body = [];
      const q = (u.searchParams.get("q") || "").toLowerCase();
      body = body.filter((x) => JSON.stringify(x).toLowerCase().includes(q));
      const page = Math.max(1, Number(u.searchParams.get("page")) || 1),
        size = Math.max(
          1,
          Math.min(50, Number(u.searchParams.get("limit")) || 50),
        );
      body = body.slice((page - 1) * size, page * size);
    } else if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
      const id = Number(u.pathname.split("/")[3]);
      let value = {};
      if (options.body) {
        try {
          value = JSON.parse(options.body);
        } catch {
          return {
            status: 400,
            body: { error: "Invalid JSON body" },
            headers: { "content-type": "application/json" },
          };
        }
      }
      if (method === "POST") {
        const created = {
          ...value,
          id: Math.max(0, ...database[name].map((x) => x.id)) + 1,
        };
        database[name].push(created);
        body = created;
        status = 201;
      } else {
        const index = database[name].findIndex((x) => x.id === id);
        if (index < 0) {
          status = 404;
          body = { error: "Record not found" };
        } else if (method === "DELETE") {
          database[name].splice(index, 1);
          status = 204;
          body = null;
        } else {
          database[name][index] =
            method === "PUT"
              ? { ...value, id }
              : { ...database[name][index], ...value, id };
          body = database[name][index];
        }
      }
    } else {
      status = 405;
      body = { error: "Method not supported" };
    }
  }
  return {
    status,
    body,
    headers: {
      "content-type": "application/json",
      "x-source": "offline-fictional-fixtures",
    },
  };
}
