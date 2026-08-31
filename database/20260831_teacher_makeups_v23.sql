begin;

create or replace function public.teacher_update_makeup_duration_v23(
  p_makeup_id uuid,
  p_duration_minutes integer
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
    raise exception 'Somente professores podem alterar reposições.';
  end if;
  if p_duration_minutes not in (30, 60, 90, 120) then
    raise exception 'A duração deve ser 30, 60, 90 ou 120 minutos.';
  end if;

  update public.makeups
  set duration_minutes = p_duration_minutes
  where id = p_makeup_id
    and teacher_id = v_teacher_id
    and status = 'available';

  if not found then
    raise exception 'A reposição não foi encontrada ou já está reservada/concluída.';
  end if;
  return true;
end;
$function$;

create or replace function public.teacher_delete_makeup_v23(
  p_makeup_id uuid
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
    raise exception 'Somente professores podem excluir reposições.';
  end if;

  delete from public.makeups
  where id = p_makeup_id
    and teacher_id = v_teacher_id
    and status = 'available';

  if not found then
    raise exception 'A reposição não foi encontrada ou já está reservada/concluída.';
  end if;
  return true;
end;
$function$;

revoke all on function public.teacher_update_makeup_duration_v23(uuid, integer) from public;
revoke all on function public.teacher_delete_makeup_v23(uuid) from public;
grant execute on function public.teacher_update_makeup_duration_v23(uuid, integer) to authenticated;
grant execute on function public.teacher_delete_makeup_v23(uuid) to authenticated;

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
  v_today integer;
begin
  v_teacher_id := public.get_current_teacher_id();
  if v_teacher_id is null then
    raise exception 'Somente professores podem consultar os links das aulas.';
  end if;
  v_today := extract(dow from current_date)::integer;

  return query
  select distinct on (st.id)
    st.id,
    p.name,
    st.class_link,
    ws.day_of_week,
    ws.start_time
  from public.students st
  join public.profiles p on p.id = st.profile_id
  join public.weekly_schedule ws
    on ws.teacher_id = v_teacher_id
   and ws.student_id = st.id
   and ws.status = 'lesson'
   and ws.day_of_week = v_today
  where st.teacher_id = v_teacher_id
    and st.active = true
    and st.class_link is not null
    and btrim(st.class_link) <> ''
  order by st.id, ws.start_time;
end;
$function$;

revoke all on function public.get_teacher_class_links() from public;
grant execute on function public.get_teacher_class_links() to authenticated;

commit;
