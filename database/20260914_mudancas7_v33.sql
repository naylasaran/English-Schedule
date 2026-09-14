begin;

-- Preserve legacy invoices; stop manufacturing receivables while reading reports.
create or replace function public.get_admin_teacher_system_financial(p_year integer,p_month integer)
returns table(teacher_id uuid,system_monthly_fee numeric,system_payment_due_day integer,system_invoice_required boolean,financial_id uuid,amount numeric,due_date date,payment_status text,paid_at timestamptz,invoice_required boolean,display_status text)
language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_current_admin() then raise exception 'Acesso exclusivo do administrador.'; end if;
 if p_year is null or p_year not between 2000 and 2200 or p_month is null or p_month not between 1 and 12 then raise exception 'Mês inválido.'; end if;
 return query select t.id,t.system_monthly_fee,t.system_payment_due_day,t.system_invoice_required,f.id,f.amount,f.due_date,f.payment_status,f.paid_at,f.invoice_required,
 case when f.payment_status='paid' then 'paid' when f.due_date<timezone('America/Sao_Paulo',now())::date then 'overdue' else 'pending' end::text
 from public.teacher_system_financial f join public.teachers t on t.id=f.teacher_id
 where f.year=p_year and f.month=p_month and f.amount>0
 and (f.payment_status='paid' or exists(select 1 from public.teacher_plan_changes_v33 pc where pc.invoice_id=f.id and pc.applied_at is null) or (t.access_type='paid' and t.deleted_at is null and t.paid_at is not null
 and make_date(f.year,f.month,1)>=date_trunc('month',timezone('America/Sao_Paulo',t.paid_at))::date))
 order by t.id;
end; $$;

create or replace function public.ensure_teacher_system_financial_month(p_teacher_id uuid,p_year integer,p_month integer)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; v_id uuid; v_period date; v_today date:=timezone('America/Sao_Paulo',now())::date;
begin
 if p_year is null or p_year not between 2000 and 2200 or p_month is null or p_month not between 1 and 12 then raise exception 'Mês inválido.'; end if;
 if auth.uid() is not null and not public.is_current_admin() and not exists(select 1 from public.teachers where id=p_teacher_id and profile_id=auth.uid()) then raise exception 'Acesso não permitido.'; end if;
 select * into t from public.teachers where id=p_teacher_id for update;
 if not found then raise exception 'Professor não encontrado.'; end if;
 v_period:=make_date(p_year,p_month,1);
 if t.access_type<>'paid' or t.deleted_at is not null or coalesce(t.system_monthly_fee,0)<=0 or t.paid_at is null
 or v_period<date_trunc('month',timezone('America/Sao_Paulo',t.paid_at))::date or v_period>date_trunc('month',v_today)::date then return null; end if;
 insert into public.teacher_system_financial(teacher_id,year,month,amount,due_date,payment_status,invoice_required)
 values(t.id,p_year,p_month,t.system_monthly_fee,public.financial_due_date(p_year,p_month,coalesce(t.system_payment_due_day,10)),'pending',coalesce(t.system_invoice_required,false))
 on conflict(teacher_id,year,month) do nothing returning id into v_id;
 if v_id is null then select id into v_id from public.teacher_system_financial where teacher_id=t.id and year=p_year and month=p_month; end if;
 return v_id;
end; $$;

-- The schedule is separate from the active plan; current-month invoices stay immutable.
create table public.teacher_plan_changes_v33 (
 teacher_id uuid primary key references public.teachers(id),
 plan text not null check(plan in ('starter','plus','pro','premium')),
 effective_date date not null, invoice_id uuid references public.teacher_system_financial(id),
 requested_at timestamptz not null default now(), applied_at timestamptz,
 requested_by uuid not null
);
alter table public.teacher_plan_changes_v33 enable row level security;
revoke all on public.teacher_plan_changes_v33 from public,anon,authenticated;

create function public.apply_due_teacher_plans_v33()
returns void language plpgsql security definer set search_path=public,auth as $$
declare c record; v_limit integer;
begin
 for c in select pc.*,f.payment_status from public.teacher_plan_changes_v33 pc join public.teacher_system_financial f on f.id=pc.invoice_id
 where pc.applied_at is null and pc.effective_date<=timezone('America/Sao_Paulo',now())::date and f.payment_status='paid' for update of pc loop
  v_limit:=case c.plan when 'starter' then 5 when 'plus' then 10 when 'pro' then 20 when 'premium' then 30 end;
  -- A downgrade cannot silently invalidate already registered active students.
  if (select count(*) from public.students where teacher_id=c.teacher_id)>v_limit then continue; end if;
  update public.teachers set subscription_plan=c.plan,system_monthly_fee=case c.plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end,
  max_registered_students=v_limit,max_active_students=v_limit,access_type='paid',active=true,account_status='active',paid_at=coalesce(paid_at,now()),trial_started_at=null,trial_ends_at=null,
  pending_subscription_plan_v26=null,pending_plan_invoice_v26=null where id=c.teacher_id and deleted_at is null;
  update public.teacher_plan_changes_v33 set applied_at=now() where teacher_id=c.teacher_id;
 end loop;
