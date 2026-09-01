begin;

create or replace function public.admin_set_student_active_v25(
  p_student_id uuid,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $function$
begin
  if not public.erp_is_current_admin_v2() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;

  update public.students
  set active = coalesce(p_active, false)
  where id = p_student_id;

  if not found then
    raise exception 'Aluno não encontrado.';
  end if;

  return true;
end;
$function$;

drop function if exists public.get_teacher_class_links();
create function public.get_teacher_class_links()
returns table(
  student_id uuid,
  student_name text,
  class_link text,
  day_of_week integer,
  start_time time without time zone
)
language plpgsql
stable
security definer
set search_path = public, auth
as $function$
declare
  v_teacher_id uuid;
begin
  v_teacher_id := public.get_current_teacher_id();
  if v_teacher_id is null then
    raise exception 'Somente professores podem consultar os links das aulas.';
  end if;

  return query
  select distinct on (st.id)
    st.id,
    p.name,
    st.class_link,
    extract(dow from current_date)::integer,
    agenda.start_time
  from public.get_teacher_schedule(current_date) agenda
  join public.students st
    on st.id = agenda.student_id
   and st.teacher_id = v_teacher_id
  join public.profiles p on p.id = st.profile_id
  where st.active = true
    and st.class_link is not null
    and btrim(st.class_link) <> ''
    and lower(coalesce(agenda.status, '')) in (
      'lesson', 'makeup', 'reservation', 'own_makeup', 'my_makeup'
    )
  order by st.id, agenda.start_time;
end;
$function$;

create or replace function public.recalculate_teacher_monthly_financial_v25(
  p_year integer,
  p_month integer
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_teacher_id uuid;
  v_updated integer := 0;
begin
  v_teacher_id := public.get_current_teacher_id();
  if v_teacher_id is null then
    raise exception 'Somente professores podem recalcular mensalidades.';
  end if;
  if p_year < 2000 or p_year > 2200 or p_month < 1 or p_month > 12 then
    raise exception 'Mês ou ano inválido.';
  end if;

  with recalculated as (
    select
      mf.id,
      count(occ.lesson_date)::integer as lesson_count,
      count(occ.lesson_date)::numeric * coalesce(mf.lesson_unit_value, 0) as amount
    from public.monthly_financial mf
    join public.students st
      on st.id = mf.student_id
     and st.teacher_id = v_teacher_id
    left join lateral public.financial_student_monthly_occurrences(
      mf.student_id, p_year, p_month
    ) occ on true
    where mf.year = p_year
      and mf.month = p_month
      and mf.billing_type = 'per_lesson'
      and mf.payment_status in ('pending', 'overdue')
    group by mf.id, mf.lesson_unit_value
  )
  update public.monthly_financial mf
  set lesson_count = r.lesson_count,
      amount = r.amount
  from recalculated r
  where mf.id = r.id;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

create or replace function public.delete_teacher_monthly_financial_v25(
  p_financial_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_teacher_id uuid;
begin
  v_teacher_id := public.get_current_teacher_id();
  if v_teacher_id is null then
    raise exception 'Somente professores podem excluir mensalidades.';
  end if;

  delete from public.monthly_financial mf
  using public.students st
  where mf.id = p_financial_id
    and st.id = mf.student_id
    and st.teacher_id = v_teacher_id;

  if not found then
    raise exception 'Mensalidade não encontrada.';
  end if;
  return true;
end;
$function$;

create or replace function public.teacher_regenerate_future_lessons_v25(
  p_student_ids uuid[] default null,
  p_from_date date default current_date,
  p_to_date date default (current_date + interval '6 months')::date
)
returns table(inserted_count integer, student_count integer)
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_teacher_id uuid;
  v_student record;
  v_month date;
  v_inserted integer := 0;
  v_step integer := 0;
  v_students integer := 0;
begin
  v_teacher_id := public.get_current_teacher_id();
  if v_teacher_id is null then
    raise exception 'Somente professores podem regenerar aulas.';
  end if;
  if p_from_date is null or p_to_date is null or p_to_date < p_from_date then
    raise exception 'Período inválido.';
  end if;
  if p_to_date > p_from_date + 366 then
    raise exception 'O período máximo para regeneração é de 366 dias.';
  end if;

  for v_student in
    select st.id
    from public.students st
    where st.teacher_id = v_teacher_id
      and st.active = true
      and (
        p_student_ids is null
        or cardinality(p_student_ids) = 0
        or st.id = any(p_student_ids)
      )
  loop
    v_students := v_students + 1;
    for v_month in
      select generate_series(
        date_trunc('month', p_from_date)::date,
        date_trunc('month', p_to_date)::date,
        interval '1 month'
      )::date
    loop
      insert into public.lessons (
        teacher_id, student_id, lesson_date, start_time, end_time, status
      )
      select
        v_teacher_id,
        v_student.id,
        occ.lesson_date,
        occ.start_time,
        occ.end_time,
        'scheduled'
      from public.financial_student_monthly_occurrences(
        v_student.id,
        extract(year from v_month)::integer,
        extract(month from v_month)::integer
      ) occ
      where occ.lesson_date between p_from_date and p_to_date
        and not exists (
          select 1
          from public.lessons existing
          where existing.teacher_id = v_teacher_id
            and existing.student_id = v_student.id
            and existing.lesson_date = occ.lesson_date
            and existing.start_time = occ.start_time
        );
      get diagnostics v_step = row_count;
      v_inserted := v_inserted + v_step;
    end loop;
  end loop;

  return query select v_inserted, v_students;
end;
$function$;

revoke all on function public.admin_set_student_active_v25(uuid, boolean) from public;
revoke all on function public.get_teacher_class_links() from public;
revoke all on function public.recalculate_teacher_monthly_financial_v25(integer, integer) from public;
revoke all on function public.delete_teacher_monthly_financial_v25(uuid) from public;
revoke all on function public.teacher_regenerate_future_lessons_v25(uuid[], date, date) from public;

grant execute on function public.admin_set_student_active_v25(uuid, boolean) to authenticated;
grant execute on function public.get_teacher_class_links() to authenticated;
grant execute on function public.recalculate_teacher_monthly_financial_v25(integer, integer) to authenticated;
grant execute on function public.delete_teacher_monthly_financial_v25(uuid) to authenticated;
grant execute on function public.teacher_regenerate_future_lessons_v25(uuid[], date, date) to authenticated;

commit;
