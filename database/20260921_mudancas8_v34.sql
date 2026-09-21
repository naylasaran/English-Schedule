begin;

-- Preserve the existing attendance/content rules, changing only the requested cases.
do $$ declare original text; revised text; begin
 original:=pg_get_functiondef('public.register_attendance(uuid,text,text)'::regprocedure);
 revised:=regexp_replace(original,'v_duration\s*:=[^;]*;','v_duration := mod((extract(epoch from (v_lesson.end_time-v_lesson.start_time))/60)::integer+1440,1440);','s');
 if revised=original then raise exception 'Review attendance duration definition';end if;
 execute revised;
 original:=pg_get_functiondef('public.save_teacher_occurrence_attendance(date,time,text,text,text)'::regprocedure);
 revised:=regexp_replace(original,'if\s*\(\s*p_date[^;]*;\s*end if;','','s');
 if revised=original then raise exception 'Review attendance time guard';end if;
 revised:=replace(revised,'p_attendance_status <> ''makeup''','p_attendance_status not in (''makeup'',''absent'')');
 revised:=replace(revised,'Para uma reposicao, use o status Reposicao realizada.','Selecione reposição realizada ou falta à reposição.');
 execute revised;
 original:=pg_get_functiondef('public.resolve_teacher_occurrence_for_attendance(date,time)'::regprocedure);
 revised:=replace(original,'p_start_time < l.end_time','(p_start_time < l.end_time or l.end_time = time ''00:00'')');
 revised:=replace(revised,'p_start_time < r.end_time','(p_start_time < r.end_time or r.end_time = time ''00:00'')');
 if revised=original then raise exception 'Review midnight occurrence lookup';end if;
 execute revised;
 original:=pg_get_functiondef('public.get_teacher_occurrence_for_attendance(date,time)'::regprocedure);
 revised:=regexp_replace(original,'\(\s*\(\s*p_date[^;]*\) as can_register','true as can_register','s');
 if revised=original then raise exception 'Review attendance availability';end if;
 execute revised;
end; $$;

-- The prior follow-up was already applied to production; persist the same rule here.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('public.apply_due_teacher_plans_v33()'::regprocedure);
 definition:=replace(definition,'active=true,account_status=''active'',','');
 execute definition;
end; $$;


create table public.schedule_requests_v34 (
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students(id), teacher_id uuid not null references public.teachers(id),
 old_day integer not null check(old_day between 0 and 6), old_time time not null,
 new_day integer not null check(new_day between 0 and 6), new_time time not null, duration integer not null check(duration in (30,60,90,120)),
 needs_guardian boolean not null, guardian_approved_by uuid, teacher_approved_by uuid,
 effective_date date not null, status text not null default 'pending' check(status in ('pending','approved','applied','rejected','conflict')),
 created_at timestamptz not null default now(), applied_at timestamptz, detail text
);
create unique index schedule_request_open_v34 on public.schedule_requests_v34(student_id) where status in ('pending','approved','conflict');
alter table public.schedule_requests_v34 enable row level security;
revoke all on public.schedule_requests_v34 from public,anon,authenticated;

create function public.can_view_schedule_request_v34(p_student uuid)
returns boolean language sql stable security definer set search_path=public,auth as $$
 select exists(select 1 from public.students s where s.id=p_student and s.active and public.erp_teacher_access_enabled_v26(s.teacher_id)
 and (s.teacher_id=public.get_current_teacher_id() or s.id=public.get_current_student_id() or exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id)));
$$;
revoke all on function public.can_view_schedule_request_v34(uuid) from public,anon,authenticated;

