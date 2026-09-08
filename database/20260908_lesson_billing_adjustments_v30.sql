begin;

-- These records affect billing only. Lessons, attendance and reschedules are untouched.
create table public.financial_lesson_exclusions_v30 (
  financial_id uuid not null references public.monthly_financial(id) on delete cascade,
  lesson_date date not null,
  start_time time not null,
  excluded boolean not null,
  reason text not null check (length(btrim(reason)) between 3 and 500),
  lesson_snapshot jsonb not null,
  unit_value numeric not null check (unit_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (financial_id, lesson_date, start_time)
);
create table public.financial_lesson_audit_v30 (
  id bigint generated always as identity primary key,
  financial_id uuid not null references public.monthly_financial(id) on delete cascade,
  lesson_date date not null, start_time time not null,
  excluded boolean not null, reason text not null,
  actor_id uuid not null, created_at timestamptz not null default now(),
  amount_before numeric not null, amount_after numeric not null,
  payment_status text not null
);
alter table public.financial_lesson_exclusions_v30 enable row level security;
alter table public.financial_lesson_audit_v30 enable row level security;
revoke all on public.financial_lesson_exclusions_v30, public.financial_lesson_audit_v30 from public, anon, authenticated;

create function public.get_financial_lesson_report_v30(p_student_id uuid, p_year integer, p_month integer)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare
  s public.students%rowtype; f public.monthly_financial%rowtype;
  rows_json jsonb; history_json jsonb; result_json jsonb; can_edit boolean; hide_values boolean;
begin
  select * into s from public.students where id=coalesce(p_student_id,public.get_current_student_id()) and active;
  if not found then raise exception 'Aluno não encontrado.'; end if;
  can_edit := coalesce(s.teacher_id=public.get_current_teacher_id(),false);
  if not coalesce((can_edit or (public.erp_teacher_access_enabled_v26(s.teacher_id) and (
    s.id=public.get_current_student_id() or exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id)
  ))),false) then raise exception 'Acesso não permitido.'; end if;
  hide_values := s.profile_id=auth.uid() and (s.birth_date is null or s.birth_date > (current_date-interval '18 years')::date);
  select * into f from public.monthly_financial where student_id=s.id and year=p_year and month=p_month order by created_at desc,id limit 1;
  if not found then raise exception 'Mensalidade ainda não disponibilizada.'; end if;
  with source_rows as (
    select to_jsonb(o) as row_data, o.lesson_date, o.start_time
    from public.financial_student_monthly_occurrences(s.id,p_year,p_month) o
  ), all_rows as (
    select * from source_rows
    union all
    select e.lesson_snapshot,e.lesson_date,e.start_time from public.financial_lesson_exclusions_v30 e
    where e.financial_id=f.id and not exists(select 1 from source_rows b where b.lesson_date=e.lesson_date and b.start_time=e.start_time)
  )
  select coalesce(jsonb_agg(b.row_data || jsonb_build_object(
    'excluded',coalesce(e.excluded,false),'exclusion_reason',e.reason,
    'unit_value',case when hide_values then null else coalesce(e.unit_value,f.lesson_unit_value) end
  ) order by b.lesson_date,b.start_time),'[]'::jsonb) into rows_json
  from all_rows b left join public.financial_lesson_exclusions_v30 e
    on e.financial_id=f.id and e.lesson_date=b.lesson_date and e.start_time=b.start_time;
  select coalesce(jsonb_agg(jsonb_build_object('lesson_date',a.lesson_date,'start_time',a.start_time,
    'excluded',a.excluded,'reason',a.reason,'created_at',a.created_at,
    'amount_before',case when hide_values then null else a.amount_before end,
    'amount_after',case when hide_values then null else a.amount_after end
  ) order by a.id desc),'[]'::jsonb) into history_json from public.financial_lesson_audit_v30 a where a.financial_id=f.id;
  result_json := jsonb_build_object('financial_id',f.id,'student_id',s.id,'year',f.year,'month',f.month,
    'can_edit',can_edit,'values_hidden',hide_values,'billing_type',f.billing_type,
    'amount',case when hide_values then null else f.amount end,
    'discount',case when hide_values then null else f.discount end,
    'unit_value',case when hide_values then null else f.lesson_unit_value end,
    'payment_status',f.payment_status,'paid_at',f.paid_at,'due_date',f.due_date,
    'lessons',rows_json,'history',history_json);
  return result_json || jsonb_build_object('version',md5(result_json::text));
end; $$;

create function public.set_financial_lesson_exclusion_v30(
  p_financial_id uuid,p_lesson_date date,p_start_time time,p_excluded boolean,p_reason text,
  p_expected_version text,p_apply boolean default false
)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare
  f public.monthly_financial%rowtype; e public.financial_lesson_exclusions_v30%rowtype;
  report jsonb; lesson jsonb; next_amount numeric; unit_amount numeric; reason_value text;
