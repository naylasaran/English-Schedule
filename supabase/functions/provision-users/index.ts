import { createClient } from "npm:@supabase/supabase-js@^2.112.3";
import { corsHeaders } from "npm:@supabase/supabase-js@^2.112.3/cors";

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: responseHeaders });

const text = (value: unknown) => String(value ?? "").trim();
const digits = (value: unknown) => text(value).replace(/\D/g, "");
const normalizedCpf = (value: unknown) => {
  const cpf = digits(value);
  return cpf.length === 10 ? cpf.padStart(11, "0") : cpf;
};
const normalizedContractEnd = (value: unknown) => {
  const end = text(value);
  return /^(indeterminado|indefinido|sem data)$/i.test(end) ? "" : end;
};
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && value.length <= 2048;
  } catch {
    return false;
  }
};

const validIsoDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(text(value));
const appRedirectUrl = "https://www.aularium.com.br/";

function validateStudent(row: Record<string, unknown>) {
  const email = text(row.email).toLowerCase();
  const schedule = Array.isArray(row.schedule) ? row.schedule : [];
  const duration = Number(row.class_duration_minutes);
  const billingType = text(row.billing_type);
  const dueDay = Number(row.payment_due_day);
  const contractEnd = normalizedContractEnd(row.contract_end_date);

  if (text(row.name).length < 3) return "Nome invalido.";
  if (!validEmail(email)) return "E-mail invalido ou ausente.";
  if (digits(row.phone).length < 10) return "Telefone invalido ou ausente.";
  if (normalizedCpf(row.cpf).length !== 11) return "CPF invalido ou ausente.";
  if (String(row.password ?? "").length < 6) return "A senha deve ter ao menos 6 caracteres.";
  if (![30, 60, 90, 120].includes(duration)) return "A duracao deve ser 30, 60, 90 ou 120 minutos.";
  if (!schedule.length) return "Informe ao menos um dia e horario.";
  if (!schedule.every((slot: any) =>
    Number(slot?.day_of_week) >= 1 &&
    Number(slot?.day_of_week) <= 7 &&
    /^\d{2}:\d{2}$/.test(text(slot?.start_time))
  )) return "Formato dos horarios invalido.";
  if (!validIsoDate(row.birth_date)) return "Data de nascimento invalida ou ausente.";
  if (!validIsoDate(row.contract_start_date)) return "Data de inicio do contrato invalida ou ausente.";
  if (contractEnd && !validIsoDate(contractEnd)) return "Data de fim do contrato invalida.";
  if (contractEnd && contractEnd < text(row.contract_start_date)) return "Periodo de contrato invalido.";
  if (!validHttpUrl(text(row.class_link))) return "Link da aula invalido.";
  if (!["monthly", "per_lesson"].includes(billingType) || dueDay < 1 || dueDay > 31) {
    return "Configuracao financeira invalida.";
  }
  const amount = billingType === "monthly" ? Number(row.monthly_fee) : Number(row.lesson_fee);
  if (!Number.isFinite(amount) || amount < 0) return "Valor financeiro invalido.";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) {
    return json({ error: "Configuracao ou sessao ausente." }, 401);
  }

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const mailClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const sendSignupConfirmation = async (email: string) => {
    const { error } = await mailClient.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: appRedirectUrl },
    });
    return !error;
  };

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData.user) return json({ error: "Sessao invalida." }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Dados invalidos." }, 400);
  }
  const kind = text(body?.kind || "student");

  const { data: callerProfile } = await caller
    .from("profiles")
    .select("role,is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  const isAdmin = callerProfile?.is_admin === true || callerProfile?.role === "admin";

  if (kind === "admin_delete_student") {
    if (!isAdmin) return json({ error: "Acesso permitido somente para administradores." }, 403);
    const studentId = text(body.student_id);
    if (!studentId) return json({ error: "Aluno nao informado." }, 400);

    const removed = await caller.rpc("admin_hard_delete_student_v24", {
      p_student_id: studentId,
    });
    if (removed.error) {
      return json({ error: removed.error.message || "Nao foi possivel excluir o aluno." }, 400);
    }
    const result = Array.isArray(removed.data) ? removed.data[0] : removed.data;
    if (!result?.profile_id) {
      return json({ error: "O aluno foi removido, mas a conta nao pode ser verificada." }, 500);
    }
    if (Number(result.remaining_links ?? 0) > 0) {
      return json({ ok: true, account_released: false, other_links: result.remaining_links });
    }
    const authDelete = await admin.auth.admin.deleteUser(result.profile_id);
    if (authDelete.error) {
      return json({ error: "O historico foi excluido, mas a conta de acesso precisa ser removida pelo suporte." }, 500);
    }
    return json({ ok: true, account_released: true, history_deleted: true });
  }

  const { data: accessData, error: accessError } = await caller.rpc("get_my_teacher_access_v2");
  const access = Array.isArray(accessData) ? accessData[0] : accessData;
  if (accessError || access?.access_mode !== "full" || !access?.teacher_id) {
    return json({ error: "Acesso do professor bloqueado ou expirado." }, 403);
  }

  if (kind === "delete_student") {
    const studentId = text(body.student_id);
    if (!studentId) return json({ error: "Aluno nao informado." }, 400);

    const removed = await caller.rpc("teacher_hard_delete_student_v19", {
      p_student_id: studentId,
    });
    if (removed.error) {
      return json({ error: removed.error.message || "Nao foi possivel excluir o aluno." }, 400);
    }
    const result = Array.isArray(removed.data) ? removed.data[0] : removed.data;
    if (!result?.profile_id) {
      return json({ error: "O aluno foi removido, mas a conta nao pode ser verificada." }, 500);
    }

    if (Number(result.remaining_links ?? 0) > 0) {
      return json({ ok: true, account_released: false, other_links: result.remaining_links });
    }

    const authDelete = await admin.auth.admin.deleteUser(result.profile_id);
    if (authDelete.error) {
      return json({ error: "O historico foi excluido, mas a conta de acesso precisa ser removida pelo suporte." }, 500);
    }

    return json({ ok: true, account_released: true, history_deleted: true });
  }

  if (kind === "guardian") {
    const email = text(body.email).toLowerCase();
    const password = String(body.password ?? "");
    const name = text(body.name);
    const studentId = text(body.student_id);
    if (name.length < 3 || !validEmail(email) || password.length < 6 || !studentId) {
      return json({ error: "Dados do responsavel invalidos." }, 400);
    }

    let authUserId = "";
    let created = false;
    const createdResult = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { name, role: "guardian" },
    });
    if (createdResult.data.user) {
      authUserId = createdResult.data.user.id;
      created = true;
    } else {
      const proofClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const proof = await proofClient.auth.signInWithPassword({ email, password });
      if (proof.error || !proof.data.user) {
        return json({ error: "Este e-mail ja existe. Informe a senha correta do responsavel para vincula-lo." }, 409);
      }
      authUserId = proof.data.user.id;
      const { data: profile } = await admin.from("profiles").select("role").eq("id", authUserId).maybeSingle();
      if (!profile || !["guardian", "student"].includes(profile.role)) {
        return json({ error: "Este e-mail pertence a outro tipo de acesso." }, 409);
      }
    }

    const token = crypto.randomUUID();
    const { error: requestError } = await admin.from("identity_provision_requests_v3").insert({
      token,
      teacher_id: access.teacher_id,
      auth_user_id: authUserId,
      email,
      kind: "guardian",
      student_id: studentId,
    });
    if (requestError) {
      if (created) await admin.auth.admin.deleteUser(authUserId);
      return json({ error: "Nao foi possivel autorizar o vinculo." }, 500);
    }

    const linked = await caller.rpc("register_guardian_from_edge_v3", {
      p_token: token,
      p_auth_user_id: authUserId,
      p_student_id: studentId,
      p_name: name,
      p_email: email,
    });
    if (linked.error) {
      if (created) await admin.auth.admin.deleteUser(authUserId);
      await admin.from("identity_provision_requests_v3").delete().eq("token", token);
      return json({ error: linked.error.message || "Nao foi possivel vincular o responsavel." }, 400);
    }
    const confirmationSent = created ? await sendSignupConfirmation(email) : true;
    return json({ ok: true, guardian_profile_id: authUserId, confirmation_sent: confirmationSent });
  }

  const rows = Array.isArray(body?.students) ? body.students : [body?.student ?? body];
  if (!rows.length || rows.length > 200) return json({ error: "Envie de 1 a 200 alunos por lote." }, 400);

  const { data: capacityData, error: capacityError } = await caller.rpc("get_my_teacher_student_capacity_v2");
  const capacity = Array.isArray(capacityData) ? capacityData[0] : capacityData;
  const maximum = capacity?.max_registered_students == null ? null : Number(capacity.max_registered_students);
  const registeredCount = Number(capacity?.registered_student_count ?? 0);
  const remaining = maximum == null ? 200 : Math.max(0, maximum - registeredCount);
  if (capacityError || rows.length > remaining) {
    return json({ error: `O lote excede as ${remaining} vaga(s) disponivel(is).` }, 400);
  }

  const results: any[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as Record<string, unknown>;
    const validationError = validateStudent(row);
    if (validationError) {
      results.push({ index, email: text(row.email), ok: false, error: validationError });
      continue;
    }

    const email = text(row.email).toLowerCase();
    const name = text(row.name);
    const created = await admin.auth.admin.createUser({
      email,
      password: String(row.password ?? ""),
      email_confirm: false,
      user_metadata: { name, role: "student" },
    });
    if (created.error || !created.data.user) {
      results.push({ index, email, ok: false, error: "Este e-mail ja possui um acesso. Nenhuma conta existente foi vinculada." });
      continue;
    }

    const authUserId = created.data.user.id;
    const token = crypto.randomUUID();
    const requestInsert = await admin.from("identity_provision_requests_v3").insert({
      token,
      teacher_id: access.teacher_id,
      auth_user_id: authUserId,
      email,
      kind: "student",
    });
    if (requestInsert.error) {
      await admin.auth.admin.deleteUser(authUserId);
      results.push({ index, email, ok: false, error: "Nao foi possivel autorizar o cadastro." });
      continue;
    }

    const contractEnd = normalizedContractEnd(row.contract_end_date);
    const registered = await caller.rpc("register_student_from_edge_v3", {
      p_token: token,
      p_auth_user_id: authUserId,
      p_name: name,
      p_email: email,
      p_phone: text(row.phone),
      p_cpf: normalizedCpf(row.cpf),
      p_class_duration_minutes: Number(row.class_duration_minutes),
      p_schedule: row.schedule,
      p_billing_type: text(row.billing_type),
      p_monthly_fee: row.monthly_fee ?? null,
      p_lesson_fee: row.lesson_fee ?? null,
      p_payment_due_day: Number(row.payment_due_day),
      p_invoice_required_default: Boolean(row.invoice_required_default),
      p_birth_date: text(row.birth_date),
      p_contract_start_date: text(row.contract_start_date),
      p_contract_end_date: contractEnd || null,
      p_contract_notes: text(row.contract_notes) || null,
      p_class_link: text(row.class_link),
    });

    if (registered.error) {
      await admin.auth.admin.deleteUser(authUserId);
      await admin.from("identity_provision_requests_v3").delete().eq("token", token);
      results.push({ index, email, ok: false, error: registered.error.message || "Cadastro rejeitado." });
    } else {
      const confirmationSent = await sendSignupConfirmation(email);
      results.push({ index, email, ok: true, student_id: registered.data, confirmation_sent: confirmationSent });
    }
  }

  return json({ ok: results.some((item) => item.ok), results });
});