end; $$;
revoke all on function public.apply_due_teacher_plans_v33() from public,anon,authenticated;

create function public.teacher_schedule_plan_v33(p_plan text,p_teacher_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; v_limit integer; v_fee numeric; v_date date; v_id uuid;
begin
 v_limit:=case p_plan when 'starter' then 5 when 'plus' then 10 when 'pro' then 20 when 'premium' then 30 end;
 v_fee:=case p_plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end;
 if v_limit is null then raise exception 'Selecione um plano válido.'; end if;
 if p_teacher_id is not null and not public.is_current_admin() then raise exception 'Acesso não permitido.'; end if;
 select * into t from public.teachers where (case when p_teacher_id is null then profile_id=auth.uid() else id=p_teacher_id end) and active and account_status='active' and deleted_at is null for update;
 if not found or (t.access_type='free' and p_teacher_id is null) then raise exception 'Plano não disponível para este acesso.'; end if;
 if exists(select 1 from public.teacher_plan_changes_v33 where teacher_id=t.id and applied_at is null and invoice_id in(select id from teacher_system_financial where payment_status='paid')) then raise exception 'Já existe uma alteração paga aguardando início. Entre em contato com o suporte.'; end if;
 if (select count(*) from public.students where teacher_id=t.id)>v_limit then raise exception 'Este plano permite % alunos. A quantidade de cadastros supera esse limite; consulte o suporte antes de reduzir o plano.',v_limit; end if;
 v_date:=(date_trunc('month',timezone('America/Sao_Paulo',now()))+interval '1 month')::date;
 if exists(select 1 from public.teacher_system_financial where teacher_id=t.id and year=extract(year from v_date)::int and month=extract(month from v_date)::int and payment_status='paid') then raise exception 'A mensalidade do próximo mês já está paga. Entre em contato com o suporte.'; end if;
 insert into public.teacher_system_financial(teacher_id,year,month,amount,due_date,payment_status,invoice_required,notes)
 values(t.id,extract(year from v_date)::int,extract(month from v_date)::int,v_fee,public.financial_due_date(extract(year from v_date)::int,extract(month from v_date)::int,coalesce(t.system_payment_due_day,10)),'pending',coalesce(t.system_invoice_required,false),'Plano a partir de '||v_date||': '||p_plan)
 on conflict(teacher_id,year,month) do update set amount=excluded.amount,notes=excluded.notes,updated_at=now() returning id into v_id;
 insert into public.teacher_plan_changes_v33(teacher_id,plan,effective_date,invoice_id,requested_by) values(t.id,p_plan,v_date,v_id,auth.uid())
 on conflict(teacher_id) do update set plan=excluded.plan,effective_date=excluded.effective_date,invoice_id=excluded.invoice_id,requested_at=now(),requested_by=auth.uid(),applied_at=null;
 update public.teachers set pending_subscription_plan_v26=p_plan,pending_plan_invoice_v26=v_id where id=t.id;
 return jsonb_build_object('plan',p_plan,'amount',v_fee,'limit',v_limit,'effective_date',v_date,'invoice_id',v_id);
end; $$;
revoke all on function public.teacher_schedule_plan_v33(text,uuid) from public,anon;
grant execute on function public.teacher_schedule_plan_v33(text,uuid) to authenticated;
create or replace function public.teacher_request_plan_v26(p_plan text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
begin return (public.teacher_schedule_plan_v33(p_plan)->>'invoice_id')::uuid; end; $$;
alter function public.admin_set_teacher_plan_v26(uuid,text) rename to admin_set_teacher_plan_before_v33;
revoke all on function public.admin_set_teacher_plan_before_v33(uuid,text) from public,anon,authenticated;
create function public.admin_set_teacher_plan_v26(p_teacher_id uuid,p_plan text)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if not public.is_current_admin() then raise exception 'Acesso não permitido.'; end if;
 if p_plan in ('starter','plus','pro','premium') then
  perform public.teacher_schedule_plan_v33(p_plan,p_teacher_id);
 else
  perform public.admin_set_teacher_plan_before_v33(p_teacher_id,p_plan);
  update public.teacher_plan_changes_v33 set applied_at=now() where teacher_id=p_teacher_id and applied_at is null;
 end if;
end; $$;
revoke all on function public.admin_set_teacher_plan_v26(uuid,text) from public,anon;
grant execute on function public.admin_set_teacher_plan_v26(uuid,text) to authenticated;

-- Retain the proven payment activation for old invoices; scheduled changes wait for their month.
alter function public.erp_activate_teacher_after_payment_v2() rename to erp_activate_teacher_after_payment_before_v33;
create function public.erp_activate_teacher_after_payment_v2()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; c public.teacher_plan_changes_v33%rowtype; v_plan text; v_fee numeric; v_limit integer;
begin
 if new.payment_status<>'paid' then return new; end if;
 if tg_op='UPDATE' and old.payment_status is not distinct from new.payment_status then return new; end if;
 select * into t from public.teachers where id=new.teacher_id for update;
 select * into c from public.teacher_plan_changes_v33 where teacher_id=t.id and invoice_id=new.id and applied_at is null;
 if found then
  v_fee:=case c.plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end;
  if new.amount<v_fee then raise exception 'O valor confirmado é menor que o plano solicitado.'; end if;
  -- A first subscription unlocks on payment, but no current-month fee is added.
  if t.access_type='trial' then
   v_limit:=case c.plan when 'starter' then 5 when 'plus' then 10 when 'pro' then 20 when 'premium' then 30 end;
   update public.teachers set access_type='paid',subscription_plan=c.plan,system_monthly_fee=0,max_registered_students=v_limit,max_active_students=v_limit,paid_at=now(),trial_started_at=null,trial_ends_at=null where id=t.id;
  end if;
  -- The AFTER trigger sees the paid row. Fee changes wait for the effective month.
  perform public.apply_due_teacher_plans_v33();
  return new;
 end if;
 if t.access_type='free' then return new; end if;
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
-- Replace only triggers bound to the renamed legacy function.
do $$ declare tr record; begin
 for tr in select tgname,pg_get_triggerdef(oid) def from pg_trigger where tgfoid='public.erp_activate_teacher_after_payment_before_v33()'::regprocedure loop
 execute format('drop trigger %I on public.teacher_system_financial',tr.tgname);
 execute replace(tr.def,'erp_activate_teacher_after_payment_before_v33','erp_activate_teacher_after_payment_v2');
 end loop;
end; $$;

create function public.get_my_plan_v33()
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers%rowtype; c jsonb;
begin
 perform public.apply_due_teacher_plans_v33();
 select * into t from public.teachers where profile_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Professor não encontrado.'; end if;
 select to_jsonb(pc)||jsonb_build_object('payment_status',f.payment_status,'amount',f.amount) into c from public.teacher_plan_changes_v33 pc join public.teacher_system_financial f on f.id=pc.invoice_id where pc.teacher_id=t.id and pc.applied_at is null;
 return jsonb_build_object('access_type',t.access_type,'plan',t.subscription_plan,'amount',t.system_monthly_fee,'limit',t.max_registered_students,'pending',c);
end; $$;
revoke all on function public.get_my_plan_v33() from public,anon;
grant execute on function public.get_my_plan_v33() to authenticated;
create function public.process_monthly_plans_v33()
returns void language plpgsql security definer set search_path=public,auth as $$
declare t record; d date:=timezone('America/Sao_Paulo',now())::date;
begin
 perform public.apply_due_teacher_plans_v33();
 for t in select id from public.teachers where access_type='paid' and deleted_at is null and system_monthly_fee>0 loop
  perform public.ensure_teacher_system_financial_month(t.id,extract(year from d)::int,extract(month from d)::int);
 end loop;
end; $$;
revoke all on function public.process_monthly_plans_v33() from public,anon,authenticated;
select cron.schedule('aularium-apply-plans-v33','0 * * * *','select public.process_monthly_plans_v33()');

create or replace function public.get_my_system_financial()
returns table(system_monthly_fee numeric,system_payment_due_day integer,system_invoice_required boolean,pix_key text,year integer,month integer,amount numeric,due_date date,payment_status text,paid_at timestamptz,invoice_required boolean,display_status text)
language plpgsql security definer set search_path=public,auth as $$
declare tid uuid:=public.get_current_teacher_id();d date:=timezone('America/Sao_Paulo',now())::date;
begin
 if tid is null then raise exception 'Professor não encontrado ou acesso pausado.'; end if;
 perform public.apply_due_teacher_plans_v33();
 perform public.ensure_teacher_system_financial_month(tid,extract(year from d)::int,extract(month from d)::int);
 return query select t.system_monthly_fee,t.system_payment_due_day,t.system_invoice_required,b.pix_key,extract(year from d)::int,extract(month from d)::int,f.amount,f.due_date,f.payment_status,f.paid_at,f.invoice_required,
 case when t.access_type<>'paid' or coalesce(t.system_monthly_fee,0)<=0 then 'not_configured' when f.id is null then 'not_generated' when f.payment_status='paid' then 'paid' when f.due_date<d then 'overdue' else 'pending' end::text
 from public.teachers t cross join public.system_billing_settings b left join public.teacher_system_financial f on f.teacher_id=t.id and f.year=extract(year from d)::int and f.month=extract(month from d)::int and t.access_type='paid' and t.system_monthly_fee>0
 where t.id=tid and t.access_type<>'free' and b.id=1;
end; $$;

-- Personal welcome state is server-side and follows the teacher across devices.
create or replace function public.save_admin_teacher_system_billing(p_teacher_id uuid,p_monthly_fee numeric,p_due_day integer,p_year integer,p_month integer,p_paid boolean,p_invoice_required boolean)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare fid uuid; expected numeric;
begin
 if not public.is_current_admin() then raise exception 'Acesso exclusivo do administrador.'; end if;
 if p_monthly_fee is null or p_monthly_fee<0 or p_due_day is null or p_due_day not between 1 and 31 or p_year is null or p_year not between 2000 and 2200 or p_month is null or p_month not between 1 and 12 then raise exception 'Confira valor, vencimento e mês.'; end if;
 perform 1 from public.teachers where id=p_teacher_id for update;
 select id into fid from public.teacher_system_financial where teacher_id=p_teacher_id and year=p_year and month=p_month for update;
 if fid is null then fid:=public.ensure_teacher_system_financial_month(p_teacher_id,p_year,p_month); end if;
 if fid is null then raise exception 'Não existe mensalidade de assinatura neste mês. Para contratar ou trocar um plano, use a seleção de plano.'; end if;
 if not exists(select 1 from teachers where id=p_teacher_id and access_type='paid') and not exists(select 1 from teacher_plan_changes_v33 where teacher_id=p_teacher_id and invoice_id=fid and applied_at is null) then raise exception 'Contas gratuitas e em teste não possuem cobrança mensal.'; end if;
 select case plan when 'starter' then 14.90 when 'plus' then 29.90 when 'pro' then 59.90 when 'premium' then 89.90 end into expected from public.teacher_plan_changes_v33 where invoice_id=fid and applied_at is null;
 if expected is not null and p_monthly_fee<expected then raise exception 'O valor confirmado é menor que o plano solicitado.'; end if;
 update public.teachers set system_payment_due_day=p_due_day,system_invoice_required=coalesce(p_invoice_required,false) where id=p_teacher_id;
 update public.teacher_system_financial set amount=p_monthly_fee,due_date=public.financial_due_date(p_year,p_month,p_due_day),payment_status=case when coalesce(p_paid,false) then 'paid' else 'pending' end,
 paid_at=case when coalesce(p_paid,false) then coalesce(paid_at,now()) else null end,invoice_required=coalesce(p_invoice_required,false),updated_at=now() where id=fid;
 return true;
end; $$;

alter table public.teachers add column welcome_seen_at_v33 timestamptz;
create function public.teacher_welcome_v33(p_complete boolean default false)
returns boolean language plpgsql security definer set search_path=public,auth as $$
declare seen timestamptz; begin
 select welcome_seen_at_v33 into seen from public.teachers where id=public.get_current_teacher_id();
 if not found then return false; end if;
 if p_complete then update public.teachers set welcome_seen_at_v33=coalesce(welcome_seen_at_v33,now()) where profile_id=auth.uid(); end if;
 return seen is null;
end; $$;
revoke all on function public.teacher_welcome_v33(boolean) from public,anon;
grant execute on function public.teacher_welcome_v33(boolean) to authenticated;

create table public.progress_report_reads_v33(report_id uuid references public.student_progress_reports_v3(id) on delete cascade,profile_id uuid,read_at timestamptz not null default now(),primary key(report_id,profile_id));
alter table public.progress_report_reads_v33 enable row level security;
revoke all on public.progress_report_reads_v33 from public,anon,authenticated;
create function public.get_progress_reports_v33(p_student_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare s public.students%rowtype; result jsonb;
begin
 select * into s from public.students where id=p_student_id;
 if not found or not coalesce(s.teacher_id=public.get_current_teacher_id() or (s.active and public.erp_teacher_access_enabled_v26(s.teacher_id) and (s.id=public.get_current_student_id() or exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id))),false) then raise exception 'Acesso não permitido.'; end if;
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('student_name',coalesce(nullif(s.preferred_name,''),p.name),'teacher_name',tp.name,'unread',case when s.profile_id=auth.uid() and (s.birth_date is null or s.birth_date>(current_date-interval '18 years')::date) then false else coalesce(rd.read_at<r.updated_at,true) end) order by r.period_end desc,r.created_at desc),'[]'::jsonb) into result
 from public.student_progress_reports_v3 r join public.profiles p on p.id=s.profile_id join public.teachers t on t.id=s.teacher_id join public.profiles tp on tp.id=t.profile_id
 left join public.progress_report_reads_v33 rd on rd.report_id=r.id and rd.profile_id=auth.uid() where r.student_id=s.id;
 return result;
