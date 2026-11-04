-- Additive preparation. The legacy public library remains available until the
-- explicitly approved cutover sets enforced=true. No resource rows are changed.
create table public.private_access_settings (
 id boolean primary key default true check(id), enforced boolean not null default false
);
insert into public.private_access_settings values(true,false);
create table public.student_enrollments (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 email text not null unique check(email=lower(trim(email)) and length(email)<=254),
 role text not null default 'student' check(role in ('admin','student')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','suspended','revoked')),
 starts_at timestamptz, expires_at timestamptz, revoked_at timestamptz,
 access_subject text unique, email_verified_at timestamptz, last_activity_at timestamptz,
 revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(role='admin' or expires_at is null or starts_at<expires_at)
);
create table public.enrollment_audit_log (
 id bigint generated always as identity primary key, actor uuid, student_id uuid,
 action text not null, at timestamptz not null default now(), detail jsonb not null default '{}'
);
-- Reuse only already-authorized, confirmed administrators. Never bootstrap by
-- an email supplied by a browser, or make the first visitor an administrator.
insert into public.student_enrollments(id,name,email,role,status)
 select u.id,'Administrator',lower(u.email),'admin','approved'
 from auth.users u join public.authorized_teachers t on t.user_id=u.id
 where t.role='admin' and u.email_confirmed_at is not null and u.email is not null;
alter table public.private_access_settings enable row level security;
alter table public.student_enrollments enable row level security;
alter table public.enrollment_audit_log enable row level security;
revoke all on public.private_access_settings,public.student_enrollments,public.enrollment_audit_log from public,anon,authenticated;
grant all on public.private_access_settings,public.student_enrollments,public.enrollment_audit_log to service_role;
grant usage,select on sequence public.enrollment_audit_log_id_seq to service_role;

create function public.private_resources_enforced() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select enforced from public.private_access_settings where id),true)
$$;
revoke all on function public.private_resources_enforced() from public;
grant execute on function public.private_resources_enforced() to anon,authenticated,service_role;
drop policy categories_read on public.resource_categories;
drop policy settings_read on public.resource_settings;
drop policy published_read on public.learning_resources;
create policy categories_read on public.resource_categories for select to anon,authenticated using(not public.private_resources_enforced());
create policy settings_read on public.resource_settings for select to anon,authenticated using(not public.private_resources_enforced());
create policy published_read on public.learning_resources for select to anon,authenticated using(not public.private_resources_enforced() and status='published' and deleted_at is null and current_version_id is not null);
drop policy reserved_resource_upload on storage.objects;
create policy reserved_resource_upload on storage.objects for insert to authenticated
 with check(bucket_id='learning-resources' and not public.private_resources_enforced() and public.resource_can_upload(name));

create function public.enrollment_authorize(verified_email text, verified_subject text) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare m public.student_enrollments; reason text;
begin
 if verified_subject is null or length(verified_subject) not between 1 and 255 then
  return jsonb_build_object('allowed',false,'code','unauthenticated');
 end if;
 select * into m from public.student_enrollments where email=lower(trim(verified_email)) for update;
 if not found then reason:='unapproved';
 elsif m.access_subject is not null and m.access_subject<>verified_subject then reason:='identity_mismatch';
 elsif m.status<>'approved' then reason:=m.status;
 elsif m.role='student' and (m.starts_at is null or m.expires_at is null) then reason:='pending';
 elsif m.role='student' and m.starts_at>now() then reason:='not_started';
 elsif m.role='student' and m.expires_at<=now() then reason:='expired';
 end if;
 if reason is not null then
  -- Bounded denial logging; still deny when the log's rate limit is exhausted.
  if public.resource_rate('denied:'||md5(coalesce(verified_email,'')),1,60) then
   insert into public.enrollment_audit_log(student_id,action,detail) values(m.id,'access_denied',jsonb_build_object('reason',reason));
  end if;
  return jsonb_build_object('allowed',false,'code',reason);
 end if;
 if m.access_subject is null then
  insert into public.enrollment_audit_log(student_id,action) values(m.id,'identity_verified');
 end if;
 update public.student_enrollments set access_subject=coalesce(access_subject,verified_subject),email_verified_at=coalesce(email_verified_at,now()),
 last_activity_at=case when last_activity_at is null or last_activity_at<now()-interval '1 minute' then now() else last_activity_at end
 where id=m.id returning * into m;
 return jsonb_build_object('allowed',true,'member',jsonb_build_object('id',m.id,'name',m.name,'email',m.email,'role',m.role,'expires_at',m.expires_at),'server_time',now());
