-- Mudanças 5. Run only after reviewing the complete package and verification.
begin;

-- Keep the old access-type enum compatible. VIP uses the existing custom plan code.
create or replace function public.admin_set_teacher_plan_v26(p_teacher_id uuid, p_plan text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  v_plan text := lower(btrim(p_plan));
  v_access text;
  v_limit integer;
  v_fee numeric;
begin
  if not public.erp_is_current_admin_v2() then raise exception 'Somente administradores podem alterar planos.'; end if;
  if v_plan is null or v_plan not in ('trial','free','starter','plus','pro','premium','vip') then
    raise exception 'Selecione um plano válido.';
  end if;
  perform 1 from public.teachers where id=p_teacher_id for update;
  if not found then raise exception 'Professor não encontrado.'; end if;
  v_access := case when v_plan in ('trial','free') then v_plan else 'paid' end;
  v_limit := case v_plan when 'trial' then 5 when 'starter' then 5 when 'plus' then 10 when 'pro' then 20 when 'premium' then 30 else null end;
  v_fee := case v_plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 when 'trial' then 0 when 'free' then 0 else null end;
  perform public.admin_set_teacher_access_v2(p_teacher_id,v_access);
  update public.teachers set
    subscription_plan=case when v_plan in ('free','vip') then 'custom' else v_plan end,
    max_registered_students=case when v_plan='vip' then max_registered_students else v_limit end,
    max_active_students=case when v_plan='vip' then max_active_students else v_limit end,
    system_monthly_fee=case when v_plan='vip' then system_monthly_fee else v_fee end,
    pending_subscription_plan_v26=null,pending_plan_invoice_v26=null
  where id=p_teacher_id;
end;
$$;
revoke all on function public.admin_set_teacher_plan_v26(uuid,text) from public, anon;
grant execute on function public.admin_set_teacher_plan_v26(uuid,text) to authenticated;

-- Patch the verified current registration definition without replacing its validations.
do $$
declare original text; revised text;
begin
  select pg_get_functiondef(p.oid) into original from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='register_public_teacher_from_auth_v3';
  if original is null or (position('when ''trial'' then 30' in original)=0 and position('when ''trial'' then 5' in original)=0) then
    raise exception 'A definição do cadastro mudou; revise a migração antes de aplicá-la.';
  end if;
  revised := replace(original,'when ''trial'' then 30','when ''trial'' then 5');
  revised := regexp_replace(revised,'v_access_type := case.*?end;','v_access_type := ''trial'';');
  revised := replace(revised,'case when v_plan_code = ''trial'' then now() else null end','now()');
  revised := replace(revised,'case when v_plan_code = ''trial'' then now() + interval ''15 days'' else null end','case when v_plan_code = ''trial'' then now() + interval ''15 days'' else now() end');
  execute revised;
end;
$$;

update public.teachers set max_registered_students=5,max_active_students=5
where access_type='trial' and subscription_plan='trial';

alter table public.students add column if not exists preferred_name text;
create or replace function public.student_preferred_name_on_create_v26()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
  select nullif(left(btrim(u.raw_user_meta_data->>'preferred_name'),120),'') into new.preferred_name
  from auth.users u where u.id=new.profile_id;
  return new;
end; $$;
revoke all on function public.student_preferred_name_on_create_v26() from public, anon, authenticated;
drop trigger if exists student_preferred_name_on_create_v26 on public.students;
create trigger student_preferred_name_on_create_v26 before insert on public.students
for each row execute function public.student_preferred_name_on_create_v26();

create or replace function public.get_teacher_student_personal_data_v26(p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare v_result jsonb;
begin
  select to_jsonb(d) into v_result from public.get_teacher_student_personal_data_v2(p_student_id) d;
  if v_result is null then raise exception 'Aluno não encontrado.'; end if;
  return v_result || jsonb_build_object('preferred_name',(select s.preferred_name from public.students s where s.id=p_student_id));
end; $$;
revoke all on function public.get_teacher_student_personal_data_v26(uuid) from public, anon;
grant execute on function public.get_teacher_student_personal_data_v26(uuid) to authenticated;

create or replace function public.save_teacher_student_personal_data_v26(
  p_student_id uuid,p_name text,p_email text,p_phone text,p_cpf text,p_preferred_name text default null)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if length(coalesce(p_preferred_name,''))>120 then raise exception 'O nome social ou apelido deve ter até 120 caracteres.'; end if;
  perform public.save_teacher_student_personal_data_v2(p_student_id,p_name,p_email,p_phone,p_cpf);
  update public.students set preferred_name=nullif(btrim(p_preferred_name),'') where id=p_student_id;
end; $$;
revoke all on function public.save_teacher_student_personal_data_v26(uuid,text,text,text,text,text) from public, anon;
grant execute on function public.save_teacher_student_personal_data_v26(uuid,text,text,text,text,text) to authenticated;

alter table public.makeups add column if not exists notes text;
alter table public.makeups add column if not exists origin_lesson_date date;
alter table public.makeups add column if not exists source_makeup_id uuid references public.makeups(id) on delete set null;

-- Recover prior manual observations only when one notice matches one credit.
with matches as (
 select m.id,n.id as notice_id,split_part(n.message,'Observacao: ',2) as reason,
 count(*) over(partition by m.id) as notice_count,count(*) over(partition by n.id) as credit_count
 from public.makeups m join public.student_notices n on n.student_id=m.student_id and n.teacher_id=m.teacher_id and n.starts_at=m.created_at
 where m.source='manual' and m.notes is null and n.title='Nova reposicao disponivel' and position('Observacao: ' in n.message)>0
)
update public.makeups m set notes=x.reason from matches x where x.id=m.id and x.notice_count=1 and x.credit_count=1;

create or replace function public.teacher_grant_makeup_v26(
 p_student_id uuid,p_duration_minutes integer default null,p_reason text default null,
 p_expires_at timestamptz default null,p_origin_lesson_date date default null)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_id uuid;
begin
  if length(coalesce(p_reason,''))>3000 then raise exception 'A observação deve ter até 3000 caracteres.'; end if;
  v_id := public.teacher_grant_makeup_v16(p_student_id,p_duration_minutes,p_reason,p_expires_at);
  update public.makeups set notes=nullif(btrim(p_reason),''), origin_lesson_date=p_origin_lesson_date where id=v_id;
  return v_id;
end; $$;
revoke all on function public.teacher_grant_makeup_v26(uuid,integer,text,timestamptz,date) from public,anon;
grant execute on function public.teacher_grant_makeup_v26(uuid,integer,text,timestamptz,date) to authenticated;

create or replace function public.get_teacher_student_makeups_v26(p_student_id uuid)
returns setof jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 return query select to_jsonb(d) || jsonb_build_object('notes',coalesce(m.notes,(select a.notes from public.attendance a where a.id=m.source_attendance_id)),'source_lesson_date',coalesce(d.source_lesson_date,m.origin_lesson_date))
 from public.get_teacher_student_makeups(p_student_id) d join public.makeups m on m.id=d.makeup_id;
end; $$;
revoke all on function public.get_teacher_student_makeups_v26(uuid) from public,anon;
grant execute on function public.get_teacher_student_makeups_v26(uuid) to authenticated;

create or replace function public.teacher_reserve_makeup_part_v26(
 p_makeup_id uuid,p_duration_minutes integer,p_reservation_date date,p_start_time time)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare v_teacher uuid; v_credit public.makeups%rowtype; v_part uuid; v_date date;
begin
  v_teacher := public.get_current_teacher_id();
  if v_teacher is null then raise exception 'Somente professores podem agendar por este recurso.'; end if;
  -- Serialize this teacher's bookings, including monthly-limit checks.
  perform 1 from public.teachers where id=v_teacher for update;
  select * into v_credit from public.makeups where id=p_makeup_id and teacher_id=v_teacher for update;
  if not found or v_credit.status <> 'available' or v_credit.expires_at <= now() then
    raise exception 'O crédito não está disponível. Atualize a lista.';
  end if;
  if p_duration_minutes is null or p_duration_minutes not in (30,60,90,120) or p_duration_minutes>v_credit.duration_minutes then
    raise exception 'A duração deve ser um múltiplo de 30 minutos e não pode superar o saldo do crédito.';
  end if;
  v_part := v_credit.id;
  if p_duration_minutes < v_credit.duration_minutes then
    select l.lesson_date into v_date from public.attendance a join public.lessons l on l.id=a.lesson_id where a.id=v_credit.source_attendance_id;
    insert into public.makeups(student_id,teacher_id,source,duration_minutes,expires_at,status,cancellation_count,notes,origin_lesson_date,source_makeup_id)
    values(v_credit.student_id,v_teacher,v_credit.source,p_duration_minutes,v_credit.expires_at,'available',v_credit.cancellation_count,
      v_credit.notes,coalesce(v_credit.origin_lesson_date,v_date),coalesce(v_credit.source_makeup_id,v_credit.id)) returning id into v_part;
    update public.makeups set duration_minutes=duration_minutes-p_duration_minutes where id=v_credit.id;
  end if;
  -- Any booking error rolls back both the split and balance decrement.
  return public.teacher_reserve_makeup_with_rules(v_part,p_reservation_date,p_start_time);
end; $$;
revoke all on function public.teacher_reserve_makeup_part_v26(uuid,integer,date,time) from public,anon;
grant execute on function public.teacher_reserve_makeup_part_v26(uuid,integer,date,time) to authenticated;

create or replace function public.erp_teacher_access_enabled_v26(p_teacher_id uuid)
returns boolean language sql stable security definer set search_path=public,auth as $$
 select exists(select 1 from public.teachers t join public.profiles p on p.id=t.profile_id
 where t.id=p_teacher_id and t.active and p.active and t.account_status='active' and t.deleted_at is null
 and (t.access_type<>'trial' or t.trial_ends_at>now()));
$$;
revoke all on function public.erp_teacher_access_enabled_v26(uuid) from public,anon;
grant execute on function public.erp_teacher_access_enabled_v26(uuid) to authenticated;

create or replace function public.get_current_teacher_id()
returns uuid language sql stable security definer set search_path=public,auth as $$
 select public.erp_current_full_teacher_id_v3() where exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null);
$$;
create or replace function public.get_current_student_id()
returns uuid language sql stable security definer set search_path=public,auth as $$
 select s.id from public.students s left join public.student_active_context_v16 c on c.profile_id=auth.uid() and c.student_id=s.id
 where s.profile_id=auth.uid() and public.erp_teacher_access_enabled_v26(s.teacher_id)
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 order by (c.student_id=s.id) desc nulls last,s.active desc,s.created_at,s.id limit 1;
$$;

create or replace function public.get_my_guardian_students()
returns table(student_id uuid,student_name text,class_duration_minutes integer)
language sql stable security definer set search_path=public,auth as $$
 select st.id,p.name,st.class_duration_minutes from public.guardian_students gs
 join public.students st on st.id=gs.student_id join public.profiles p on p.id=st.profile_id
 where gs.guardian_profile_id=auth.uid() and st.active and public.erp_teacher_access_enabled_v26(st.teacher_id)
 and exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null)
 order by lower(p.name);