create function public.validate_schedule_request_v34(p_request public.schedule_requests_v34)
returns void language plpgsql security definer set search_path=public,auth as $$
declare n integer; src time; dest time;
begin
 if not exists(select 1 from public.students where id=p_request.student_id and teacher_id=p_request.teacher_id and active and class_duration_minutes=p_request.duration) then raise exception 'Cadastro ou duração do aluno mudou. Envie uma nova solicitação.';end if;
 if p_request.new_day=p_request.old_day and p_request.new_time=p_request.old_time then raise exception 'Escolha um horário diferente.';end if;
 if extract(minute from p_request.new_time)::integer not in (0,30) or extract(second from p_request.new_time)<>0 or extract(epoch from p_request.new_time)/60+p_request.duration>1440 then raise exception 'Horário inválido para a duração da aula.';end if;
 for n in 0..p_request.duration/30-1 loop
  src:=(p_request.old_time+make_interval(mins=>30*n))::time;
  dest:=(p_request.new_time+make_interval(mins=>30*n))::time;
  if not exists(select 1 from public.weekly_schedule w where w.teacher_id=p_request.teacher_id and w.student_id=p_request.student_id and w.status='lesson' and w.day_of_week=p_request.old_day and w.start_time=src) then raise exception 'O horário de origem mudou. Envie uma nova solicitação.';end if;
  if not exists(select 1 from public.weekly_schedule w where w.teacher_id=p_request.teacher_id and w.day_of_week=p_request.new_day and w.start_time=dest and (w.status='free' or (w.student_id=p_request.student_id and w.status='lesson' and w.day_of_week=p_request.old_day and w.start_time>=p_request.old_time and extract(epoch from w.start_time)/60<extract(epoch from p_request.old_time)/60+p_request.duration))) then raise exception 'O novo horário não está livre na agenda do professor.';end if;
  if exists(select 1 from public.weekly_schedule w where w.teacher_id=p_request.teacher_id and w.day_of_week=p_request.new_day and w.start_time=dest and w.status<>'free' and not(w.status='lesson' and w.student_id=p_request.student_id and w.day_of_week=p_request.old_day and w.start_time>=p_request.old_time and extract(epoch from w.start_time)/60<extract(epoch from p_request.old_time)/60+p_request.duration)) then raise exception 'O novo horário está ocupado.';end if;
  if exists(select 1 from public.reservations r where r.teacher_id=p_request.teacher_id and r.status='active' and r.reservation_date>=p_request.effective_date and extract(dow from r.reservation_date)::integer=p_request.new_day and dest>=r.start_time and (dest<r.end_time or r.end_time='00:00')) then raise exception 'Existe uma reposição agendada no novo horário.';end if;
  if exists(select 1 from public.weekly_schedule_exceptions e where e.teacher_id=p_request.teacher_id and e.exception_date>=p_request.effective_date and extract(dow from e.exception_date)::integer=p_request.new_day and e.start_time=dest and e.status<>'free') then raise exception 'Existe uma alteração de agenda no novo horário.';end if;
 end loop;
end; $$;
revoke all on function public.validate_schedule_request_v34(public.schedule_requests_v34) from public,anon,authenticated;

create function public.request_schedule_change_v34(p_student_id uuid,p_old_day integer,p_old_time time,p_new_day integer,p_new_time time)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare r public.schedule_requests_v34; s public.students;
begin
 if not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 select * into s from public.students where id=p_student_id;
 if s.id is distinct from public.get_current_student_id() and not exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id) then raise exception 'A solicitação deve ser enviada pelo aluno ou responsável.';end if;
 perform 1 from public.teachers where id=s.teacher_id for update;
 r.student_id:=s.id;r.teacher_id:=s.teacher_id;r.duration:=s.class_duration_minutes;
 r.old_day:=p_old_day;r.old_time:=p_old_time;r.new_day:=p_new_day;r.new_time:=p_new_time;
 r.effective_date:=(date_trunc('week',timezone('America/Sao_Paulo',now()))+interval '1 week')::date;
 r.needs_guardian:=s.birth_date is null or s.birth_date>(timezone('America/Sao_Paulo',now())::date-interval '18 years')::date;
 perform public.validate_schedule_request_v34(r);
 insert into public.schedule_requests_v34(student_id,teacher_id,old_day,old_time,new_day,new_time,duration,needs_guardian,guardian_approved_by,effective_date)
 values(s.id,s.teacher_id,p_old_day,p_old_time,p_new_day,p_new_time,r.duration,r.needs_guardian,case when exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id) then auth.uid() end,r.effective_date) returning id into r.id;
 return r.id;
end; $$;