end $$;

create function public.enrollment_command(admin_id uuid, command text, body jsonb default '{}') returns jsonb
 language plpgsql security definer set search_path='' as $$
declare a public.student_enrollments; m public.student_enrollments; before_row jsonb; start_time timestamptz; end_time timestamptz; email_value text;
begin
 select * into a from public.student_enrollments where id=admin_id for update;
 if not found or a.role<>'admin' or a.status<>'approved' then raise exception 'Administrator required' using errcode='42501'; end if;
 if command='list' then
  return coalesce((select jsonb_agg(to_jsonb(e)-'access_subject' order by e.created_at desc) from public.student_enrollments e),'[]');
 elsif command='audit' then
  return coalesce((select jsonb_agg(to_jsonb(l) order by l.id desc) from (select * from public.enrollment_audit_log order by id desc limit 200) l),'[]');
 elsif command='create' then
  email_value:=lower(trim(body->>'email'));
  if email_value is null or length(email_value)>254 or email_value!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(trim(coalesce(body->>'name',''))) not between 1 and 120 then raise exception 'Invalid student details' using errcode='22023'; end if;
  if (select count(*) from public.student_enrollments)>1000 then raise exception 'Enrollment limit reached'; end if;
  insert into public.student_enrollments(name,email) values(trim(body->>'name'),email_value) returning * into m;
 else
  select * into m from public.student_enrollments where id=(body->>'id')::uuid for update;
  if not found or m.role<>'student' then raise exception 'Student not found' using errcode='22023'; end if;
  if m.revision<>coalesce((body->>'revision')::integer,0) then raise exception 'Record changed. Refresh first' using errcode='40001'; end if;
  before_row:=to_jsonb(m)-'access_subject';
  if command in ('approve','extend') then
   start_time:=coalesce((body->>'starts_at')::timestamptz,now());
   if body ? 'days' then
    if (body->>'days')::integer not in (7,30,90) then raise exception 'Invalid duration' using errcode='22023'; end if;
    end_time:=case when command='extend' then greatest(now(),coalesce(m.expires_at,now())) else start_time end+make_interval(days=>(body->>'days')::integer);
   else end_time:=(body->>'expires_at')::timestamptz; end if;
   if end_time is null or end_time<=start_time or end_time<=now() or end_time>now()+interval '5 years' then raise exception 'Invalid enrollment dates' using errcode='22023'; end if;
   update public.student_enrollments set status='approved',starts_at=case when command='extend' then coalesce(starts_at,start_time) else start_time end,expires_at=end_time,revoked_at=null where id=m.id;
  elsif command in ('suspend','revoke','reject') then
   update public.student_enrollments set status=case command when 'suspend' then 'suspended' when 'revoke' then 'revoked' else 'rejected' end,
    revoked_at=case when command='revoke' then now() else revoked_at end where id=m.id;
  else raise exception 'Unknown enrollment command' using errcode='22023'; end if;
  update public.student_enrollments set revision=revision+1,updated_at=now() where id=m.id returning * into m;
 end if;
 insert into public.enrollment_audit_log(actor,student_id,action,detail) values(a.id,m.id,command,jsonb_build_object('before',before_row,'after',to_jsonb(m)-'access_subject'));
 return to_jsonb(m)-'access_subject';
end $$;
revoke all on function public.enrollment_authorize(text,text),public.enrollment_command(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.enrollment_authorize(text,text),public.enrollment_command(uuid,text,jsonb) to service_role;
