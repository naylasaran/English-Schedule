begin;

alter table public.lessons add column if not exists superseded_schedule_v31 boolean not null default false;

create or replace function public.replace_teacher_student_weekly_schedule(p_student_id uuid,p_schedule jsonb)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare
  teacher uuid:=public.get_current_teacher_id(); duration integer; item jsonb; day integer; starts time;
  block_start time; block_index integer; minutes integer; keys text[]:=array[]::text[]; slot_key text;
  old_slot record; slot_id uuid; change_date date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
  if teacher is null then raise exception 'Somente professores podem alterar horários.'; end if;
  perform 1 from public.teachers where id=teacher for update;
  select class_duration_minutes into duration from public.students
    where id=p_student_id and teacher_id=teacher and active for update;
  if not found then raise exception 'Aluno não encontrado ou não pertence a este professor.'; end if;
  if duration not in (30,60,90,120) then raise exception 'Duração inválida.'; end if;
  if p_schedule is null or jsonb_typeof(p_schedule)<>'array' then raise exception 'Informe uma lista de horários.'; end if;
  for item in select value from jsonb_array_elements(p_schedule) loop
    day:=(item->>'day_of_week')::integer; starts:=(item->>'start_time')::time;
    if day is null or day not between 0 and 6 or starts is null then raise exception 'Dia ou horário inválido.'; end if;
    minutes:=extract(hour from starts)::integer*60+extract(minute from starts)::integer;
    if extract(minute from starts)::integer not in (0,30) or extract(second from starts)<>0 or minutes+duration>=1440 then raise exception 'Horário ou duração inválidos.'; end if;
    for block_index in 0..(duration/30-1) loop
      block_start:=(starts+make_interval(mins=>block_index*30))::time;
      slot_key:=day::text||'|'||block_start::text;
      if slot_key=any(keys) then raise exception 'Existem horários sobrepostos na nova agenda.'; end if;
      keys:=array_append(keys,slot_key);
      if exists(select 1 from public.weekly_schedule w where w.teacher_id=teacher and w.day_of_week=day and w.start_time=block_start
        and w.status<>'free' and not(w.status='lesson' and w.student_id=p_student_id)) then
        raise exception 'Um dos horários escolhidos está ocupado por outro aluno ou indisponível.';
      end if;
    end loop;
  end loop;
  -- Identify old rows by their own IDs, never by time alone (legacy imports can contain duplicates).
  for old_slot in select w.* from public.weekly_schedule w where w.teacher_id=teacher and w.student_id=p_student_id and w.status='lesson' for update loop
    perform public.archive_weekly_slot_state(old_slot.id,change_date);
    if exists(select 1 from public.weekly_schedule w where w.teacher_id=teacher and w.day_of_week=old_slot.day_of_week and w.start_time=old_slot.start_time and w.id<>old_slot.id) then
      -- History has no FK to this row and remains available for prior dates.
      delete from public.weekly_schedule where id=old_slot.id;
    else
      update public.weekly_schedule set status='free',student_id=null,effective_from=change_date where id=old_slot.id;
    end if;
  end loop;
  for item in select value from jsonb_array_elements(p_schedule) loop
    day:=(item->>'day_of_week')::integer; starts:=(item->>'start_time')::time;
    for block_index in 0..(duration/30-1) loop
      block_start:=(starts+make_interval(mins=>block_index*30))::time;
      select id into slot_id from public.weekly_schedule w where w.teacher_id=teacher and w.day_of_week=day and w.start_time=block_start and w.status='free' order by w.id limit 1 for update;
      if found then
        perform public.archive_weekly_slot_state(slot_id,change_date);
        update public.weekly_schedule set student_id=p_student_id,status='lesson',end_time=(block_start+interval '30 minutes')::time,effective_from=change_date where id=slot_id;
      else
        insert into public.weekly_schedule(teacher_id,day_of_week,start_time,end_time,status,student_id,effective_from)
          values(teacher,day,block_start,(block_start+interval '30 minutes')::time,'lesson',p_student_id,change_date);
      end if;
    end loop;
  end loop;
  -- Cancel only untouched generated future lessons which no longer fit the fixed schedule.
  -- Actual attendance, reservations and individually rescheduled lessons retain their records.
  update public.lessons l set status='cancelled',superseded_schedule_v31=true,billable_original_v26=false
  where l.teacher_id=teacher and l.student_id=p_student_id and l.status='scheduled' and l.reservation_id is null
    and (l.lesson_date>change_date or (l.lesson_date=change_date and l.start_time>(now() at time zone 'America/Sao_Paulo')::time))
    and not exists(select 1 from public.attendance a where a.lesson_id=l.id)
    and not exists(select 1 from public.lesson_reschedules r where r.teacher_id=teacher and r.student_id=p_student_id
      and ((r.original_date=l.lesson_date and r.original_start_time=l.start_time) or (r.new_date=l.lesson_date and r.new_start_time=l.start_time)))
    and not exists(select 1 from public.weekly_schedule_exceptions e where e.teacher_id=teacher and e.student_id=p_student_id and e.exception_date=l.lesson_date and e.status='lesson' and e.start_time=l.start_time)
    and exists(select 1 from generate_series(0,duration/30-1) n where not exists(
      select 1 from public.weekly_schedule w where w.teacher_id=teacher and w.student_id=p_student_id and w.status='lesson'
        and w.day_of_week=extract(dow from l.lesson_date)::integer and w.start_time=(l.start_time+make_interval(mins=>n*30))::time));
  return true;