create function public.review_schedule_change_v34(p_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.schedule_requests_v34; is_teacher boolean; is_guardian boolean;
begin
 select * into r from public.schedule_requests_v34 where id=p_id for update;
 if not found or not public.can_view_schedule_request_v34(r.student_id) then raise exception 'Acesso não permitido.';end if;
 if r.status not in ('pending','approved','conflict') then raise exception 'Solicitação já encerrada.';end if;
 is_teacher:=r.teacher_id=public.get_current_teacher_id();
 is_guardian:=exists(select 1 from public.get_my_guardian_students() g where g.student_id=r.student_id);
 if not coalesce(is_teacher,false) and not is_guardian then raise exception 'Somente o professor ou responsável pode confirmar.';end if;
 if not p_approve then update public.schedule_requests_v34 set status='rejected',detail='Solicitação recusada.' where id=p_id;return;end if;
 perform 1 from public.teachers where id=r.teacher_id for update;
 r.effective_date:=(date_trunc('week',timezone('America/Sao_Paulo',now()))+interval '1 week')::date;
 perform public.validate_schedule_request_v34(r);
 if is_teacher then r.teacher_approved_by:=auth.uid();else r.guardian_approved_by:=auth.uid();end if;
 update public.schedule_requests_v34 set teacher_approved_by=r.teacher_approved_by,guardian_approved_by=r.guardian_approved_by,effective_date=r.effective_date,
 status=case when r.teacher_approved_by is not null and (not r.needs_guardian or r.guardian_approved_by is not null) then 'approved' else 'pending' end,detail=null where id=p_id;
end; $$;

create function public.apply_schedule_requests_v34()
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.schedule_requests_v34; w record; n integer; dest time; slot_id uuid; today date:=timezone('America/Sao_Paulo',now())::date;
begin
 for r in select * from public.schedule_requests_v34 where status='approved' and effective_date<=today order by created_at for update skip locked loop
  begin
   perform 1 from public.teachers where id=r.teacher_id for update;
   if not public.erp_teacher_access_enabled_v26(r.teacher_id) then raise exception 'Acesso do professor indisponível.';end if;
   if r.teacher_approved_by is null or (r.needs_guardian and not exists(select 1 from public.guardian_students g where g.student_id=r.student_id and g.guardian_profile_id=r.guardian_approved_by)) then raise exception 'Aprovação necessária indisponível.';end if;
   perform public.validate_schedule_request_v34(r);
   for w in select * from public.weekly_schedule where teacher_id=r.teacher_id and student_id=r.student_id and status='lesson' and day_of_week=r.old_day and start_time>=r.old_time and extract(epoch from start_time)/60<extract(epoch from r.old_time)/60+r.duration for update loop
    perform public.archive_weekly_slot_state(w.id,r.effective_date);
    update public.weekly_schedule set status='free',student_id=null,effective_from=r.effective_date where id=w.id;
   end loop;
   for n in 0..r.duration/30-1 loop
    dest:=(r.new_time+make_interval(mins=>n*30))::time;
    select id into slot_id from public.weekly_schedule where teacher_id=r.teacher_id and day_of_week=r.new_day and start_time=dest and status='free' order by id limit 1 for update;
    if not found then raise exception 'Novo horário indisponível.';end if;
    perform public.archive_weekly_slot_state(slot_id,r.effective_date);
    update public.weekly_schedule set status='lesson',student_id=r.student_id,effective_from=r.effective_date where id=slot_id;
   end loop;
   update public.lessons l set status='cancelled',superseded_schedule_v31=true,billable_original_v26=false
   where l.teacher_id=r.teacher_id and l.student_id=r.student_id and l.lesson_date>=r.effective_date and extract(dow from l.lesson_date)::integer=r.old_day and l.start_time=r.old_time and l.status='scheduled' and l.reservation_id is null
    and not exists(select 1 from public.attendance a where a.lesson_id=l.id)
    and not exists(select 1 from public.lesson_reschedules x where x.teacher_id=r.teacher_id and x.student_id=r.student_id and ((x.original_date=l.lesson_date and x.original_start_time=l.start_time) or (x.new_date=l.lesson_date and x.new_start_time=l.start_time)))
    and not exists(select 1 from public.weekly_schedule_exceptions e where e.teacher_id=r.teacher_id and e.exception_date=l.lesson_date and e.start_time=l.start_time);
   update public.schedule_requests_v34 set status='applied',applied_at=now(),detail=null where id=r.id;
  exception when others then
   update public.schedule_requests_v34 set status='conflict',teacher_approved_by=null,detail=sqlerrm where id=r.id;
  end;
 end loop;
end; $$;
revoke all on function public.apply_schedule_requests_v34() from public,anon,authenticated;

create function public.get_schedule_requests_v34(p_student_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if p_student_id is not null and not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('student_name',coalesce(nullif(s.preferred_name,''),p.name),'can_teacher',r.teacher_id=public.get_current_teacher_id(),'can_guardian',exists(select 1 from public.get_my_guardian_students() g where g.student_id=r.student_id)) order by r.created_at desc),'[]'::jsonb) into result
 from public.schedule_requests_v34 r join public.students s on s.id=r.student_id join public.profiles p on p.id=s.profile_id
 where (p_student_id is null or r.student_id=p_student_id) and public.can_view_schedule_request_v34(r.student_id);
 return result;
end; $$;

create function public.get_my_fixed_slots_v34(p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 with raw as (select distinct w.day_of_week,w.start_time,w.end_time,s.class_duration_minutes duration from public.weekly_schedule w join public.students s on s.id=w.student_id where s.id=p_student_id and w.status='lesson'),
 gaps as(select *,case when lag(end_time) over(partition by day_of_week order by start_time)=start_time then 0 else 1 end gap from raw),
 islands as(select *,sum(gap) over(partition by day_of_week order by start_time) island from gaps),
 numbered as(select *,row_number() over(partition by day_of_week,island order by start_time) n from islands)
 select coalesce(jsonb_agg(jsonb_build_object('day_of_week',day_of_week,'start_time',start_time,'duration',duration) order by day_of_week,start_time),'[]'::jsonb) into result from numbered where mod((n-1)::integer,duration/30)=0;
 return result;
end; $$;
revoke all on function public.request_schedule_change_v34(uuid,integer,time,integer,time),public.review_schedule_change_v34(uuid,boolean),public.get_schedule_requests_v34(uuid),public.get_my_fixed_slots_v34(uuid) from public,anon;
grant execute on function public.request_schedule_change_v34(uuid,integer,time,integer,time),public.review_schedule_change_v34(uuid,boolean),public.get_schedule_requests_v34(uuid),public.get_my_fixed_slots_v34(uuid) to authenticated;
select cron.schedule('aularium-schedule-requests-v34','* * * * *','select public.apply_schedule_requests_v34()');

commit;
