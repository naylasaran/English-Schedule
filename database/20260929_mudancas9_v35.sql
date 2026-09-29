begin;

create function public.get_admin_teacher_registration_v35()
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.is_current_admin() then raise exception 'Acesso exclusivo da administração.';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('teacher_id',id,'registered_at',created_at)),'[]'::jsonb) from public.teachers);
end; $$;

alter table public.student_progress_reports_v3 add column deleted_at_v35 timestamptz;
create function public.set_progress_report_deleted_v35(p_id uuid,p_deleted boolean)
returns void language plpgsql security definer set search_path=public,auth as $$
begin
 update public.student_progress_reports_v3 set deleted_at_v35=case when p_deleted then now() else null end
 where id=p_id and teacher_id=public.get_current_teacher_id();
 if not found then raise exception 'Relatório não encontrado para este professor.';end if;
end; $$;
do $$ declare src text; revised text; begin
 src:=pg_get_functiondef('public.get_progress_reports_v33(uuid)'::regprocedure);
 revised:=replace(src,'where r.student_id=s.id','where r.student_id=s.id and r.deleted_at_v35 is null');
 if revised=src then raise exception 'Revisar consulta de relatórios antes de aplicar.';end if;
 execute revised;
end; $$;

-- File contents have no public URL or direct client access. Only administrators
-- can retrieve bytes; teachers receive receipt metadata for their own account.
create table public.system_payment_receipts_v35 (
 id uuid primary key default gen_random_uuid(), financial_id uuid not null references public.teacher_system_financial(id),
 teacher_id uuid not null references public.teachers(id), filename text not null, mime_type text not null,
 contents bytea not null check(octet_length(contents) between 1 and 3145728), created_at timestamptz not null default now()
);
alter table public.system_payment_receipts_v35 enable row level security;
revoke all on public.system_payment_receipts_v35 from public,anon,authenticated;

create function public.submit_system_receipt_v35(p_financial_id uuid,p_filename text,p_mime text,p_base64 text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare tid uuid; data bytea; rid uuid;
begin
 select f.teacher_id into tid from public.teacher_system_financial f join public.teachers t on t.id=f.teacher_id
 where f.id=p_financial_id and t.profile_id=auth.uid() and t.active and t.account_status='active' and f.payment_status<>'paid';
 if tid is null then raise exception 'Cobrança pendente não encontrada para este professor.';end if;
 if length(p_base64)>4194304 or p_base64 is null then raise exception 'Envie um arquivo de até 3 MB.';end if;
 data:=decode(p_base64,'base64');
 if not coalesce((p_mime='application/pdf' and substring(data from 1 for 5)=decode('255044462d','hex'))
 or (p_mime='image/png' and substring(data from 1 for 8)=decode('89504e470d0a1a0a','hex'))
 or (p_mime='image/jpeg' and substring(data from 1 for 3)=decode('ffd8ff','hex')),false)
 then raise exception 'Envie um PDF, PNG ou JPG válido.';end if;
 perform 1 from public.teachers where id=tid for update;
 if (select count(*) from public.system_payment_receipts_v35 where financial_id=p_financial_id)>=10 then raise exception 'Limite de envios para esta cobrança atingido. Entre em contato com o suporte.';end if;
 insert into public.system_payment_receipts_v35(financial_id,teacher_id,filename,mime_type,contents)
 values(p_financial_id,tid,left(regexp_replace(coalesce(p_filename,'comprovante'),'[^[:alnum:] ._-]','','g'),160),p_mime,data) returning id into rid;
 return rid;
end; $$;

create function public.get_system_receipts_v35(p_admin boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare result jsonb; begin
 if p_admin and not public.is_current_admin() then raise exception 'Acesso exclusivo da administração.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'financial_id',f.id,'teacher_id',t.id,'teacher_name',p.name,
 'year',f.year,'month',f.month,'amount',f.amount,'payment_status',f.payment_status,'filename',r.filename,'mime_type',r.mime_type,'created_at',r.created_at)
 order by f.year desc,f.month desc,r.created_at desc),'[]'::jsonb) into result
 from public.teacher_system_financial f join public.teachers t on t.id=f.teacher_id join public.profiles p on p.id=t.profile_id
 left join public.system_payment_receipts_v35 r on r.financial_id=f.id
 where (p_admin and r.id is not null) or (not p_admin and t.profile_id=auth.uid());
 return result;