end; $$;
create function public.mark_progress_report_read_v33(p_report_id uuid)
returns void language plpgsql security definer set search_path=public,auth as $$
declare sid uuid; begin
 select student_id into sid from public.student_progress_reports_v3 where id=p_report_id;
 perform public.get_progress_reports_v33(sid);
 insert into public.progress_report_reads_v33(report_id,profile_id) values(p_report_id,auth.uid()) on conflict(report_id,profile_id) do update set read_at=now();
end; $$;
revoke all on function public.get_progress_reports_v33(uuid),public.mark_progress_report_read_v33(uuid) from public,anon;
grant execute on function public.get_progress_reports_v33(uuid),public.mark_progress_report_read_v33(uuid) to authenticated;

create table public.teacher_reservation_notices_v33(
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers(id),student_id uuid not null references public.students(id),
 reservation_id uuid not null references public.reservations(id),lesson_date date not null,start_time time not null,end_time time not null,created_at timestamptz not null default now(),read_at timestamptz
);
alter table public.teacher_reservation_notices_v33 enable row level security;
revoke all on public.teacher_reservation_notices_v33 from public,anon,authenticated;
create function public.notify_student_reservation_v33()
returns trigger language plpgsql security definer set search_path=public,auth as $$
begin
 if new.status='active' and exists(select 1 from public.students s where s.id=new.student_id and (s.profile_id=auth.uid() or exists(select 1 from public.guardian_students g where g.student_id=s.id and g.guardian_profile_id=auth.uid()))) then
  if tg_op='INSERT' or (new.reservation_date,new.start_time,new.end_time) is distinct from (old.reservation_date,old.start_time,old.end_time) then
   insert into public.teacher_reservation_notices_v33(teacher_id,student_id,reservation_id,lesson_date,start_time,end_time) values(new.teacher_id,new.student_id,new.id,new.reservation_date,new.start_time,new.end_time);
  end if;
 end if;
 return new;
