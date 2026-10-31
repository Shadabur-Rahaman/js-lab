begin;
create table public.authorized_teachers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','teacher'))
);
create table public.resource_categories (
 id uuid primary key default gen_random_uuid(), name text not null unique check(length(name) between 1 and 80),
 display_order integer not null default 0, archived boolean not null default false
);
insert into public.resource_categories(name,display_order) select name, ordinality::integer from unnest(array[
 'Lecture Notes','PowerPoint Presentations','Assignments','Worksheets','Practice Questions','Quizzes','Cheat Sheets','Reference Materials','Project Files','Additional Reading']) with ordinality as c(name,ordinality);
create table public.resource_settings (
 id boolean primary key default true check(id), max_file_size bigint not null default 26214400 check(max_file_size between 1048576 and 52428800)
);
insert into public.resource_settings default values;
create table public.learning_resources (
 id uuid primary key default gen_random_uuid(), title text not null check(length(title) between 1 and 160), description text not null default '' check(length(description)<=4000),
 original_filename text, storage_path text, mime_type text, file_size bigint,
 category_id uuid references public.resource_categories(id), chapter_id integer check(chapter_id between 1 and 10000), lesson_id text,
 tags text[] not null default '{}', status text not null default 'draft' check(status in ('draft','published','archived','deleted')),
 display_order integer not null default 0, uploaded_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz, deleted_at timestamptz,
 version integer not null default 0, current_version_id uuid,
 check(status <> 'published' or (storage_path is not null and current_version_id is not null and file_size > 0)),
 check(cardinality(tags)<=12), check(abs(display_order::bigint)<=100000)
);
create table public.resource_versions (
 id uuid primary key, resource_id uuid not null references public.learning_resources(id), storage_path text not null unique,
 original_filename text not null, mime_type text not null, file_size bigint not null check(file_size between 1 and 52428800),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'), uploaded_by uuid not null references auth.users(id),
 state text not null default 'uploading' check(state in ('uploading','ready','retained','cancelled','purged')),
 base_revision integer not null, request_id uuid not null unique, metadata jsonb not null,
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '1 hour', retired_at timestamptz
);
alter table public.learning_resources add constraint resource_current_version foreign key(current_version_id) references public.resource_versions(id);
create unique index one_pending_upload on public.resource_versions(resource_id) where state='uploading';
create index resource_public_index on public.learning_resources(status,chapter_id,category_id,created_at desc);
create index resource_owner_index on public.learning_resources(uploaded_by);
create table public.resource_audit_log (
 id bigint generated always as identity primary key, actor uuid, resource_id uuid, action text not null, at timestamptz not null default now(), detail jsonb not null default '{}'
);
create table public.resource_rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);

create function public.is_resource_teacher(actor uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.authorized_teachers where user_id=actor)
$$;
create function public.is_resource_admin(actor uuid default auth.uid()) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.authorized_teachers where user_id=actor and role='admin')
$$;
create function public.resource_can_upload(path text) returns boolean language sql stable security definer set search_path='' as $$
 select public.is_resource_teacher(auth.uid()) and exists(select 1 from public.resource_versions v where v.storage_path=path and v.uploaded_by=auth.uid() and v.state='uploading' and v.expires_at>now())
$$;
alter table public.authorized_teachers enable row level security;
alter table public.resource_categories enable row level security;
alter table public.resource_settings enable row level security;
alter table public.learning_resources enable row level security;
alter table public.resource_versions enable row level security;
alter table public.resource_audit_log enable row level security;
alter table public.resource_rate_limits enable row level security;
create policy teacher_self on public.authorized_teachers for select to authenticated using(user_id=auth.uid());
create policy categories_read on public.resource_categories for select to anon,authenticated using(true);
create policy settings_read on public.resource_settings for select to anon,authenticated using(true);
create policy published_read on public.learning_resources for select to anon,authenticated using(status='published' and deleted_at is null and current_version_id is not null);
-- Clients cannot read draft metadata or any object paths, even when signed in.
-- Management and all mutations go through the authenticated server API below.
revoke all on public.authorized_teachers,public.learning_resources,public.resource_versions,public.resource_categories,public.resource_settings,public.resource_audit_log,public.resource_rate_limits from anon,authenticated;
grant select on public.authorized_teachers to authenticated;
grant select on public.resource_categories,public.resource_settings to anon,authenticated;
grant select(id,title,description,original_filename,mime_type,file_size,category_id,chapter_id,lesson_id,tags,status,display_order,created_at,updated_at,published_at,version) on public.learning_resources to anon,authenticated;
create view public.published_resources with(security_invoker=true) as
 select id,title,description,original_filename,mime_type,file_size,category_id,chapter_id,lesson_id,tags,display_order,created_at,updated_at,published_at,version
 from public.learning_resources where status='published';