end; $$;
create function public.download_system_receipt_v35(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if not public.is_current_admin() then raise exception 'Acesso exclusivo da administração.';end if;
 return (select jsonb_build_object('filename',filename,'mime_type',mime_type,'base64',encode(contents,'base64')) from public.system_payment_receipts_v35 where id=p_id);
end; $$;

revoke all on function public.get_admin_teacher_registration_v35(),public.set_progress_report_deleted_v35(uuid,boolean),public.submit_system_receipt_v35(uuid,text,text,text),public.get_system_receipts_v35(boolean),public.download_system_receipt_v35(uuid) from public,anon;
grant execute on function public.get_admin_teacher_registration_v35(),public.set_progress_report_deleted_v35(uuid,boolean),public.submit_system_receipt_v35(uuid,text,text,text),public.get_system_receipts_v35(boolean),public.download_system_receipt_v35(uuid) to authenticated;

create table public.lesson_change_requests_v35 (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),teacher_id uuid not null references public.teachers(id),
 schedule jsonb not null,original_schedule jsonb not null,original_duration integer not null,duration integer not null check(duration in(30,60,90,120)),
 billing_type text not null,new_value numeric check(new_value>=0),original_value numeric,
 needs_guardian boolean not null,guardian_approved_by uuid,teacher_approved_by uuid,effective_date date not null,
 status text not null default 'pending' check(status in('pending','approved','applied','rejected','conflict')),
 created_at timestamptz not null default now(),applied_at timestamptz,detail text
);
create unique index lesson_change_open_v35 on public.lesson_change_requests_v35(student_id) where status in('pending','approved','conflict');
create function public.lesson_duration_on_v35(p_student uuid,p_date date,p_default integer)
returns integer language sql stable security definer set search_path=public as $$
 select coalesce((select duration from public.lesson_change_requests_v35 where student_id=p_student and status='applied' and effective_date<=p_date order by effective_date desc,created_at desc limit 1),
 (select original_duration from public.lesson_change_requests_v35 where student_id=p_student and status='applied' order by effective_date,created_at limit 1),p_default);
$$;
revoke all on function public.lesson_duration_on_v35(uuid,date,integer) from public,anon,authenticated;
-- Historical billing occurrences must keep the duration valid on their date.
do $$ declare src text; revised text; begin
 src:=pg_get_functiondef('public.financial_schedule_occurrences_before_v26(uuid,integer,integer)'::regprocedure);
 revised:=replace(src,'n.start_time + make_interval(mins => v_duration)','n.start_time + make_interval(mins => public.lesson_duration_on_v35(p_student_id,n.lesson_date,v_duration))');
 revised:=regexp_replace(revised,'v_blocks_per_lesson\s*\) = 0','public.lesson_duration_on_v35(p_student_id,n.lesson_date,v_duration)/30) = 0');
 if revised=src then raise exception 'Revisar duração histórica das ocorrências.';end if;execute revised;
 src:=pg_get_functiondef('public.financial_student_monthly_occurrences(uuid,integer,integer)'::regprocedure);
 revised:=replace(src,'make_interval(mins=>v_student.class_duration_minutes)','make_interval(mins=>public.lesson_duration_on_v35(p_student_id,r.original_date,v_student.class_duration_minutes))');
 if revised=src then raise exception 'Revisar duração histórica dos reagendamentos.';end if;execute revised;
end; $$;

create table public.financial_lesson_rates_v35 (
 financial_id uuid not null references public.monthly_financial(id),lesson_date date not null,start_time time not null,unit_value numeric not null,
 primary key(financial_id,lesson_date,start_time)
);
alter table public.financial_lesson_rates_v35 enable row level security;
revoke all on public.financial_lesson_rates_v35 from public,anon,authenticated;
do $$ declare src text; revised text; begin
 src:=pg_get_functiondef('public.get_financial_lesson_report_v30(uuid,integer,integer)'::regprocedure);
 revised:=replace(src,'coalesce(e.unit_value,f.lesson_unit_value)','coalesce((select rate.unit_value from public.financial_lesson_rates_v35 rate where rate.financial_id=f.id and rate.lesson_date=b.lesson_date and rate.start_time=b.start_time),e.unit_value,f.lesson_unit_value)');
 if revised=src then raise exception 'Revisar valor por aula no resumo.';end if;execute revised;
