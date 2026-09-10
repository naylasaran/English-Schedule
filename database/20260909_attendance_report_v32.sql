begin;

create or replace function public.get_teacher_attendance_report(p_from_date date,p_to_date date,p_student_id uuid default null)
returns table(lesson_id uuid,student_id uuid,student_name text,lesson_date date,start_time time,end_time time,lesson_status text,attendance_status text,attendance_notes text,teacher_notes text,subject_name text,content_title text,occurrence_type text)
language plpgsql stable security definer set search_path=public,auth as $$
declare teacher uuid:=public.get_current_teacher_id();
begin
 if teacher is null then raise exception 'Acesso restrito ao professor.'; end if;
 if p_from_date is null or p_to_date is null or p_from_date>p_to_date or p_to_date-p_from_date>366 then raise exception 'Selecione um período de até um ano.'; end if;
 if p_student_id is not null and not exists(select 1 from public.students s where s.id=p_student_id and s.teacher_id=teacher) then raise exception 'Aluno não pertence a este professor.'; end if;
 return query
 select l.id,l.student_id,coalesce(nullif(btrim(st.preferred_name),''),p.name),l.lesson_date,l.start_time,l.end_time,l.status,
 a.status,a.notes,l.teacher_notes,s.name,lc.title,case when l.reservation_id is not null then 'makeup' else 'lesson' end
 from public.lessons l
 join public.students st on st.id=l.student_id and st.teacher_id=teacher
 join public.profiles p on p.id=st.profile_id
 left join public.subjects s on s.id=l.subject_id
 left join public.lesson_contents lc on lc.id=l.content_id
 left join lateral(select att.status,att.notes from public.attendance att where att.lesson_id=l.id order by att.created_at desc,att.id desc limit 1) a on true
 where l.teacher_id=teacher and l.lesson_date between p_from_date and p_to_date
 and (p_student_id is null or l.student_id=p_student_id) and not l.superseded_schedule_v31
 order by l.lesson_date desc,l.start_time desc,l.id;
end; $$;
revoke all on function public.get_teacher_attendance_report(date,date,uuid) from public,anon;
grant execute on function public.get_teacher_attendance_report(date,date,uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
