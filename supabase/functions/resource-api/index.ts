import {
  actor,
  bucket,
  checked,
  ClientError,
  cors,
  limit,
  maintenance,
  response,
  service,
} from "../_shared/server.ts";
import {
  HARD_LIMIT,
  fileInfo,
  metadata,
  sha256,
  validateBytes,
} from "../_shared/validation.mjs";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return response({ error: "Use POST." }, 405);
  try {
    if (Number(req.headers.get("content-length") || 0) > 32768)
      throw new ClientError("Request too large.", 413);
    const reader = req.body?.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    if (reader)
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 32768) {
          await reader.cancel();
          throw new ClientError("Request too large.", 413);
        }
        chunks.push(value);
      }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const raw = new TextDecoder().decode(bytes);
    const { action, ...body } = JSON.parse(raw);
    const db = service();
    if (action === "link") {
      if (!/^[a-f0-9-]{36}$/i.test(body.id || ""))
        throw new ClientError("Invalid resource.");
      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      await limit(
        db,
        "link:" + (await sha256(new TextEncoder().encode(ip))),
        120,
      );
      await limit(db, "public-links-total", 1000);
      const user = await actor(req, db, false);
      const resource = await checked(
        db
          .from("learning_resources")
          .select("*")
          .eq("id", body.id)
          .maybeSingle(),
      );
      if (
        !resource ||
        resource.status === "deleted" ||
        !(
          resource.status === "published" ||
          (user && (user.role === "admin" || user.id === resource.uploaded_by))
        )
      )
        throw new ClientError("This resource is unavailable.", 404);
      const version = await checked(
        db
          .from("resource_versions")
          .select("state")
          .eq("id", resource.current_version_id)
          .maybeSingle(),
      );
      if (version?.state !== "ready")
        throw new ClientError("This resource is unavailable.", 404);
      // Download once on finalization, never on each student request. A short-lived URL
      // is issued only for a validated current version; Storage handles missing objects.
      const signed = await checked(
        db.storage
          .from(bucket)
          .createSignedUrl(
            resource.storage_path,
            60,
            body.preview ? {} : { download: resource.original_filename },
          ),
      );
      return response({ url: signed.signedUrl, expires_in: 60 });
    }
    const user = (await actor(req, db))!;
    await limit(db, "teacher:" + user.id, 90);
    if (action === "profile") return response(user);
    if (action === "list") {
      let query = db
        .from("learning_resources")
        .select("*")
        .not("current_version_id", "is", null)
        .order("created_at", { ascending: false });
      if (user.role !== "admin") query = query.eq("uploaded_by", user.id);
      const page = Math.max(0, Math.min(100000, Number(body.page) || 0));
      return response(await checked(query.range(page * 100, page * 100 + 99)));
    }
    if (action === "prepare") {
      const settings = await checked(
        db.from("resource_settings").select("max_file_size").single(),
      );
      const info = fileInfo(
        body.original_filename,
        body.file_size,
        body.mime_type,
        settings.max_file_size,
      );
      if (
        !/^[a-f0-9]{64}$/.test(body.sha256 || "") ||
        !/^[a-f0-9-]{36}$/i.test(body.request_id || "")
      )
        throw new ClientError("Invalid upload.");
      const result = await checked(
        db.rpc("resource_command", {
          actor: user.id,
          command: "prepare",
          body: {
            ...body,
            ext: info.ext,
            mime_type: info.mime,
            metadata: metadata(body.metadata),
          },
        }),
      );
      if (result.state !== "uploading" && result.state !== "ready")
        throw new ClientError("This upload was cancelled. Start a new upload.");
      const stored = await db.storage.from(bucket).info(result.storage_path);
      return response({
        ...result,
        object_exists: !stored.error && !!stored.data,
      });
    }
    if (action === "finalize") {
      const version = await checked(
        db
          .from("resource_versions")
          .select("*")
          .eq("id", body.upload_id)
          .maybeSingle(),
      );
      if (
        !version ||
        (user.role !== "admin" && user.id !== version.uploaded_by)
      )
        throw new ClientError("Not permitted.", 403);
      if (version.state === "ready")
        return response(
          await checked(
            db.rpc("resource_command", {
              actor: user.id,
              command: "finalize",
              body,
            }),
          ),
        );
      if (
        version.state !== "uploading" ||
        new Date(version.expires_at).getTime() < Date.now()
      )
        throw new ClientError("Upload expired. Cancel it and try again.");
      const blob = await checked(
        db.storage.from(bucket).download(version.storage_path),
      );
      const info = fileInfo(
        version.original_filename,
        blob.size,
        version.mime_type,
        HARD_LIMIT,
      );
      if (blob.size !== version.file_size)
        throw new ClientError(
          "Stored file size does not match. Cancel and retry.",
        );
      const bytes = new Uint8Array(await blob.arrayBuffer());
      validateBytes(bytes, info.ext);
      if ((await sha256(bytes)) !== version.sha256)
        throw new ClientError(
          "Stored file integrity check failed. Cancel and retry.",
        );
      return response(
        await checked(
          db.rpc("resource_command", {
            actor: user.id,
            command: "finalize",
            body,
          }),
        ),
      );
    }
    if (action === "cancel") {
      const version = await checked(
        db.rpc("resource_command", { actor: user.id, command: "cancel", body }),
      );
      const { error } = await db.storage
        .from(bucket)
        .remove([version.storage_path]);
      if (!error)
        await db
          .from("resource_versions")
          .update({ state: "purged" })
          .eq("id", version.id)
          .eq("state", "cancelled");
      return response({ cancelled: true, cleanup_pending: !!error });
    }
    if (action === "edit") body.metadata = metadata(body.metadata);
    if (["edit", "category", "settings"].includes(action))
      return response(
        await checked(
          db.rpc("resource_command", { actor: user.id, command: action, body }),
        ),
      );
    if (action === "maintenance" && user.role === "admin")
      return response(await maintenance(db));
    if (action === "manifest" && user.role === "admin") {
      const readAll = async (table: string) => {
        const rows = [];
        for (let start = 0; ; start += 1000) {
          const batch = await checked(
            db
              .from(table)
              .select("*")
              .range(start, start + 999),
          );
          rows.push(...batch);
          if (batch.length < 1000) break;
        }
        return rows;
      };
      return response({
        format: "js-lab-resource-backup-v1",
        exported_at: new Date().toISOString(),
        resources: await readAll("learning_resources"),
        versions: await readAll("resource_versions"),
        categories: await readAll("resource_categories"),
        settings: await readAll("resource_settings"),
        note: "Metadata only. Back up private Storage object bytes separately.",
      });
    }
    throw new ClientError("Operation not permitted.", 403);
  } catch (error) {
    if (error instanceof ClientError)
      return response({ error: error.message }, error.status);
    const message =
      error instanceof Error
        ? error.message
        : String((error as { message?: string })?.message || "");
    const known =
      /Resource changed|Upload reservation expired|Finish or cancel|File exceeds|Restore to draft|Upload a file first|Upload already saved|Unsupported file|file format|File must|filename|actual file|actual contents|title of|Description or tags|Invalid chapter|Invalid display order|Invalid resource status|Invalid Office/i;
    return response(
      {
        error: known.test(message)
          ? message
          : "The resource operation failed. Refresh and retry. Check your connection, permissions and provider limits.",
      },
      400,
    );
  }
});