end; $$;
create table public.lesson_change_holds_v35 (
 request_id uuid not null references public.lesson_change_requests_v35(id),teacher_id uuid not null references public.teachers(id),
 day_of_week integer not null,start_time time not null,primary key(teacher_id,day_of_week,start_time)
);
alter table public.lesson_change_requests_v35 enable row level security;
alter table public.lesson_change_holds_v35 enable row level security;
revoke all on public.lesson_change_requests_v35,public.lesson_change_holds_v35 from public,anon,authenticated;

create function public.fixed_snapshot_v35(p_student uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('day',day_of_week,'time',start_time) order by day_of_week,start_time),'[]'::jsonb)
 from public.weekly_schedule where student_id=p_student and status='lesson';
$$;

create function public.validate_lesson_change_v35(r public.lesson_change_requests_v35)
returns void language plpgsql security definer set search_path=public,auth as $$
declare t public.teachers;s public.students;item jsonb;day integer;starts time;dest time;minute integer;n integer;keys text[]:=array[]::text[];key text;
begin
 select * into s from public.students where id=r.student_id;
 select * into t from public.teachers where id=r.teacher_id;
 if not s.active or s.teacher_id<>r.teacher_id or s.class_duration_minutes<>r.original_duration
 or s.billing_type<>r.billing_type or public.fixed_snapshot_v35(s.id)<>r.original_schedule then raise exception 'O cadastro ou a agenda mudou. Recuse esta solicitação e envie uma nova.';end if;
 if jsonb_typeof(r.schedule)<>'array' or jsonb_array_length(r.schedule) not between 1 and 28 then raise exception 'Escolha de 1 a 28 aulas por semana.';end if;
 if r.duration not in(30,60,90,120) then raise exception 'Duração inválida.';end if;
 for item in select value from jsonb_array_elements(r.schedule) loop
  day:=(item->>'day_of_week')::integer;starts:=(item->>'start_time')::time;minute:=extract(epoch from starts)::integer/60;
  if day is null or starts is null or day not between 0 and 6 or mod(minute,30)<>0 or extract(second from starts)<>0 or minute+r.duration>1440
  or not day=any(t.work_days) or starts<t.work_start_time or minute+r.duration>(case when t.work_end_time='00:00' then 1440 else extract(epoch from t.work_end_time)/60 end)
  then raise exception 'Escolha um horário dentro do atendimento do professor.';end if;
  for n in 0..r.duration/30-1 loop
   dest:=(starts+make_interval(mins=>30*n))::time;key:=day||'|'||dest;
   if key=any(keys) then raise exception 'Existem aulas sobrepostas na solicitação.';end if;keys:=array_append(keys,key);
   if exists(select 1 from public.weekly_schedule w where w.teacher_id=r.teacher_id and w.day_of_week=day and w.start_time=dest and w.status<>'free' and not(w.status='lesson' and w.student_id=r.student_id))
   or exists(select 1 from public.lesson_change_holds_v35 h where h.teacher_id=r.teacher_id and h.day_of_week=day and h.start_time=dest and h.request_id is distinct from r.id)
   or exists(select 1 from public.reservations v where v.teacher_id=r.teacher_id and v.status='active' and v.reservation_date>=r.effective_date and extract(dow from v.reservation_date)=day and dest>=v.start_time and (dest<v.end_time or v.end_time='00:00'))
   or exists(select 1 from public.weekly_schedule_exceptions e where e.teacher_id=r.teacher_id and e.exception_date>=r.effective_date and extract(dow from e.exception_date)=day and e.start_time=dest and e.status<>'free')
   then raise exception 'Um dos horários escolhidos está ocupado ou reservado provisoriamente.';end if;
  end loop;
 end loop;
end; $$;