grant select on public.published_resources to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values(
 'learning-resources','learning-resources',false,52428800,array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv','text/markdown','image/jpeg','image/png','image/webp','image/gif','application/zip']);
create policy reserved_resource_upload on storage.objects for insert to authenticated
 with check(bucket_id='learning-resources' and public.resource_can_upload(name));
-- No Storage SELECT/UPDATE/DELETE policy: users cannot sign arbitrary paths or overwrite files.

create function public.resource_rate(key_value text, maximum integer, seconds integer) returns boolean
 language plpgsql security definer set search_path='' as $$
declare count_value integer;
begin
 insert into public.resource_rate_limits(key,hits,expires_at) values(key_value,1,now()+make_interval(secs=>seconds))
 on conflict(key) do update set hits=case when public.resource_rate_limits.expires_at<now() then 1 else public.resource_rate_limits.hits+1 end,
 expires_at=case when public.resource_rate_limits.expires_at<now() then now()+make_interval(secs=>seconds) else public.resource_rate_limits.expires_at end
 returning hits into count_value;
 return count_value<=maximum;
end $$;

create function public.resource_command(actor uuid, command text, body jsonb) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare r public.learning_resources; v public.resource_versions; data jsonb; identifier uuid; is_admin boolean; pending integer;
begin
 if not public.is_resource_teacher(actor) then raise exception 'Teacher permission required' using errcode='42501'; end if;
 is_admin:=public.is_resource_admin(actor);
 if command='prepare' then
  select * into v from public.resource_versions where request_id=(body->>'request_id')::uuid;
  if found then
   if v.uploaded_by<>actor then raise exception 'Not permitted' using errcode='42501'; end if;
   return to_jsonb(v);
  end if;
  -- Serialize reservations per teacher to enforce a bounded number of active uploads.
  perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
  update public.resource_versions set state='cancelled',retired_at=now() where state='uploading' and expires_at<now();
  select count(*) into pending from public.resource_versions where uploaded_by=actor and state='uploading' and expires_at>now();
  if pending>=3 then raise exception 'Finish or cancel existing uploads first'; end if;
  if (body->>'file_size')::bigint > (select max_file_size from public.resource_settings) then raise exception 'File exceeds the configured limit'; end if;
  data:=body->'metadata';
  if nullif(body->>'resource_id','') is null then
   insert into public.learning_resources(title,uploaded_by) values(data->>'title',actor) returning * into r;
  else
   select * into r from public.learning_resources where id=(body->>'resource_id')::uuid for update;
   if not found or (not is_admin and r.uploaded_by<>actor) then raise exception 'Not permitted' using errcode='42501'; end if;
   if r.status='deleted' or r.version<>(body->>'version')::integer then raise exception 'Resource changed. Refresh before replacing.'; end if;
  end if;
  identifier:=gen_random_uuid();
  insert into public.resource_versions(id,resource_id,storage_path,original_filename,mime_type,file_size,sha256,uploaded_by,base_revision,request_id,metadata)
   values(identifier,r.id,'resources/'||r.id||'/'||identifier||'.'||(body->>'ext'),body->>'original_filename',body->>'mime_type',(body->>'file_size')::bigint,body->>'sha256',actor,r.version,(body->>'request_id')::uuid,data) returning * into v;
  insert into public.resource_audit_log(actor,resource_id,action) values(actor,r.id,'upload_reserved');
  return to_jsonb(v);
 elsif command in ('finalize','cancel') then
  select * into v from public.resource_versions where id=(body->>'upload_id')::uuid for update;
  if not found or (not is_admin and v.uploaded_by<>actor) then raise exception 'Not permitted' using errcode='42501'; end if;
  select * into r from public.learning_resources where id=v.resource_id for update;
  if command='cancel' then
   if v.state='ready' then raise exception 'Upload already saved'; end if;
   update public.resource_versions set state='cancelled',retired_at=now() where id=v.id and state='uploading';
   return to_jsonb(v);
  end if;
  if r.current_version_id=v.id and v.state='ready' then return to_jsonb(r); end if;
  if v.state<>'uploading' or v.expires_at<now() then raise exception 'Upload reservation expired. Cancel and upload again.'; end if;
  if r.version<>v.base_revision or r.status='deleted' then raise exception 'Resource changed. Cancel this upload and refresh.'; end if;
  data:=v.metadata;
  update public.resource_versions set state='retained',retired_at=now() where id=r.current_version_id;
  update public.resource_versions set state='ready' where id=v.id;
  update public.learning_resources set title=data->>'title',description=data->>'description',tags=array(select jsonb_array_elements_text(data->'tags')),
   category_id=nullif(data->>'category_id','')::uuid,chapter_id=(data->>'chapter_id')::integer,lesson_id=data->>'lesson_id',display_order=(data->>'display_order')::integer,
   status=case when data->>'status' in ('published','archived') then data->>'status' else 'draft' end,
   published_at=case when data->>'status'='published' then now() else null end, original_filename=v.original_filename,storage_path=v.storage_path,mime_type=v.mime_type,file_size=v.file_size,
   current_version_id=v.id,version=version+1,updated_at=now() where id=r.id returning * into r;
  insert into public.resource_audit_log(actor,resource_id,action,detail) values(actor,r.id,'file_saved',jsonb_build_object('status',r.status,'revision',r.version,'version_id',v.id));
  return to_jsonb(r);
 elsif command='edit' then
  select * into r from public.learning_resources where id=(body->>'id')::uuid for update;
  if not found or (not is_admin and r.uploaded_by<>actor) then raise exception 'Not permitted' using errcode='42501'; end if;
  if r.version<>(body->>'version')::integer then raise exception 'Resource changed. Refresh before saving.'; end if;
  data:=body->'metadata';
  if r.status='deleted' and (data->>'status'<>'draft' or r.deleted_at<now()-interval '30 days') then raise exception 'Restore to draft within 30 days first'; end if;
  if r.current_version_id is null then raise exception 'Upload a file first'; end if;
  update public.learning_resources set title=data->>'title',description=data->>'description',tags=array(select jsonb_array_elements_text(data->'tags')),
   category_id=nullif(data->>'category_id','')::uuid,chapter_id=(data->>'chapter_id')::integer,lesson_id=data->>'lesson_id',display_order=(data->>'display_order')::integer,
   status=data->>'status',deleted_at=case when data->>'status'='deleted' then now() else null end,
   published_at=case when data->>'status'='published' then coalesce(published_at,now()) else null end,updated_at=now(),version=version+1
   where id=r.id returning * into r;
  insert into public.resource_audit_log(actor,resource_id,action,detail) values(actor,r.id,'metadata_updated',jsonb_build_object('status',r.status,'revision',r.version));
  return to_jsonb(r);
 elsif command='category' and is_admin then
  if nullif(body->>'id','') is null then
   insert into public.resource_categories(name,display_order) values(body->>'name',coalesce((body->>'display_order')::integer,0)) returning to_jsonb(resource_categories.*) into data;
  else
   update public.resource_categories set name=body->>'name',archived=coalesce((body->>'archived')::boolean,false),display_order=coalesce((body->>'display_order')::integer,0) where id=(body->>'id')::uuid returning to_jsonb(resource_categories.*) into data;
  end if;
  insert into public.resource_audit_log(actor,action,detail) values(actor,'category_updated',data);
  return data;
 elsif command='settings' and is_admin then
  update public.resource_settings set max_file_size=(body->>'max_file_size')::bigint returning to_jsonb(resource_settings.*) into data;
  insert into public.resource_audit_log(actor,action,detail) values(actor,'settings_updated',data);
  return data;
 end if;
 raise exception 'Unsupported or unauthorized operation' using errcode='42501';
end $$;

-- Only the Edge service can call privileged commands, always supplying a verified user.
revoke all on function public.resource_command(uuid,text,jsonb),public.resource_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.resource_command(uuid,text,jsonb),public.resource_rate(text,integer,integer) to service_role;
revoke all on function public.is_resource_teacher(uuid),public.is_resource_admin(uuid),public.resource_can_upload(text) from public;
grant execute on function public.is_resource_teacher(uuid),public.is_resource_admin(uuid),public.resource_can_upload(text) to authenticated,service_role;
grant all on public.authorized_teachers,public.resource_categories,public.resource_settings,public.learning_resources,public.resource_versions,public.resource_audit_log,public.resource_rate_limits to service_role;
grant usage,select on sequence public.resource_audit_log_id_seq to service_role;
create function public.resource_cleanup_candidates() returns setof public.resource_versions
 language plpgsql security definer set search_path='' as $$
begin
 -- Lock and invalidate first, so an expired upload or purged trash cannot race a restore/finalize.
 update public.resource_versions set state='cancelled',retired_at=now() where state='uploading' and expires_at<now();
 update public.learning_resources set current_version_id=null,storage_path=null,version=version+1
  where status='deleted' and deleted_at<now()-interval '30 days' and current_version_id is not null;
 update public.resource_versions v set state='cancelled',retired_at=now()
  where (state='retained' and retired_at<now()-interval '7 days')
  or (state in ('ready','retained') and exists(select 1 from public.learning_resources r where r.id=v.resource_id and r.status='deleted' and r.deleted_at<now()-interval '30 days'));
 return query select * from public.resource_versions where state='cancelled' order by retired_at limit 100;
end $$;
revoke all on function public.resource_cleanup_candidates() from public,anon,authenticated;
grant execute on function public.resource_cleanup_candidates() to service_role;
commit;
