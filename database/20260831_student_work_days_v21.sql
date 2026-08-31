begin;

create or replace function public.get_my_teacher_work_days_for_student_v21()
returns table(work_days integer[])
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_student_id uuid;
begin
  v_student_id := public.get_current_student_id();

  if v_student_id is null then
    raise exception 'Aluno nao encontrado.';
  end if;

  return query
  select
    case
      when cardinality(t.work_days) > 0 then t.work_days
      else array[1, 2, 3, 4, 5, 6, 7]::integer[]
    end
  from public.students st
  join public.teachers t
    on t.id = st.teacher_id
  where st.id = v_student_id
    and st.active = true
    and t.active = true
  limit 1;
end;
$function$;

revoke all on function public.get_my_teacher_work_days_for_student_v21() from public;
grant execute on function public.get_my_teacher_work_days_for_student_v21() to authenticated;

commit;