begin
  select * into f from public.monthly_financial where id=p_financial_id for update;
  if not found or f.teacher_id is distinct from public.get_current_teacher_id() then
    raise exception 'Somente o professor deste aluno pode ajustar a cobrança.';
  end if;
  if f.billing_type <> 'per_lesson' then raise exception 'Esta mensalidade tem valor fixo. O ajuste por aula é disponível para cobranças por aula.'; end if;
  if p_excluded is null or p_apply is null then raise exception 'Ação inválida.'; end if;
  reason_value := btrim(coalesce(p_reason,''));
  if length(reason_value) not between 3 and 500 then raise exception 'Informe um motivo entre 3 e 500 caracteres.'; end if;
  report := public.get_financial_lesson_report_v30(f.student_id,f.year,f.month);
  if p_expected_version is distinct from report->>'version' then raise exception 'A cobrança mudou. Atualize o relatório e confira novamente antes de salvar.'; end if;
  select x into lesson from jsonb_array_elements(report->'lessons') x
    where (x->>'lesson_date')::date=p_lesson_date and (x->>'start_time')::time=p_start_time;
  if lesson is null then raise exception 'Aula não encontrada nesta cobrança.'; end if;
  if (lesson->>'excluded')::boolean=p_excluded then raise exception 'Esta aula já está com a opção selecionada. Atualize o relatório.'; end if;
  unit_amount := (lesson->>'unit_value')::numeric;
  if unit_amount is null or unit_amount<0 then raise exception 'Valor por aula inválido nesta mensalidade.'; end if;
  next_amount := f.amount;
  if f.payment_status <> 'paid' then
    next_amount := f.amount + case when p_excluded then -unit_amount else unit_amount end;
    if next_amount<coalesce(f.discount,0) or next_amount<0 then raise exception 'O ajuste ultrapassa o saldo desta cobrança. Revise o valor e o desconto antes de continuar.'; end if;
  end if;
  if p_apply then
    insert into public.financial_lesson_exclusions_v30(financial_id,lesson_date,start_time,excluded,reason,lesson_snapshot,unit_value)
      values(f.id,p_lesson_date,p_start_time,p_excluded,reason_value,lesson,unit_amount)
      on conflict(financial_id,lesson_date,start_time) do update set excluded=excluded.excluded,reason=excluded.reason,updated_at=now();
    insert into public.financial_lesson_audit_v30(financial_id,lesson_date,start_time,excluded,reason,actor_id,amount_before,amount_after,payment_status)
      values(f.id,p_lesson_date,p_start_time,p_excluded,reason_value,auth.uid(),f.amount,next_amount,f.payment_status);
    if f.payment_status <> 'paid' then
      update public.monthly_financial set amount=next_amount,
        lesson_count=(select count(*) from jsonb_array_elements(report->'lessons') x where not (x->>'excluded')::boolean)
          + case when p_excluded then -1 else 1 end
      where id=f.id;
    end if;
  end if;
  return jsonb_build_object('amount_before',greatest(0,f.amount-coalesce(f.discount,0)),
    'amount_after',greatest(0,next_amount-coalesce(f.discount,0)),
    'paid_preserved',f.payment_status='paid','lesson_value',unit_amount,'applied',p_apply);
end; $$;

-- Keep existing schedules intact; only billing counters and explicit financial recalculation use this filter.
create function public.financial_billable_occurrences_v30(p_student_id uuid,p_year integer,p_month integer)
returns table(student_id uuid,teacher_id uuid,lesson_date date,start_time time,end_time time,lesson_status text,attendance_status text,subject_name text,content_title text,teacher_notes text)
language sql stable security definer set search_path=public,auth as $$
  select o.* from public.financial_student_monthly_occurrences(p_student_id,p_year,p_month) o
  where not exists(select 1 from public.financial_lesson_exclusions_v30 e join public.monthly_financial f on f.id=e.financial_id
    where f.student_id=p_student_id and f.year=p_year and f.month=p_month and e.excluded
      and e.lesson_date=o.lesson_date and e.start_time=o.start_time);
$$;
do $$ declare name text; original text; revised text; begin
  foreach name in array array['count_teacher_student_billable_lessons(uuid,integer,integer)','recalculate_teacher_monthly_financial_v25(integer,integer)'] loop
    original:=pg_get_functiondef(('public.'||name)::regprocedure);
    revised:=replace(original,'public.financial_student_monthly_occurrences','public.financial_billable_occurrences_v30');
    if revised=original then raise exception 'Unexpected billing definition: %',name; end if;
    execute revised;
  end loop;
end; $$;
revoke all on function public.get_financial_lesson_report_v30(uuid,integer,integer), public.set_financial_lesson_exclusion_v30(uuid,date,time,boolean,text,text,boolean), public.financial_billable_occurrences_v30(uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.get_financial_lesson_report_v30(uuid,integer,integer), public.set_financial_lesson_exclusion_v30(uuid,date,time,boolean,text,text,boolean) to authenticated;
commit;