end; $$;

-- Ignore superseded generated lessons when building calendars. Keep their rows for traceability.
do $$ declare original text; revised text; name text; begin
  original:=pg_get_functiondef('public.get_teacher_schedule(date)'::regprocedure);
  revised:=regexp_replace(original,'where\s+lesson\.teacher_id\s*=\s*ws\.teacher_id','where not lesson.superseded_schedule_v31 and lesson.teacher_id = ws.teacher_id','gi');
  if revised=original then raise exception 'Review teacher schedule definition'; end if;
  revised:=replace(revised,'reservation_profile.name','coalesce(nullif(btrim(reservation_student.preferred_name),''''),reservation_profile.name)');
  revised:=replace(revised,'lesson_profile.name','coalesce(nullif(btrim(lesson_student.preferred_name),''''),lesson_profile.name)');
  revised:=replace(revised,'schedule_profile.name','coalesce(nullif(btrim(schedule_student.preferred_name),''''),schedule_profile.name)');
  execute revised;
  foreach name in array array['get_student_weekly_schedule(date)','financial_schedule_occurrences_before_v26(uuid,integer,integer)'] loop
    original:=pg_get_functiondef(('public.'||name)::regprocedure);
    revised:=regexp_replace(original,'where\s+l\.teacher_id\s*=','where not l.superseded_schedule_v31 and l.teacher_id =','gi');
    if revised=original then raise exception 'Review lesson query: %',name; end if;
    execute revised;
  end loop;
  original:=pg_get_functiondef('public.get_teacher_attendance_for_date(date)'::regprocedure);
  revised:=replace(original,'p.name','coalesce(nullif(btrim(s.preferred_name),''''),p.name)');
  if revised=original then raise exception 'Review attendance display name'; end if;
  execute revised;
  original:=pg_get_functiondef('public.get_teacher_class_links()'::regprocedure);
  revised:=replace(original,'p.name','coalesce(nullif(btrim(st.preferred_name),''''),p.name)');
  if revised=original then raise exception 'Review class links display name'; end if;
  execute revised;
end; $$;

create function public.get_admin_support_pending_count_v31()
returns integer language plpgsql stable security definer set search_path=public,auth as $$
begin
  if not public.erp_is_current_admin_v2() then raise exception 'Acesso restrito à administração.'; end if;
  return (select count(*)::integer from public.support_tickets t where t.status<>'closed'
    and coalesce((select m.author_role from public.support_messages m where m.ticket_id=t.id order by m.created_at desc,m.id desc limit 1),'')<>'admin');
end; $$;
revoke all on function public.get_admin_support_pending_count_v31() from public,anon;
grant execute on function public.get_admin_support_pending_count_v31() to authenticated;
commit;
