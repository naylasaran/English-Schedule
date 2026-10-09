-- Midnight is the exclusive end of the selected day; existing histories are unchanged.
begin;
alter table public.weekly_schedule_exceptions drop constraint weekly_schedule_exceptions_time_check;
alter table public.weekly_schedule_exceptions add constraint weekly_schedule_exceptions_time_check
 check(end_time>start_time or (end_time='00:00' and start_time>'00:00'));
alter table public.reservations drop constraint reservations_check;
alter table public.reservations add constraint reservations_check
 check(end_time>start_time or (end_time='00:00' and start_time>'00:00'));
-- PostgreSQL 17 updates only the derived range and rebuilds its existing overlap index.
alter table public.reservations alter column reservation_range set expression as
 (tsrange(reservation_date+start_time,
 reservation_date+end_time+case when end_time='00:00' then interval '1 day' else interval '0' end,'[)'));

-- Patch the inspected definitions in place, retaining signatures, privileges and authorization.
do $migration$
declare original text; revised text; proc record;
begin
 original:=pg_get_functiondef('public.is_effective_makeup_slot_available(uuid,date,time,integer)'::regprocedure);
 revised:=regexp_replace(original,'v_requested_end_minutes\s*>=\s*1440','v_requested_end_minutes > 1440');
 if revised=original then raise exception 'Unexpected availability definition';end if;
 execute revised;

 original:=pg_get_functiondef('public.save_teacher_schedule_exception_v2(date,time,text,uuid)'::regprocedure);
 revised:=regexp_replace(original,'r.start_time\s*<\s*\(v_block_start\s*\+\s*interval ''30 minutes''\)::time\s*and\s*r.end_time\s*>\s*v_block_start',
 'public.erp_clock_minutes(r.start_time) < public.erp_clock_minutes(v_block_start)+30 and public.erp_interval_end_minutes(r.start_time,r.end_time) > public.erp_clock_minutes(v_block_start)');
 revised:=replace(revised,'for v_index in 0 .. (v_duration / 30 - 1) loop',
 'if public.erp_clock_minutes(v_effective_start)+v_duration > 1440 then raise exception ''A aula não pode ultrapassar a meia-noite.'';end if;
 if extract(minute from p_start_time) not in(0,30) or extract(second from p_start_time)<>0 then raise exception ''Use blocos de 30 minutos.'';end if;
 for v_index in 0 .. (v_duration / 30 - 1) loop');
 if revised=original or position('não pode ultrapassar' in revised)=0 then raise exception 'Unexpected date editor definition';end if;
 execute revised;

 original:=pg_get_functiondef('public.manage_weekly_slot(integer,time,text,uuid)'::regprocedure);
 revised:=regexp_replace(original,'p_status\s*=\s*''lesson''\s*and\s*v_new_duration\s*=\s*60\s*and\s*v_effective_start\s*>\s*time ''22:30''',
 'p_status = ''lesson'' and public.erp_clock_minutes(v_effective_start)+v_new_duration > 1440');
 revised:=replace(revised,'Uma aula de 60 minutos não pode começar depois das 22:30.','A aula não pode ultrapassar a meia-noite.');
 if revised=original then raise exception 'Unexpected weekly editor definition';end if;
 execute revised;

 -- Both agendas must show reservations/lessons in their final 23:30 block.
 for proc in select oid,proname from pg_proc where pronamespace='public'::regnamespace
 and (proname='get_teacher_schedule' or (proname='get_student_weekly_schedule' and pronargs=1)) loop
 original:=pg_get_functiondef(proc.oid);
 revised:=regexp_replace(original,'(r|l|lesson)\.start_time\s*<\s*ws.end_time',
 'public.erp_clock_minutes(\1.start_time) < public.erp_interval_end_minutes(ws.start_time,ws.end_time)','g');
 revised:=regexp_replace(revised,'(r|l|lesson)\.end_time\s*>\s*ws.start_time',
 'public.erp_interval_end_minutes(\1.start_time,\1.end_time) > public.erp_clock_minutes(ws.start_time)','g');
 if revised=original then raise exception 'Unexpected agenda definition: %',proc.proname;end if;
 execute revised;
 end loop;

 -- Tell every report view explicitly whether the signed-in teacher owns this report.
 original:=pg_get_functiondef('public.get_progress_reports_v33(uuid)'::regprocedure);
 revised:=replace(original,'''student_name'',coalesce',
 '''can_delete'',coalesce(s.teacher_id=public.get_current_teacher_id(),false),''student_name'',coalesce');
 if revised=original then raise exception 'Unexpected report definition';end if;
 execute revised;
end;
$migration$;
-- Shared agenda color for another student's makeup; no student identity is exposed.
do $palette$
declare original text; revised text;
begin
 original:=pg_get_functiondef('public.get_student_weekly_schedule(date)'::regprocedure);
 revised:=regexp_replace(original,'(then )''occupied''(\s*-- Excecao especifica daquela data)','\1''occupied_makeup''\2');
 if revised=original then raise exception 'Unexpected other reservation definition';end if;
 execute revised;
end;$palette$;
commit;
