begin;

create table if not exists public.system_billing_settings_v24 (
  singleton boolean primary key default true check (singleton),
  pix_key text,
  pix_qr_code_url text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table public.system_billing_settings_v24 enable row level security;

create or replace function public.get_admin_system_billing_settings_v24()
returns table(pix_key text, pix_qr_code_url text)
language plpgsql
stable
security definer
set search_path = public, auth
as $function$
begin
  if not public.erp_is_current_admin_v2() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;
  return query
  select s.pix_key, s.pix_qr_code_url
  from public.system_billing_settings_v24 s
  where s.singleton = true;
end;
$function$;

create or replace function public.save_admin_system_billing_settings_v24(
  p_pix_key text,
  p_pix_qr_code_url text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  v_pix text := nullif(btrim(coalesce(p_pix_key, '')), '');
  v_qr text := nullif(btrim(coalesce(p_pix_qr_code_url, '')), '');
begin
  if not public.erp_is_current_admin_v2() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;
  if v_qr is not null and v_qr !~* '^https://[^[:space:]]+$' then
    raise exception 'O QR Code precisa ser informado por um link HTTPS válido.';
  end if;
  insert into public.system_billing_settings_v24 (
    singleton, pix_key, pix_qr_code_url, updated_at, updated_by
  ) values (
    true, v_pix, v_qr, now(), auth.uid()
  )
  on conflict (singleton) do update set
    pix_key = excluded.pix_key,
    pix_qr_code_url = excluded.pix_qr_code_url,
    updated_at = now(),
    updated_by = auth.uid();
  return true;
end;
$function$;

create or replace function public.get_my_system_billing_settings_v24()
returns table(pix_key text, pix_qr_code_url text)
language plpgsql
stable
security definer
set search_path = public, auth
as $function$
begin
  if public.get_current_teacher_id() is null then
    raise exception 'Acesso permitido somente para professores.';
  end if;
  return query
  select s.pix_key, s.pix_qr_code_url
  from public.system_billing_settings_v24 s
  where s.singleton = true;
end;
$function$;

create or replace function public.get_admin_teacher_students_v24(p_teacher_id uuid)
returns table(
  student_id uuid,
  profile_id uuid,
  student_name text,
  student_email text,
  active boolean,
  classes_paused boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $function$
begin
  if not public.erp_is_current_admin_v2() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;
  return query
  select s.id, s.profile_id, p.name, p.email, s.active, s.classes_paused, s.created_at
  from public.students s
  join public.profiles p on p.id = s.profile_id
  where s.teacher_id = p_teacher_id
  order by p.name, s.created_at;
end;
$function$;

create or replace function public.admin_hard_delete_student_v24(p_student_id uuid)
returns table(profile_id uuid, remaining_links integer)
language plpgsql
security definer
set search_path = public, pg_catalog, auth
set row_security = off
as $function$
declare
  v_profile_id uuid;
  v_ref record;
  v_remaining integer;
begin
  if not public.erp_is_current_admin_v2() then
    raise exception 'Acesso permitido somente para administradores.';
  end if;
  select s.profile_id into v_profile_id
  from public.students s
  where s.id = p_student_id;
  if v_profile_id is null then
    raise exception 'Aluno não encontrado.';
  end if;

  for v_ref in
    select ns.nspname as schema_name, cl.relname as table_name, att.attname as column_name
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_namespace ns on ns.oid = cl.relnamespace
    join unnest(con.conkey) with ordinality k(attnum, ord) on true
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
    where con.contype = 'f' and con.confrelid = 'public.students'::regclass
  loop
    execute format('delete from %I.%I where %I = $1', v_ref.schema_name, v_ref.table_name, v_ref.column_name)
      using p_student_id;
  end loop;

  delete from public.students where id = p_student_id;
  select count(*)::integer into v_remaining
  from public.students s where s.profile_id = v_profile_id;
  return query select v_profile_id, v_remaining;
end;
$function$;

revoke all on table public.system_billing_settings_v24 from anon, authenticated;
revoke all on function public.get_admin_system_billing_settings_v24() from public;
revoke all on function public.save_admin_system_billing_settings_v24(text, text) from public;
revoke all on function public.get_my_system_billing_settings_v24() from public;
revoke all on function public.get_admin_teacher_students_v24(uuid) from public;
revoke all on function public.admin_hard_delete_student_v24(uuid) from public;
grant execute on function public.get_admin_system_billing_settings_v24() to authenticated;
grant execute on function public.save_admin_system_billing_settings_v24(text, text) to authenticated;
grant execute on function public.get_my_system_billing_settings_v24() to authenticated;
grant execute on function public.get_admin_teacher_students_v24(uuid) to authenticated;
grant execute on function public.admin_hard_delete_student_v24(uuid) to authenticated;

commit;
