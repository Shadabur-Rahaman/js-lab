import { createClient } from "npm:@supabase/supabase-js@2.118.0";
export const bucket = "learning-resources";
export function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-maintenance-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
export function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
export class ClientError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function checked<T>(
  result: PromiseLike<{ data: T; error: unknown }>,
): Promise<NonNullable<T>> {
  const { data, error } = await result;
  if (error) throw error;
  if (data == null) throw new ClientError("This resource is unavailable.", 404);
  return data;
}
export async function actor(
  req: Request,
  db: ReturnType<typeof service>,
  required = true,
) {
  const token =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const {
    data: { user },
    error,
  } = token
    ? await db.auth.getUser(token)
    : { data: { user: null }, error: true };
  if (error || !user) {
    if (required)
      throw new ClientError("Sign in again to manage resources.", 401);
    return null;
  }
  const { data: member } = await db
    .from("authorized_teachers")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    if (required)
      throw new ClientError(
        "This account has not been authorized as a teacher.",
        403,
      );
    return null;
  }
  return { id: user.id, role: member.role, email: user.email };
}
export async function limit(
  db: ReturnType<typeof service>,
  key: string,
  maximum: number,
  seconds = 60,
) {
  const ok = await checked(
    db.rpc("resource_rate", { key_value: key, maximum, seconds }),
  );
  if (!ok)
    throw new ClientError(
      "Too many requests. Wait a minute and try again.",
      429,
    );
}
export async function maintenance(db: ReturnType<typeof service>) {
  const candidates = await checked(db.rpc("resource_cleanup_candidates"));
  let removed = 0,
    failed = 0;
  for (const version of candidates || []) {
    const { error } = await db.storage
      .from(bucket)
      .remove([version.storage_path]);
    if (error) {
      failed++;
      continue;
    }
    const { error: saveError } = await db
      .from("resource_versions")
      .update({ state: "purged" })
      .eq("id", version.id)
      .eq("state", "cancelled");
    if (saveError) failed++;
    else removed++;
  }
  await db
    .from("resource_rate_limits")
    .delete()
    .lt("expires_at", new Date().toISOString());
  await db
    .from("resource_audit_log")
    .insert({ action: "retention_cleanup", detail: { removed, failed } });
  return {
    removed,
    failed,
    note: "Failed deletions remain in the cleanup queue. Incomplete resumable upload chunks expire under the provider’s upload policy.",
  };
}
