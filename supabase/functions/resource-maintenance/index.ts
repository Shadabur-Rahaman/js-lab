import { maintenance, response, service } from "../_shared/server.ts";
import { sha256 } from "../_shared/validation.mjs";
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return response({ error: "Use POST." }, 405);
  const expected = Deno.env.get("RESOURCE_MAINTENANCE_SECRET");
  const supplied = req.headers.get("x-maintenance-secret") || "";
  if (
    !expected ||
    (await sha256(new TextEncoder().encode(expected))) !==
      (await sha256(new TextEncoder().encode(supplied)))
  )
    return response({ error: "Not permitted." }, 403);
  try {
    return response(await maintenance(service()));
  } catch {
    return response({ error: "Cleanup failed; retry later." }, 500);
  }
});
