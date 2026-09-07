import { createClient } from "npm:@supabase/supabase-js@2.112.3";
import { corsHeaders } from "npm:@supabase/supabase-js@2.112.3/cors";



const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization) return json({ error: "Configuracao ou sessao ausente." }, 401);

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const isServiceAdmin = authorization === `Bearer ${serviceKey}` || req.headers.get("apikey") === serviceKey;
  if (!isServiceAdmin) {
    const { data: callerData, error: callerError } = await caller.auth.getUser();
    if (callerError || !callerData.user) return json({ error: "Sessao invalida." }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Dados invalidos." }, 400); }
  const userId = String(body?.userId ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!userId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: "Usuario ou e-mail invalido." }, 400);

  if (!isServiceAdmin) {
    const authorizationResult = await caller.rpc("can_manage_user_identity_v3", {
      p_target_profile_id: userId,
    });
    if (authorizationResult.error || authorizationResult.data !== true) {
      return json({ error: "Seu acesso nao permite alterar este login." }, 403);
    }
  }

  const { data: originalProfile, error: profileReadError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  if (profileReadError || !originalProfile) return json({ error: "Perfil de destino nao encontrado." }, 404);

  const { data: originalAuth, error: authReadError } = await admin.auth.admin.getUserById(userId);
  if (authReadError || !originalAuth.user) return json({ error: "Acesso Auth de destino nao encontrado." }, 404);

  const changed = email !== String(originalAuth.user.email || "").toLowerCase();
  if (!changed) return json({ ok: true, email });
  const authUpdate = await admin.auth.admin.updateUserById(userId, {
    email,
    email_confirm: false,
    app_metadata: { ...originalAuth.user.app_metadata, email_reconfirmation_requested_at_v26: new Date().toISOString() },
  });
  if (authUpdate.error) return json({ error: authUpdate.error.message || "Nao foi possivel atualizar o login." }, 400);

  const profileUpdate = await admin.from("profiles").update({ email }).eq("id", userId);
  if (profileUpdate.error) {
    const restored = await admin.auth.admin.updateUserById(userId, {
      email: originalAuth.user.email ?? originalProfile.email,
      email_confirm: Boolean(originalAuth.user.email_confirmed_at),
    });
    return json({ error: restored.error
      ? "Não foi possível salvar todos os dados. A administração precisa verificar este acesso."
      : "O perfil não foi atualizado; o login anterior foi restaurado." }, 500);
  }

  if (isServiceAdmin && body.send_confirmation === false) {
    return json({ ok: true, email, confirmation_sent: false,
      warning: "E-mail corrigido. É necessário solicitar e confirmar o link pela tela de entrada." });
  }
  const mailClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const confirmation = await mailClient.auth.resend({ type: "signup", email,
    options: { emailRedirectTo: "https://aularium.com.br/" } });
  return json({ ok: true, email, confirmation_sent: !confirmation.error,
    warning: confirmation.error ? "E-mail corrigido. O envio da confirmação falhou; use Reenviar confirmação na tela de entrada." : null });
});