create function public.request_lesson_change_v35(p_student_id uuid,p_duration integer,p_schedule jsonb)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare r public.lesson_change_requests_v35;s public.students;item jsonb;n integer;
begin
 if not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 select * into s from public.students where id=p_student_id;
 if s.id is distinct from public.get_current_student_id() and not exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id) then raise exception 'Solicitação exclusiva do aluno ou responsável.';end if;
 perform 1 from public.teachers where id=s.teacher_id for update;
 if exists(select 1 from public.schedule_requests_v34 where student_id=s.id and status in('pending','approved','conflict')) then raise exception 'Conclua a troca de horário pendente antes de alterar as aulas.';end if;
 r.id:=gen_random_uuid();r.student_id:=s.id;r.teacher_id:=s.teacher_id;r.schedule:=p_schedule;r.duration:=p_duration;r.original_duration:=s.class_duration_minutes;
 r.original_schedule:=public.fixed_snapshot_v35(s.id);r.billing_type:=s.billing_type;r.original_value:=case when s.billing_type='per_lesson' then s.lesson_fee else s.monthly_fee end;
 r.effective_date:=(date_trunc('week',timezone('America/Sao_Paulo',now()))+interval '1 week')::date;
 r.needs_guardian:=s.birth_date is null or s.birth_date>(timezone('America/Sao_Paulo',now())::date-interval '18 years')::date;
 if exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id) then r.guardian_approved_by:=auth.uid();end if;
 perform public.validate_lesson_change_v35(r);
 insert into public.lesson_change_requests_v35(id,student_id,teacher_id,schedule,original_schedule,original_duration,duration,billing_type,original_value,needs_guardian,guardian_approved_by,effective_date)
 values(r.id,s.id,s.teacher_id,r.schedule,r.original_schedule,r.original_duration,r.duration,r.billing_type,r.original_value,r.needs_guardian,r.guardian_approved_by,r.effective_date);
 for item in select value from jsonb_array_elements(r.schedule) loop
  for n in 0..r.duration/30-1 loop
   insert into public.lesson_change_holds_v35 values(r.id,r.teacher_id,(item->>'day_of_week')::integer,((item->>'start_time')::time+make_interval(mins=>30*n))::time);
  end loop;
 end loop;
 return r.id;
end; $$;

create function public.review_lesson_change_v35(p_id uuid,p_approve boolean,p_value numeric default null)
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.lesson_change_requests_v35;isteacher boolean;isguardian boolean;
begin
 select * into r from public.lesson_change_requests_v35 where id=p_id;
 if not found or not public.can_view_schedule_request_v34(r.student_id) then raise exception 'Acesso não permitido.';end if;
 perform 1 from public.teachers where id=r.teacher_id for update;
 select * into r from public.lesson_change_requests_v35 where id=p_id for update;
 if r.status not in('pending','approved','conflict') then raise exception 'Solicitação encerrada.';end if;
 isteacher:=coalesce(r.teacher_id=public.get_current_teacher_id(),false);isguardian:=exists(select 1 from public.get_my_guardian_students() g where g.student_id=r.student_id);
 if not p_approve then
  update public.lesson_change_requests_v35 set status='rejected',detail='Solicitação cancelada ou recusada.' where id=p_id;
  delete from public.lesson_change_holds_v35 where request_id=p_id;return;
 end if;
 if not isteacher and not isguardian then raise exception 'A aprovação depende do professor ou responsável.';end if;
 r.effective_date:=(date_trunc('week',timezone('America/Sao_Paulo',now()))+interval '1 week')::date;
 perform public.validate_lesson_change_v35(r);
 if isteacher then
  if p_value is null or p_value<0 or p_value>999999.99 then raise exception 'Informe o novo valor ao aprovar.';end if;
  r.new_value:=round(p_value,2);r.teacher_approved_by:=auth.uid();
 else r.guardian_approved_by:=auth.uid();end if;
 update public.lesson_change_requests_v35 set new_value=r.new_value,teacher_approved_by=r.teacher_approved_by,guardian_approved_by=r.guardian_approved_by,effective_date=r.effective_date,detail=null,
 status=case when r.teacher_approved_by is not null and (not r.needs_guardian or r.guardian_approved_by is not null) then 'approved' else 'pending' end where id=p_id;
end; $$;

create function public.guard_lesson_hold_v35()
returns trigger language plpgsql security definer set search_path=public,auth as $$
declare day integer;date_from date;finish integer;
begin
 if new.status='free' or new.status in('cancelled','completed') then return new;end if;
 perform 1 from public.teachers where id=new.teacher_id for update;
 if tg_table_name='weekly_schedule' then day:=new.day_of_week;date_from:=null;
 elsif tg_table_name='reservations' then day:=extract(dow from new.reservation_date);date_from:=new.reservation_date;
 else day:=extract(dow from new.exception_date);date_from:=new.exception_date;end if;
 finish:=case when new.end_time='00:00' then 1440 else extract(epoch from new.end_time)/60 end;
 if exists(select 1 from public.lesson_change_holds_v35 h join public.lesson_change_requests_v35 r on r.id=h.request_id
 where h.teacher_id=new.teacher_id and h.day_of_week=day and h.start_time>=new.start_time and extract(epoch from h.start_time)/60<finish
 and (date_from is null or date_from>=r.effective_date)
 and not coalesce(tg_table_name='weekly_schedule' and new.student_id=r.student_id and new.status='lesson',false)) then
 raise exception 'Horário reservado provisoriamente para uma alteração de aulas. Resolva a solicitação primeiro.';end if;
 return new;
