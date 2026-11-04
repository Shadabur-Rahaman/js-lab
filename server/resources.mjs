import {HARD_LIMIT,fileInfo,metadata,sha256,validateBytes} from '../supabase/functions/_shared/validation.mjs';
import {AccessError} from './access.mjs';
const bucket='learning-resources';
const ClientError=class extends AccessError {constructor(message,status=400){super(message,status)}};
async function checked(result){const {data,error}=await result;if(error)throw error;if(data==null)throw new AccessError('not_found',404);return data;}
function response(data,status=200){return Response.json(data,{status});}
export async function resourceAction(input,db,user){
 const {action,...body}=input;
 if(action==='catalogs')return response({categories:await checked(db.from('resource_categories').select('*').order('display_order')),max:(await checked(db.from('resource_settings').select('max_file_size').single())).max_file_size});
 if(action==='published'){const page=Math.max(0,Math.min(100000,Number(body.page)||0));return response(await checked(db.from('published_resources').select('*').order('display_order').order('created_at',{ascending:false}).order('id').range(page*500,page*500+499)));}
 if(action==='link'){if(!/^[a-f0-9-]{36}$/i.test(body.id||''))throw new AccessError('invalid_request',400);return response({url:'/api/files/'+body.id+(body.preview?'?preview=1':'')});}
 if(user.role!=='admin')throw new AccessError('administrator_required');
 if(action==='profile')return response(user);
 try {
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
      const readAll = async (table) => {
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
 }catch(e){if(e instanceof AccessError)throw e;throw new AccessError('resource_operation_failed',400);}
}
export async function downloadFile(id,preview,db,user,head=false){
 const resource=await checked(db.from('learning_resources').select('*').eq('id',id).maybeSingle());
 if(resource.status==='deleted'||(user.role!=='admin'&&resource.status!=='published'))throw new AccessError('not_found',404);
 const version=await checked(db.from('resource_versions').select('state').eq('id',resource.current_version_id).maybeSingle());
 if(version.state!=='ready')throw new AccessError('not_found',404);
 const headers={'Content-Type':resource.mime_type,'Content-Length':String(resource.file_size),'Content-Disposition':(preview?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(resource.original_filename)};
 if(head)return new Response(null,{headers});
 const blob=await checked(db.storage.from(bucket).download(resource.storage_path));
 return new Response(blob.stream(),{headers});
}
export async function uploadBytes(req,id,db,user){
 const v=await checked(db.from('resource_versions').select('*').eq('id',id).maybeSingle());
 if(v.uploaded_by!==user.id||v.state!=='uploading'||new Date(v.expires_at)<=new Date()||v.file_size>HARD_LIMIT)throw new AccessError('upload_unavailable',403);
 const reader=req.body?.getReader(),parts=[];let length=0;
 if(!reader)throw new AccessError('invalid_file',400);
 for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>v.file_size||length>HARD_LIMIT){await reader.cancel();throw new AccessError('file_too_large',413)}parts.push(value);}
 if(length!==v.file_size)throw new AccessError('file_size_mismatch',400);
 const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
 const info=fileInfo(v.original_filename,length,v.mime_type,HARD_LIMIT);validateBytes(bytes,info.ext);
 if(await sha256(bytes)!==v.sha256)throw new AccessError('file_checksum_mismatch',400);
 const stored=await db.storage.from(bucket).upload(v.storage_path,bytes,{contentType:info.mime,upsert:false,cacheControl:'0'});
 if(stored.error)throw new AccessError('upload_failed',400);
 return response({uploaded:true});
}

async function maintenance(db) {
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

