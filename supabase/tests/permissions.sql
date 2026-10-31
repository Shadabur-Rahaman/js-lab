\set ON_ERROR_STOP on
begin;
insert into auth.users values('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222'),('33333333-3333-4333-8333-333333333333');
insert into public.authorized_teachers values('11111111-1111-4111-8111-111111111111','admin'),('22222222-2222-4222-8222-222222222222','teacher');
set role service_role;
select public.resource_command('11111111-1111-4111-8111-111111111111','prepare','{"request_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","original_filename":"notes.pdf","file_size":123,"mime_type":"application/pdf","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","ext":"pdf","metadata":{"title":"Private draft","description":"","tags":[],"display_order":0,"status":"draft"}}') as reservation \gset
select (:'reservation'::jsonb->>'id') as upload_id,(:'reservation'::jsonb->>'resource_id') as resource_id,(:'reservation'::jsonb->>'storage_path') as object_path \gset
reset role;
set role anon;
do $$begin
 if (select count(*) from public.published_resources)<>0 then raise exception 'Draft leaked'; end if;
 begin insert into public.authorized_teachers values('33333333-3333-4333-8333-333333333333','admin');raise exception 'Self promotion allowed';exception when insufficient_privilege then null;end;
 begin insert into public.learning_resources(title,uploaded_by) values('Forged','33333333-3333-4333-8333-333333333333');raise exception 'Anonymous write allowed';exception when insufficient_privilege then null;end;
 begin perform public.resource_command('11111111-1111-4111-8111-111111111111','settings','{"max_file_size":1048576}');raise exception 'Privileged RPC exposed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
set role authenticated;
do $$begin
 begin insert into storage.objects(bucket_id,name) values('learning-resources','arbitrary.pdf');raise exception 'Unauthorized upload allowed';exception when insufficient_privilege then null;end;
 if (select count(*) from public.authorized_teachers)<>0 then raise exception 'Role directory exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
set role authenticated;
insert into storage.objects(bucket_id,name) values('learning-resources',:'object_path');
do $$begin
 if (select count(*) from storage.objects)<>0 then raise exception 'Private storage read allowed';end if;
 if (select count(*) from public.published_resources)<>0 then raise exception 'Teacher public view includes drafts';end if;
 begin insert into storage.objects(bucket_id,name) values('learning-resources','arbitrary.pdf');raise exception 'Unreserved teacher upload allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role service_role;
-- Models server verification; actual byte verification needs deployed Edge + Storage.
select public.resource_command('11111111-1111-4111-8111-111111111111','finalize',jsonb_build_object('upload_id',:'upload_id'));
select public.resource_command('11111111-1111-4111-8111-111111111111','edit',jsonb_build_object('id',:'resource_id','version',1,'metadata',jsonb_build_object('title','Published notes','description','','tags','[]'::jsonb,'display_order',0,'status','published')));
do $$begin
 begin perform public.resource_command('22222222-2222-4222-8222-222222222222','settings','{"max_file_size":1048576}');raise exception 'Teacher changed admin setting';exception when insufficient_privilege then null;end;
end $$;
reset role;
set role anon;
do $$begin if (select count(*) from public.published_resources)<>1 then raise exception 'Published metadata unavailable';end if;end $$;
reset role;
set role service_role;
-- Verify ownership, optimistic concurrency, retry idempotency, stable replacement and retention.
select set_config('test.resource_id',:'resource_id',true);
select set_config('test.upload_id',:'upload_id',true);
do $$declare resource_uuid uuid:=current_setting('test.resource_id')::uuid; old_revision integer; retry jsonb; replacement jsonb; current_row jsonb;
begin
 begin
  perform public.resource_command('22222222-2222-4222-8222-222222222222','edit',jsonb_build_object('id',resource_uuid,'version',2,'metadata',jsonb_build_object('title','Stolen','description','','tags','[]'::jsonb,'display_order',0,'status','draft')));
  raise exception 'Teacher edited another owner resource';
 exception when insufficient_privilege then null;end;
 begin
  perform public.resource_command('11111111-1111-4111-8111-111111111111','edit',jsonb_build_object('id',resource_uuid,'version',1,'metadata',jsonb_build_object('title','Stale','description','','tags','[]'::jsonb,'display_order',0,'status','draft')));
  raise exception 'Stale revision accepted';
 exception when raise_exception then if sqlerrm not like 'Resource changed.%' then raise;end if;end;
 retry:=public.resource_command('11111111-1111-4111-8111-111111111111','prepare','{"request_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}');
 if retry->>'id'<>current_setting('test.upload_id') then raise exception 'Retry duplicated upload';end if;
 replacement:=public.resource_command('11111111-1111-4111-8111-111111111111','prepare',jsonb_build_object('request_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','resource_id',resource_uuid,'version',2,'original_filename','replacement.pdf','file_size',200,'mime_type','application/pdf','sha256',repeat('b',64),'ext','pdf','metadata',jsonb_build_object('title','Replacement','description','','tags','[]'::jsonb,'display_order',0,'status','published')));
 if replacement->>'storage_path'=(select storage_path from public.learning_resources where id=resource_uuid) then raise exception 'Replacement reused object path';end if;
 current_row:=public.resource_command('11111111-1111-4111-8111-111111111111','finalize',jsonb_build_object('upload_id',replacement->>'id'));
 if (current_row->>'id')::uuid<>resource_uuid or (current_row->>'version')::integer<>3 then raise exception 'Replacement lost ID or revision';end if;
 if (select state from public.resource_versions where id=current_setting('test.upload_id')::uuid)<>'retained' then raise exception 'Old version not retained';end if;
 update public.resource_versions set retired_at=now()-interval '8 days' where id=current_setting('test.upload_id')::uuid;
 perform public.resource_cleanup_candidates();
 if (select state from public.resource_versions where id=current_setting('test.upload_id')::uuid)<>'cancelled' then raise exception 'Expired version not queued for cleanup';end if;
end $$;
select public.resource_command('11111111-1111-4111-8111-111111111111','edit',jsonb_build_object('id',:'resource_id','version',3,'metadata',jsonb_build_object('title','Trashed notes','description','','tags','[]'::jsonb,'display_order',0,'status','deleted')));
reset role;
set role anon;
do $$begin if (select count(*) from public.published_resources)<>0 then raise exception 'Trash remains public';end if;end $$;
reset role;
set role service_role;
select public.resource_command('11111111-1111-4111-8111-111111111111','edit',jsonb_build_object('id',:'resource_id','version',4,'metadata',jsonb_build_object('title','Restored draft','description','','tags','[]'::jsonb,'display_order',0,'status','draft')));
reset role;
set role anon;
do $$begin if (select count(*) from public.published_resources)<>0 then raise exception 'Restore republished without permission';end if;end $$;
reset role;
rollback;
\echo 'Resource database permission checks passed (local PostgreSQL, not hosted Supabase).'