$$;

-- Preserve each guardian function's own authorization and result contract.
do $$
declare f record; original text; revised text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.proname like 'get_guardian_%' and 'p_student_id'=any(p.proargnames)
 loop
   original:=pg_get_functiondef(f.oid);
   if position('LANGUAGE plpgsql' in original)=0 or original !~* '\mbegin\M' then
     raise exception 'Revise o controle do responsável em % antes de prosseguir.',f.proname;
   end if;
   if position('erp_teacher_access_enabled_v26' in original)>0 then continue; end if;
   revised:=regexp_replace(original,'\mbegin\M',E'begin\n  if not exists(select 1 from public.students s where s.id=p_student_id and public.erp_teacher_access_enabled_v26(s.teacher_id)) then raise exception ''O acesso deste professor está indisponível.''; end if;\n','i');
   execute revised;
 end loop;
end; $$;

create or replace function public.admin_get_student_personal_v26(p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb;
begin
 if not public.erp_is_current_admin_v2() then raise exception 'Acesso restrito à administração.'; end if;
 select jsonb_build_object('profile_id',p.id,'name',p.name,'email',p.email,'phone',p.phone,'cpf',p.cpf,'preferred_name',s.preferred_name)
 into result from public.students s join public.profiles p on p.id=s.profile_id where s.id=p_student_id;
 if result is null then raise exception 'Aluno não encontrado.'; end if;
 return result;
end; $$;
revoke all on function public.admin_get_student_personal_v26(uuid) from public,anon;
grant execute on function public.admin_get_student_personal_v26(uuid) to authenticated;

create or replace function public.admin_save_student_personal_v26(p_student_id uuid,p_name text,p_phone text,p_cpf text,p_preferred_name text default null)
returns void language plpgsql security definer set search_path=public,auth as $$
declare v_profile uuid;
begin
 if not public.erp_is_current_admin_v2() then raise exception 'Acesso restrito à administração.'; end if;
 if length(btrim(coalesce(p_name,'')))<3 or length(coalesce(p_name,''))>200 then raise exception 'Informe o nome completo.'; end if;
 if length(regexp_replace(coalesce(p_phone,''),'\D','','g')) not between 10 and 15 then raise exception 'Informe um telefone válido.'; end if;
 if length(regexp_replace(coalesce(p_cpf,''),'\D','','g'))<>11 then raise exception 'Informe um CPF com 11 dígitos.'; end if;
 if length(coalesce(p_preferred_name,''))>120 then raise exception 'O nome social deve ter até 120 caracteres.'; end if;
 select profile_id into v_profile from public.students where id=p_student_id for update;
 if not found then raise exception 'Aluno não encontrado.'; end if;
 update public.profiles set name=btrim(p_name),phone=p_phone,cpf=p_cpf where id=v_profile;
 update public.students set preferred_name=nullif(btrim(p_preferred_name),'') where id=p_student_id;
end; $$;
revoke all on function public.admin_save_student_personal_v26(uuid,text,text,text,text) from public,anon;
grant execute on function public.admin_save_student_personal_v26(uuid,text,text,text,text) to authenticated;

-- Only trusted Auth administration can write app_metadata. Reconfirmation is
-- requested once per corrected address; ordinary confirmation does not reset it.
create or replace function public.require_corrected_email_confirmation_v26()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 if new.raw_app_meta_data->>'email_reconfirmation_requested_at_v26' is distinct from old.raw_app_meta_data->>'email_reconfirmation_requested_at_v26'
 and new.raw_app_meta_data->>'email_reconfirmation_requested_at_v26' is not null then
   new.email_confirmed_at := null;
 end if;
 return new;
end; $$;
revoke all on function public.require_corrected_email_confirmation_v26() from public,anon,authenticated;
drop trigger if exists require_corrected_email_confirmation_v26 on auth.users;
create trigger require_corrected_email_confirmation_v26 before update of raw_app_meta_data on auth.users
for each row execute function public.require_corrected_email_confirmation_v26();

-- V26 PAYMENT AND BILLING EXTENSIONS
alter table public.teachers add column if not exists pending_subscription_plan_v26 text;
alter table public.teachers add column if not exists pending_plan_invoice_v26 uuid references public.teacher_system_financial(id) on delete set null;

create or replace function public.teacher_request_plan_v26(p_plan text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; v_fee numeric; v_invoice uuid; v_date date:=timezone('America/Sao_Paulo',now())::date;
begin
 v_fee:=case p_plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end;
 if v_fee is null then raise exception 'Selecione um dos planos disponíveis.'; end if;
 select * into t from public.teachers where profile_id=auth.uid() and active and account_status='active' and deleted_at is null for update;
 if not found then raise exception 'Professor não encontrado.'; end if;
 if t.access_type<>'trial' or t.trial_ends_at>now() then raise exception 'Este recurso está disponível ao término do teste.'; end if;
 if exists(select 1 from public.teacher_system_financial f where f.teacher_id=t.id and f.year=extract(year from v_date)::int and f.month=extract(month from v_date)::int and f.payment_status='paid') then
   raise exception 'Já existe um pagamento neste mês. Solicite a revisão pelo suporte.';
 end if;
 insert into public.teacher_system_financial(teacher_id,year,month,amount,due_date,payment_status,notes)
 values(t.id,extract(year from v_date)::int,extract(month from v_date)::int,v_fee,v_date,'pending','Assinatura solicitada: '||p_plan)
 on conflict(teacher_id,year,month) do update set amount=excluded.amount,due_date=excluded.due_date,notes=excluded.notes,updated_at=now()
 returning id into v_invoice;
 update public.teachers set pending_subscription_plan_v26=p_plan,pending_plan_invoice_v26=v_invoice where id=t.id;
 return v_invoice;
end; $$;
revoke all on function public.teacher_request_plan_v26(text) from public,anon;
grant execute on function public.teacher_request_plan_v26(text) to authenticated;

create or replace function public.erp_activate_teacher_after_payment_v2()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; v_plan text; v_fee numeric; v_limit integer;
begin
 if new.payment_status<>'paid' then return new; end if;
 if tg_op='UPDATE' and old.payment_status is not distinct from new.payment_status then return new; end if;
 select * into t from public.teachers where id=new.teacher_id for update;
 if not found then return new; end if;
 v_plan:=coalesce(t.pending_subscription_plan_v26,t.subscription_plan);
 if t.pending_subscription_plan_v26 is not null and new.id is distinct from t.pending_plan_invoice_v26 then return new; end if;
 if v_plan='trial' then raise exception 'Defina o plano contratado antes de confirmar o pagamento.'; end if;
 v_fee:=case v_plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end;
 v_limit:=case v_plan when 'starter' then 5 when 'plus' then 10 when 'pro' then 20 when 'premium' then 30 end;
 if t.pending_subscription_plan_v26 is not null and new.amount<v_fee then raise exception 'O valor confirmado é menor que o plano solicitado.'; end if;
 update public.teachers set access_type='paid',account_status='active',active=true,paid_at=coalesce(paid_at,now()),trial_started_at=null,trial_ends_at=null,
 subscription_plan=v_plan,max_registered_students=coalesce(v_limit,max_registered_students),max_active_students=coalesce(v_limit,max_active_students),
 system_monthly_fee=coalesce(v_fee,system_monthly_fee),pending_subscription_plan_v26=null,pending_plan_invoice_v26=null where id=new.teacher_id;
 update public.profiles set active=true where id=t.profile_id;
 return new;
end; $$;

alter table public.lessons add column if not exists billable_original_v26 boolean;

create or replace function public.remember_billable_cancellation_v26()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='makeups' then
   if new.source in ('student_cancellation','teacher_cancellation') then
     update public.lessons l set billable_original_v26=true
     from public.attendance a where a.id=new.source_attendance_id and l.id=a.lesson_id;
   end if;
 else
   if new.status='cancelled' and lower(coalesce(new.notes,'')) like 'cancelada pelo aluno%' then
     update public.lessons set billable_original_v26=true where id=new.lesson_id;
   end if;
 end if;
 return new;
end; $$;
revoke all on function public.remember_billable_cancellation_v26() from public,anon,authenticated;
drop trigger if exists remember_billable_makeup_v26 on public.makeups;
create trigger remember_billable_makeup_v26 after insert on public.makeups for each row execute function public.remember_billable_cancellation_v26();
drop trigger if exists remember_billable_student_cancel_v26 on public.attendance;
create trigger remember_billable_student_cancel_v26 after insert or update on public.attendance for each row execute function public.remember_billable_cancellation_v26();

update public.lessons l set billable_original_v26=true
where l.billable_original_v26 is null and l.reservation_id is null and l.status='cancelled'
and exists(select 1 from public.attendance a where a.lesson_id=l.id and (
 lower(coalesce(a.notes,'')) like 'cancelada pelo aluno%' or exists(
 select 1 from public.makeups m where m.source_attendance_id=a.id and m.source in ('student_cancellation','teacher_cancellation'))));

do $$
declare original text; revised text;
begin
 original:=pg_get_functiondef('public.teacher_cancel_lesson_occurrence_v16(date,time,text,text,boolean)'::regprocedure);
 if position('billable_original_v26' in original)=0 then
   if position('update public.student_notices n' in original)=0 then raise exception 'Revise o cancelamento sem reposição.'; end if;
   revised:=replace(original,'update public.student_notices n','update public.lessons set billable_original_v26=false where id=v_lesson_id; update public.student_notices n');
   execute revised;
 end if;
 if to_regprocedure('public.financial_schedule_occurrences_before_v26(uuid,integer,integer)') is null then
   original:=pg_get_functiondef('public.financial_student_monthly_occurrences(uuid,integer,integer)'::regprocedure);
   revised:=replace(original,'FUNCTION public.financial_student_monthly_occurrences(','FUNCTION public.financial_schedule_occurrences_before_v26(');
   if revised=original then raise exception 'Revise a definição do cálculo mensal.'; end if;
   execute revised;
 end if;
end; $$;
revoke all on function public.financial_schedule_occurrences_before_v26(uuid,integer,integer) from public,anon,authenticated;

create or replace function public.financial_student_monthly_occurrences(p_student_id uuid,p_year integer,p_month integer)
returns table(student_id uuid,teacher_id uuid,lesson_date date,start_time time,end_time time,lesson_status text,attendance_status text,subject_name text,content_title text,teacher_notes text)
language plpgsql stable security definer set search_path=public,auth as $$
declare v_start date:=make_date(p_year,p_month,1); v_end date; v_student public.students%rowtype;
begin
 v_end:=(v_start+interval '1 month')::date;
 select * into v_student from public.students where id=p_student_id and active;
 if not found then return; end if;
 if not coalesce((public.erp_is_current_admin_v2() or v_student.teacher_id=public.get_current_teacher_id()
   or v_student.id=public.get_current_student_id()
   or exists(select 1 from public.get_my_guardian_students() g where g.student_id=p_student_id)),false) then
   raise exception 'Você não pode consultar o financeiro deste aluno.';
 end if;
 return query
 with base as materialized (
   select * from public.financial_schedule_occurrences_before_v26(p_student_id,p_year,p_month)
 ), moves as (
   select r.* from public.lesson_reschedules r where r.student_id=p_student_id and r.teacher_id=v_student.teacher_id
 ), roots as (
   select r.* from moves r where not exists(select 1 from moves prior
     where prior.new_date=r.original_date and prior.new_start_time=r.original_start_time and prior.created_at<r.created_at)
 ), candidates as (
   select b.*,0 as priority from base b where not exists(select 1 from moves r where r.new_date=b.lesson_date and r.new_start_time=b.start_time)
   union all
   select l.student_id,l.teacher_id,l.lesson_date,l.start_time,l.end_time,l.status,'cancelled'::text,null::text,null::text,
     coalesce(l.cancellation_message,l.teacher_notes),1
   from public.lessons l where l.student_id=p_student_id and l.teacher_id=v_student.teacher_id and l.reservation_id is null
     and l.status='cancelled' and l.billable_original_v26=true and l.lesson_date>=v_start and l.lesson_date<v_end
     and not exists(select 1 from moves r where r.new_date=l.lesson_date and r.new_start_time=l.start_time)
   union all
   select p_student_id,v_student.teacher_id,r.original_date,r.original_start_time,
     (r.original_start_time+make_interval(mins=>v_student.class_duration_minutes))::time,
     'rescheduled'::text,null::text,null::text,null::text,r.reason,2
   from roots r where r.original_date>=v_start and r.original_date<v_end
 ), unique_occurrences as (
   select distinct on (c.lesson_date,c.start_time) c.* from candidates c
   where c.lesson_date>=coalesce(v_student.contract_start_date,v_start)
     and c.lesson_date<=coalesce(v_student.contract_end_date,v_end)
   order by c.lesson_date,c.start_time,c.priority
 )
 select u.student_id,u.teacher_id,u.lesson_date,u.start_time,u.end_time,u.lesson_status,u.attendance_status,u.subject_name,u.content_title,u.teacher_notes
 from unique_occurrences u order by u.lesson_date,u.start_time;
end; $$;

commit;