end; $$;
create trigger student_reservation_notice_v33 after insert or update on public.reservations for each row execute function public.notify_student_reservation_v33();
create function public.get_teacher_notices_v33()
returns jsonb language sql stable security definer set search_path=public,auth as $$
 select coalesce(jsonb_agg(x.item order by x.created_at desc),'[]'::jsonb) from (
 select n.created_at,jsonb_build_object('id',n.id,'kind','makeup','student_name',coalesce(nullif(s.preferred_name,''),p.name),'lesson_date',n.lesson_date,'start_time',n.start_time,'end_time',n.end_time) item
 from public.teacher_reservation_notices_v33 n join public.students s on s.id=n.student_id join public.profiles p on p.id=s.profile_id where n.teacher_id=public.get_current_teacher_id() and n.read_at is null
 union all
 select c.cancelled_at,to_jsonb(c)||jsonb_build_object('id',c.lesson_id,'kind','cancellation','student_name',coalesce(nullif(s.preferred_name,''),c.student_name)) from public.get_teacher_student_cancellations() c join public.lessons l on l.id=c.lesson_id join public.students s on s.id=l.student_id
 ) x;
$$;
create function public.read_teacher_notice_v33(p_id uuid,p_kind text)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
 if p_kind='cancellation' then perform public.mark_student_cancellation_read(p_id);
 elsif p_kind='makeup' then update public.teacher_reservation_notices_v33 set read_at=now() where id=p_id and teacher_id=public.get_current_teacher_id();
 else raise exception 'Aviso inválido.'; end if;
end; $$;
revoke all on function public.get_teacher_notices_v33(),public.read_teacher_notice_v33(uuid,text) from public,anon;
grant execute on function public.get_teacher_notices_v33(),public.read_teacher_notice_v33(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