end; $$;
create trigger hold_weekly_v35 before insert or update on public.weekly_schedule for each row execute function public.guard_lesson_hold_v35();
create trigger hold_reservation_v35 before insert or update on public.reservations for each row execute function public.guard_lesson_hold_v35();
create trigger hold_exception_v35 before insert or update on public.weekly_schedule_exceptions for each row execute function public.guard_lesson_hold_v35();

create function public.get_lesson_changes_v35(p_student_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
begin
 if p_student_id is not null and not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 return (select coalesce(jsonb_agg((to_jsonb(r)-'original_value'-'new_value')||jsonb_build_object(
 'original_value',case when s.profile_id=auth.uid() and r.needs_guardian then null else r.original_value end,
 'new_value',case when s.profile_id=auth.uid() and r.needs_guardian then null else r.new_value end,
 'student_name',coalesce(nullif(s.preferred_name,''),p.name),'can_teacher',r.teacher_id=public.get_current_teacher_id(),
 'can_guardian',exists(select 1 from public.get_my_guardian_students() g where g.student_id=s.id)) order by r.created_at desc),'[]'::jsonb)
 from public.lesson_change_requests_v35 r join public.students s on s.id=r.student_id join public.profiles p on p.id=s.profile_id
 where (p_student_id is null or s.id=p_student_id) and public.can_view_schedule_request_v34(s.id));
end; $$;

create function public.get_lesson_choices_v35(p_student_id uuid,p_duration integer)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare t public.teachers;s public.students;r public.lesson_change_requests_v35;day integer;minute integer;choices jsonb:='[]';first_date date;
begin
 if not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
 if p_duration not in(30,60,90,120) then raise exception 'Duração inválida.';end if;
 select * into s from public.students where id=p_student_id;select * into t from public.teachers where id=s.teacher_id;
 r.student_id:=s.id;r.teacher_id:=t.id;r.duration:=p_duration;r.original_duration:=s.class_duration_minutes;r.original_schedule:=public.fixed_snapshot_v35(s.id);r.billing_type:=s.billing_type;
 r.effective_date:=(date_trunc('week',timezone('America/Sao_Paulo',now()))+interval '1 week')::date;
 for day in 0..6 loop
  for minute in 0..47 loop
   r.schedule:=jsonb_build_array(jsonb_build_object('day_of_week',day,'start_time',(time '00:00'+make_interval(mins=>30*minute))::time));
   begin perform public.validate_lesson_change_v35(r);choices:=choices||r.schedule;exception when raise_exception then null;end;
  end loop;
 end loop;
 return jsonb_build_object('choices',choices,'duration',s.class_duration_minutes,'fixed',public.get_my_fixed_slots_v34(s.id),'effective_date',r.effective_date);
end; $$;

revoke all on function public.fixed_snapshot_v35(uuid),public.validate_lesson_change_v35(public.lesson_change_requests_v35),public.guard_lesson_hold_v35() from public,anon,authenticated;
revoke all on function public.request_lesson_change_v35(uuid,integer,jsonb),public.review_lesson_change_v35(uuid,boolean,numeric),public.get_lesson_changes_v35(uuid),public.get_lesson_choices_v35(uuid,integer) from public,anon;
grant execute on function public.request_lesson_change_v35(uuid,integer,jsonb),public.review_lesson_change_v35(uuid,boolean,numeric),public.get_lesson_changes_v35(uuid),public.get_lesson_choices_v35(uuid,integer) to authenticated;

-- A private copy of the tested replacement routine accepts the effective date
-- explicitly so the scheduler does not impersonate an authenticated teacher.
do $$ declare src text; begin
 src:=pg_get_functiondef('public.replace_teacher_student_weekly_schedule(uuid,jsonb)'::regprocedure);
 src:=replace(src,'public.replace_teacher_student_weekly_schedule(p_student_id uuid, p_schedule jsonb)',
 'public.apply_full_schedule_v35(p_student_id uuid, p_schedule jsonb, p_teacher uuid, p_effective date)');
 src:=replace(src,'teacher uuid:=public.get_current_teacher_id()','teacher uuid:=p_teacher');
 src:=replace(src,'change_date date:=(now() at time zone ''America/Sao_Paulo'')::date','change_date date:=p_effective');
 src:=replace(src,'and exists(select 1 from generate_series(0,duration/30-1) n where not exists(',
 'and (mod((extract(epoch from (l.end_time-l.start_time))/60)::integer+1440,1440)<>duration or not exists(select 1 from jsonb_array_elements(p_schedule) x where (x->>''day_of_week'')::integer=extract(dow from l.lesson_date)::integer and (x->>''start_time'')::time=l.start_time) or exists(select 1 from generate_series(0,duration/30-1) n where not exists(');
 src:=replace(src,'w.start_time=(l.start_time+make_interval(mins=>n*30))::time));','w.start_time=(l.start_time+make_interval(mins=>n*30))::time)));');
 if src not like '%public.apply_full_schedule_v35(%' then raise exception 'Revisar rotina de agenda.';end if;
 execute src;
end; $$;
revoke all on function public.apply_full_schedule_v35(uuid,jsonb,uuid,date) from public,anon,authenticated;

do $$ declare src text;revised text; begin
 src:=pg_get_functiondef('public.financial_student_monthly_occurrences(uuid,integer,integer)'::regprocedure);
 revised:=replace(src,'FUNCTION public.financial_student_monthly_occurrences(','FUNCTION public.financial_occurrences_private_v35(');
 revised:=regexp_replace(revised,'if not coalesce\(\(public.erp_is_current_admin_v2\(\).*?end if;','','s');
 if revised=src or revised like '%Você não pode consultar%' then raise exception 'Revisar consulta financeira privada.';end if;
 execute revised;
end; $$;
revoke all on function public.financial_occurrences_private_v35(uuid,integer,integer) from public,anon,authenticated;

create function public.apply_lesson_changes_v35()
returns void language plpgsql security definer set search_path=public,auth as $$
declare r public.lesson_change_requests_v35;f public.monthly_financial;cnt integer;total numeric;old_counts jsonb;old_count integer;old_total numeric;
begin
 for r in select * from public.lesson_change_requests_v35 where status='approved' and effective_date<=timezone('America/Sao_Paulo',now())::date order by created_at for update skip locked loop
  begin
   perform 1 from public.teachers where id=r.teacher_id for update;
   if not public.erp_teacher_access_enabled_v26(r.teacher_id) then raise exception 'Acesso do professor indisponível.';end if;
   if r.teacher_approved_by is null or r.new_value is null or (r.needs_guardian and not exists(select 1 from public.guardian_students where student_id=r.student_id and guardian_profile_id=r.guardian_approved_by)) then raise exception 'Aprovação necessária indisponível.';end if;
   perform public.validate_lesson_change_v35(r);
   old_counts:='{}'::jsonb;
   if r.billing_type='per_lesson' then
    for f in select * from public.monthly_financial where student_id=r.student_id and teacher_id=r.teacher_id and payment_status<>'paid' and make_date(year,month,1)>=date_trunc('month',r.effective_date)::date for update loop
     select count(*)::integer,coalesce(sum(coalesce((select rate.unit_value from public.financial_lesson_rates_v35 rate where rate.financial_id=f.id and rate.lesson_date=o.lesson_date and rate.start_time=o.start_time),f.lesson_unit_value,r.original_value)),0) into old_count,old_total from public.financial_occurrences_private_v35(r.student_id,f.year,f.month) o where o.lesson_date>=r.effective_date
      and not exists(select 1 from public.financial_lesson_exclusions_v30 e where e.financial_id=f.id and e.lesson_date=o.lesson_date and e.start_time=o.start_time and e.excluded);
     old_counts:=old_counts||jsonb_build_object(f.id::text,jsonb_build_object('count',old_count,'amount',old_total));
    end loop;
   end if;
   update public.students set class_duration_minutes=r.duration,
    monthly_fee=case when r.billing_type='monthly' then r.new_value else monthly_fee end,
    lesson_fee=case when r.billing_type='per_lesson' then r.new_value else lesson_fee end where id=r.student_id;
   perform public.apply_full_schedule_v35(r.student_id,r.schedule,r.teacher_id,r.effective_date);
   update public.lesson_change_requests_v35 set status='applied',applied_at=now(),detail=null where id=r.id;
   -- Recalculate only future, unpaid months. Earlier invoices, paid amounts,
   -- discounts and manual lesson exclusions remain intact.
   for f in select * from public.monthly_financial where student_id=r.student_id and teacher_id=r.teacher_id
    and payment_status<>'paid' and make_date(year,month,1)>=date_trunc('month',r.effective_date)::date for update loop
    if r.billing_type='monthly' then total:=r.new_value;cnt:=f.lesson_count;
    else
     select count(*)::integer into cnt from public.financial_occurrences_private_v35(r.student_id,f.year,f.month) o
     where o.lesson_date>=r.effective_date and not exists(select 1 from public.financial_lesson_exclusions_v30 e where e.financial_id=f.id and e.lesson_date=o.lesson_date and e.start_time=o.start_time and e.excluded);
     old_count:=(old_counts->f.id::text->>'count')::integer;
     old_total:=(old_counts->f.id::text->>'amount')::numeric;
     total:=f.amount-old_total+cnt*r.new_value;
     cnt:=greatest(0,coalesce(f.lesson_count,old_count)-old_count+cnt);
     insert into public.financial_lesson_rates_v35(financial_id,lesson_date,start_time,unit_value)
      select f.id,o.lesson_date,o.start_time,r.new_value from public.financial_occurrences_private_v35(r.student_id,f.year,f.month) o where o.lesson_date>=r.effective_date
      on conflict(financial_id,lesson_date,start_time) do update set unit_value=excluded.unit_value;
    end if;
    if total<coalesce(f.discount,0) then raise exception 'O desconto da cobrança supera o novo valor. Revise a cobrança antes de aprovar novamente.';end if;
    update public.monthly_financial set amount=total,lesson_count=cnt,
     lesson_unit_value=case when r.billing_type='per_lesson' and r.effective_date>make_date(f.year,f.month,1) then f.lesson_unit_value else r.new_value end where id=f.id;
   end loop;
   delete from public.lesson_change_holds_v35 where request_id=r.id;
   update public.lesson_change_requests_v35 set status='applied',applied_at=now(),detail=null where id=r.id;
  exception when others then
   update public.lesson_change_requests_v35 set status='conflict',teacher_approved_by=null,detail=sqlerrm where id=r.id;
  end;
 end loop;
end; $$;
revoke all on function public.apply_lesson_changes_v35() from public,anon,authenticated;
select cron.schedule('aularium-lesson-changes-v35','* * * * *','select public.apply_lesson_changes_v35()');

create function public.get_lesson_holds_v35(p_student_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare tid uuid;isteacher boolean; begin
 if p_student_id is null then tid:=public.get_current_teacher_id();isteacher:=true;
 else
  if not public.can_view_schedule_request_v34(p_student_id) then raise exception 'Acesso não permitido.';end if;
  select teacher_id into tid from public.students where id=p_student_id;isteacher:=false;
 end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('day_of_week',h.day_of_week,'start_time',h.start_time,'effective_date',r.effective_date,
 'student_name',case when isteacher or r.student_id=p_student_id then coalesce(nullif(s.preferred_name,''),p.name) else null end)),'[]'::jsonb)
 from public.lesson_change_holds_v35 h join public.lesson_change_requests_v35 r on r.id=h.request_id join public.students s on s.id=r.student_id join public.profiles p on p.id=s.profile_id where h.teacher_id=tid);
end; $$;
revoke all on function public.get_lesson_holds_v35(uuid) from public,anon;
grant execute on function public.get_lesson_holds_v35(uuid) to authenticated;

do $$ declare src text; begin
 src:=pg_get_functiondef('public.request_schedule_change_v34(uuid,integer,time,integer,time)'::regprocedure);
 src:=replace(src,'r.student_id:=s.id;',
 'if exists(select 1 from public.lesson_change_requests_v35 where student_id=s.id and status in (''pending'',''approved'',''conflict'')) then raise exception ''Conclua a alteração de aulas pendente primeiro.'';end if; r.student_id:=s.id;');
 execute src;
end; $$;

commit;
