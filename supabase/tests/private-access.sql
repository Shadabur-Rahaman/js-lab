\set ON_ERROR_STOP on
begin;
-- Disposable PostgreSQL fixture extends the minimal fake Auth schema only.
alter table auth.users add column if not exists email text;
alter table auth.users add column if not exists email_confirmed_at timestamptz;
insert into auth.users(id,email,email_confirmed_at) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','owner@example.test',now());
insert into public.authorized_teachers values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin');
\ir ../migrations/202611040001_private_access.sql
\ir ../migrations/202611040002_private_view.sql
set role service_role;
select count(*) from public.published_resources;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','create','{"email":"student@example.test","name":"Student"}') as student \gset
select (:'student'::jsonb->>'id') as student_id \gset
select public.enrollment_authorize('student@example.test','subject') as pending \gset
do $$begin if (public.enrollment_authorize('student@example.test','subject')->>'code')<>'pending' then raise exception 'Pending allowed'; end if;end $$;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','approve',jsonb_build_object('id',:'student_id','revision',1,'days',7));
do $$begin
 if (public.enrollment_authorize('student@example.test','subject')->>'allowed')::boolean is not true then raise exception 'Approved denied'; end if;
 if (public.enrollment_authorize('student@example.test','forged-subject')->>'code')<>'identity_mismatch' then raise exception 'Identity binding failed'; end if;
 if (public.enrollment_authorize('stranger@example.test','subject-2')->>'code')<>'unapproved' then raise exception 'Unapproved allowed'; end if;
end $$;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','revoke',jsonb_build_object('id',:'student_id','revision',2));
do $$begin if (public.enrollment_authorize('student@example.test','subject')->>'code')<>'revoked' then raise exception 'Existing session bypasses revocation'; end if;end $$;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','approve',jsonb_build_object('id',:'student_id','revision',3,'days',30));
update public.student_enrollments set starts_at=now()-interval '8 days',expires_at=now()-interval '1 minute' where id=:'student_id';
do $$begin if (public.enrollment_authorize('student@example.test','subject')->>'code')<>'expired' then raise exception 'Expiry failed'; end if;end $$;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','extend',jsonb_build_object('id',:'student_id','revision',4,'days',90));
do $$begin if (public.enrollment_authorize('student@example.test','subject')->>'allowed')::boolean is not true then raise exception 'Extension failed'; end if;end $$;
select public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','suspend',jsonb_build_object('id',:'student_id','revision',5));
do $$begin if (public.enrollment_authorize('student@example.test','subject')->>'code')<>'suspended' then raise exception 'Suspension failed'; end if;end $$;
do $$begin
 begin perform public.enrollment_command((select id from public.student_enrollments where role='student'),'list');raise exception 'Student promoted';exception when insufficient_privilege then null;end;
 begin perform public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','approve','{"id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","revision":1,"days":7}');raise exception 'Admin changed through student API';exception when invalid_parameter_value then null;end;
end $$;
update public.private_access_settings set enforced=true;
reset role;
set role anon;
do $$begin
 begin perform * from public.student_enrollments;raise exception 'Enrollment directory leaked';exception when insufficient_privilege then null;end;
 begin perform public.enrollment_authorize('owner@example.test','forged');raise exception 'RPC public';exception when insufficient_privilege then null;end;
 if (select count(*) from public.resource_settings)<>0 then raise exception 'Legacy settings bypass';end if;
 if (select count(*) from public.resource_categories)<>0 then raise exception 'Legacy categories bypass';end if;
end $$;
reset role;
set role authenticated;
do $$begin
 begin update public.student_enrollments set role='admin',expires_at=now()+interval '1 year';raise exception 'Self promotion/extension allowed';exception when insufficient_privilege then null;end;
 begin perform public.enrollment_command('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','list');raise exception 'RPC callable by student';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
\echo 'PASS private enrollment database checks (rolled back fixtures)'
