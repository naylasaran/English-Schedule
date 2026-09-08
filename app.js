console.log(
  "Aularium build: mudancas-v26-20260907"
);

// =====================================================
// AGENDA DE AULAS
// APP.JS COMPLETO
// =====================================================


// =====================================================
// ESTADO
// =====================================================

let currentUser = null;
let currentProfile = null;
let currentStudentId = null;
let currentStudentContextsV16 = [];
let currentTeacherStudents = [];
let currentTeacherPausePeriods = [];
let currentTeacherPlans = [];
let currentTeacherFinancialRecords = [];
let currentTeacherFinancialStudents = [];
let currentTeacherProfileSettings = null;
let currentStudentTeacherSettings = null;
let currentStudentAccessMode = "full";
let currentTeacherAccess = null;
let currentAdminTeacherFilter = "all";
let publicTeacherFinalizationPromiseV4 = null;
let adminSupportTicketsV3 = [];
let adminSupportBeforeV3 = null;
let adminSupportViewV4 = "active";
let currentAccessViewV5 = "teacher";
let selectedPublicPlanV13 = "starter";
let singleLoginSessionTokenV15 = "";
let singleLoginHeartbeatV15 = null;
let singleLoginHeartbeatBusyV15 = false;
let singleLoginForcedLogoutV15 = false;

let currentStudentTeacherRescheduleRules = {
  makeup_reschedule_notice_hours: 2,
  monthly_makeup_limit: 8,
  makeup_reschedule_max_count: 1,
  lesson_reschedule_notice_hours: 2
};

let currentAdminTeachers = [];
let currentAdminTeacherSystemFinancial = [];
let adminTeacherStudentsV24 = new Map();
let currentAdminPlatformFinanceV9 = [];
let currentAdminPlatformFinanceRangeV9 = "";
let currentAdminSystemPixQrUrlV25 = "";
let currentTeacherHolidayWeek = [];
let currentStudentHolidayWeek = [];
let currentTeacherRulesImagePath = null;
let teacherRulesImageRemoved = false;
let currentTeacherMaterialStudents = [];
let currentTeacherMaterials = [];
let editingTeacherFinancialId = null;
let editingTeacherPlanId = null;

let currentGuardianStudents = [];
let selectedGuardianStudentId = null;

let currentStudentSchedule = [];
let selectedScheduleSlot = null;
let selectedWeekStart = getMonday(new Date());
let selectedTeacherWeekStart =
  getMonday(
    new Date()
  );


// =====================================================
// ELEMENTOS PRINCIPAIS
// =====================================================

const loginScreen =
  document.getElementById("loginScreen");

const studentScreen =
  document.getElementById("studentScreen");

const teacherScreen =
  document.getElementById("teacherScreen");

const loginForm =
  document.getElementById("loginForm");

const loginMessage =
  document.getElementById("loginMessage");

const logoutButton =
  document.getElementById("logoutButton");

const forgotPasswordButton =
  document.getElementById("forgotPasswordButton");

const resendConfirmationButton =
  document.getElementById("resendConfirmationButton");


// O acesso ao login precisa continuar funcionando mesmo que um recurso
// secundario da pagina inicial falhe durante a inicializacao.
document.addEventListener(
  "click",
  event => {
    const loginTrigger =
      event.target.closest(
        '[data-public-action="login"]'
      );

    if (!loginTrigger) {
      return;
    }

    event.preventDefault();
    showPublicAuthV6();
  }
);


function getAppBaseUrlV4() {
  const url = new URL(".", window.location.href);
  url.search = "";
  url.hash = "";
  return url.href;
}


function shouldLimitSingleLoginV15(profile = currentProfile) {
  if (!profile || profile.is_admin === true) return false;
  return profile.role === "teacher" || profile.role === "student";
}


function getSingleLoginSessionTokenV15() {
  if (singleLoginSessionTokenV15) return singleLoginSessionTokenV15;

  const storageKey = "aularium_device_session_v15";
  try {
    singleLoginSessionTokenV15 = localStorage.getItem(storageKey) || "";
    if (!singleLoginSessionTokenV15) {
      singleLoginSessionTokenV15 = crypto.randomUUID();
      localStorage.setItem(storageKey, singleLoginSessionTokenV15);
    }
  } catch {
    singleLoginSessionTokenV15 = crypto.randomUUID();
  }

  return singleLoginSessionTokenV15;
}


function stopSingleLoginHeartbeatV15() {
  if (singleLoginHeartbeatV15) {
    window.clearInterval(singleLoginHeartbeatV15);
    singleLoginHeartbeatV15 = null;
  }
  singleLoginHeartbeatBusyV15 = false;
}


async function claimSingleLoginSessionV15() {
  const { data, error } = await supabaseClient.rpc(
    "claim_single_login_session_v15",
    { p_session_token: getSingleLoginSessionTokenV15() }
  );

  if (error) {
    console.error("Nao foi possivel validar a sessao exclusiva:", error);
    return { allowed: false, result_code: "service_error", remaining_seconds: 0 };
  }

  return (
    Array.isArray(data) ? data[0] : data
  ) || { allowed: false, result_code: "service_error", remaining_seconds: 0 };
}


async function releaseSingleLoginSessionV15() {
  if (!singleLoginSessionTokenV15 || !shouldLimitSingleLoginV15()) return;

  try {
    await supabaseClient.rpc(
      "release_single_login_session_v15",
      { p_session_token: singleLoginSessionTokenV15 }
    );
  } catch (error) {
    console.warn("A sessao exclusiva sera liberada automaticamente.", error);
  }
}


async function blockConcurrentSingleLoginV15(resultCode = "active_elsewhere") {
  if (singleLoginForcedLogoutV15) return;
  singleLoginForcedLogoutV15 = true;
  stopSingleLoginHeartbeatV15();

  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  currentTeacherAccess = null;
  teacherScreen.classList.add("hidden");
  studentScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  showPublicAuthV6();

  loginMessage.textContent = resultCode === "active_elsewhere"
    ? "Esta conta ja esta conectada em outro aparelho ou navegador. Encerre a outra sessao ou aguarde cerca de 2 minutos para tentar novamente."
    : "Nao foi possivel validar o acesso exclusivo agora. Verifique sua conexao e tente novamente.";

  window.setTimeout(() => {
    singleLoginForcedLogoutV15 = false;
  }, 500);
}


function startSingleLoginHeartbeatV15() {
  stopSingleLoginHeartbeatV15();

  singleLoginHeartbeatV15 = window.setInterval(async () => {
    if (singleLoginHeartbeatBusyV15 || !shouldLimitSingleLoginV15()) return;
    singleLoginHeartbeatBusyV15 = true;

    const { data, error } = await supabaseClient.rpc(
      "touch_single_login_session_v15",
      { p_session_token: getSingleLoginSessionTokenV15() }
    );

    singleLoginHeartbeatBusyV15 = false;
    if (error) {
      console.warn("Não foi possível renovar a sessão agora; tentaremos novamente.");
      return;
    }
    if (data !== true) {
      await blockConcurrentSingleLoginV15(
        error ? "service_error" : "active_elsewhere"
      );
    }
  }, 30000);
}


function isPasswordRecoveryUrlV4() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  return hash.get("type") === "recovery" || query.get("type") === "recovery";
}


async function finalizeConfirmedPublicTeacherV4(user) {
  const metadata = user?.user_metadata || {};
  if (metadata.signup_source !== "public" || !user?.email_confirmed_at) {
    return null;
  }

  if (publicTeacherFinalizationPromiseV4) {
    return publicTeacherFinalizationPromiseV4;
  }

  publicTeacherFinalizationPromiseV4 = (async () => {
    const { error } = await supabaseClient.rpc(
      "register_public_teacher_from_auth_v3",
      {
        p_name: metadata.name,
        p_email: user.email,
        p_phone: metadata.phone,
        p_cpf: metadata.cpf,
        p_pix: metadata.pix,
        p_cnpj: metadata.cnpj,
        p_work_start_time: metadata.work_start_time,
        p_work_end_time: metadata.work_end_time,
        p_work_days: Array.isArray(metadata.work_days) ? metadata.work_days : [],
        p_plan_code: metadata.subscription_plan || "starter"
      }
    );

    if (error && !/ja possui um perfil/i.test(error.message || "")) {
      console.error("Nao foi possivel finalizar o perfil confirmado:", error);
      return null;
    }

    await supabaseClient.auth.updateUser({
      data: {
        name: metadata.name,
        role: "teacher",
        signup_source: "public",
        signup_finalized: true,
        phone: null,
        cpf: null,
        pix: null,
        cnpj: null,
        work_start_time: null,
        work_end_time: null,
        work_days: null,
        subscription_plan: null
      }
    });

    return loadProfile(user.id);
  })();

  try {
    return await publicTeacherFinalizationPromiseV4;
  } finally {
    publicTeacherFinalizationPromiseV4 = null;
  }
}


// =====================================================
// CARREGAR PERFIL
// =====================================================

async function loadProfile(userId) {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_current_profile_v5"
    );


  if (error || !data || (Array.isArray(data) && !data.length)) {

    // Depois da confirmacao do e-mail, o gateway pode levar alguns instantes
    // para reconhecer a nova sessao. Repetimos antes de exibir um erro.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      const retry = await supabaseClient.rpc("get_current_profile_v5");
      const retryProfile = (Array.isArray(retry.data) ? retry.data[0] : retry.data) || null;
      if (!retry.error && retryProfile) return retryProfile;
    }

    const fallback = await supabaseClient
      .from("profiles")
      .select("id,name,email,role,active,phone,cpf,is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!fallback.error && fallback.data) return fallback.data;

    console.error(
      "Erro ao carregar perfil:",
      fallback.error || error
    );

    return null;
  }


  return (
    Array.isArray(
      data
    )
      ? data[0]
      : data
  )
  || null;

}


// =====================================================
// MOSTRAR USU\xc1RIO LOGADO
// =====================================================

let loggedUserLoadingV26 = null;
let accessRefreshTimerV26 = null;
async function showLoggedUser(user) {
  if (loggedUserLoadingV26) return loggedUserLoadingV26;
  if (currentUser?.id === user?.id && currentProfile &&
      (!teacherScreen.classList.contains("hidden") || !studentScreen.classList.contains("hidden"))) return;
  loggedUserLoadingV26 = showLoggedUserContentV26(user);
  try {
    await loggedUserLoadingV26;
    clearInterval(accessRefreshTimerV26);
    accessRefreshTimerV26 = setInterval(refreshAccessQuietlyV26, 10 * 60 * 1000);
  } finally { loggedUserLoadingV26 = null; }
}

async function refreshAccessQuietlyV26() {
  if (!currentUser || document.visibilityState === "hidden") return;
  const role = currentProfile?.role;
  if (!["teacher", "student"].includes(role)) return;
  const result = await supabaseClient.rpc(role === "teacher" ? "get_my_teacher_access_v2" : "get_my_student_access_v2");
  if (result.error) return;
  const access = Array.isArray(result.data) ? result.data[0] : result.data;
  if (role === "teacher" && access?.access_mode === "support_only") {
    if (currentTeacherAccess?.access_mode !== "support_only") {
      currentTeacherAccess = access;
      await showTeacherSupportOnlyArea();
    }
  } else if (!access || access.access_mode === "blocked") {
    await supabaseClient.auth.signOut();
    teacherScreen.classList.add("hidden"); studentScreen.classList.add("hidden");
    showPublicAuthV6();
    loginMessage.textContent = "Este acesso está indisponível. Entre em contato com a administração.";
  } else if (role === "teacher") {
    const restored = currentTeacherAccess?.access_mode === "support_only" && access.access_mode === "full";
    currentTeacherAccess = access;
    if (restored) await showTeacherArea();
  }
}

async function showLoggedUserContentV26(user) {

  if (!user?.email_confirmed_at) {
    await supabaseClient.auth.signOut();
    teacherScreen.classList.add("hidden"); studentScreen.classList.add("hidden");
    showPublicAuthV6();
    loginMessage.textContent = "Confirme seu e-mail antes de entrar. Use Reenviar confirmação de e-mail se necessário.";
    return;
  }

  currentUser = user;

  currentProfile =
    await loadProfile(user.id);

  if (!currentProfile) {
    currentProfile = await finalizeConfirmedPublicTeacherV4(user);
  }

  if (!currentProfile) {

    loginMessage.textContent =
      "N\xe3o foi poss\xedvel carregar seu perfil.";

    loginScreen.classList.remove("hidden");
    showPublicAuthV6();

    return;
  }

  loginScreen.classList.add("hidden");
  loginScreen.classList.remove("modal-open");


  if (
    currentProfile.role === "student"
  ) {

    const {
      data: studentAccessData,
      error: studentAccessError
    } = await supabaseClient.rpc(
      "get_my_student_access_v2"
    );

    const studentAccess =
      (
        Array.isArray(studentAccessData)
          ? studentAccessData[0]
          : studentAccessData
      ) || null;

    currentStudentId =
      studentAccess
        ? studentAccess.student_id
        : null;

    currentStudentAccessMode =
      studentAccess
        ? String(studentAccess.access_mode || "blocked")
        : "blocked";


    if (
      studentAccessError ||
      !currentStudentId ||
      currentStudentAccessMode === "blocked"
    ) {

      if (currentProfile.is_admin === true) {
        currentTeacherAccess = null;
        await showAdminArea();
        return;
      }

      await supabaseClient.auth.signOut();

      studentScreen.classList.add(
        "hidden"
      );

      teacherScreen.classList.add(
        "hidden"
      );

      loginScreen.classList.remove(
        "hidden"
      );

      loginMessage.textContent =
        "Este acesso está indisponível. Entre em contato com seu professor para verificar a liberação.";

      showPublicAuthV6();

      return;
    }


    const studentLoginSession = await claimSingleLoginSessionV15();
    if (studentLoginSession.allowed !== true) {
      await blockConcurrentSingleLoginV15(
        studentLoginSession.result_code || "service_error"
      );
      return;
    }

    startSingleLoginHeartbeatV15();


    await showStudentArea();

  }


  else if (
    currentProfile.role === "teacher"
  ) {

    const {
      data: teacherAccountData,
      error: teacherAccountError
    } =
      await supabaseClient.rpc(
        "get_my_teacher_access_v2"
      );


    const teacherAccount =
      (
        Array.isArray(
          teacherAccountData
        )
          ? teacherAccountData[0]
          : teacherAccountData
      )
      || null;


    if (
      teacherAccountError ||
      !teacherAccount ||
      teacherAccount.access_mode ===
        "blocked"
    ) {

      await supabaseClient.auth.signOut();


      teacherScreen.classList.add(
        "hidden"
      );


      studentScreen.classList.add(
        "hidden"
      );


      loginScreen.classList.remove(
        "hidden"
      );


      loginMessage.textContent =
        "Este acesso de professor foi pausado ou desativado pelo administrador.";

      showPublicAuthV6();


      return;
    }


    if (shouldLimitSingleLoginV15()) {
      const teacherLoginSession = await claimSingleLoginSessionV15();
      if (teacherLoginSession.allowed !== true) {
        await blockConcurrentSingleLoginV15(
          teacherLoginSession.result_code || "service_error"
        );
        return;
      }

      startSingleLoginHeartbeatV15();
    }


    currentTeacherAccess = teacherAccount;

    if (
      teacherAccount.access_mode ===
        "support_only"
    ) {
      await showTeacherSupportOnlyArea();
      return;
    }

    await showTeacherArea();

  }


  else if (
    currentProfile.role === "admin"
  ) {

    await showAdminArea();

  }


  else if (
    currentProfile.role === "guardian"
  ) {

    await showGuardianArea();

  }


  else {

    await supabaseClient.auth.signOut();

    loginScreen.classList.remove(
      "hidden"
    );

    loginMessage.textContent =
      "Tipo de usu\xe1rio inv\xe1lido.";
  }
}


// =====================================================
// IDENTIFICAR ALUNO ATUAL
// =====================================================

async function loadCurrentStudentId() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_current_student_id"
    );

  if (error) {

    console.error(
      "Erro ao identificar aluno atual:",
      error
    );

    currentStudentId = null;

    return null;
  }

  currentStudentId = data || null;

  console.log(
    "STUDENT ID ATUAL:",
    currentStudentId
  );

  return currentStudentId;
}


// =====================================================
// REGRAS DE REMARCACAO DO PROFESSOR PARA O ALUNO
// =====================================================

async function loadStudentTeacherRescheduleRules() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_student_teacher_reschedule_rules"
    );


  if (error) {

    console.warn(
      "Nao foi possivel carregar as regras de remarcacao:",
      error
    );


    currentStudentTeacherRescheduleRules = {
      makeup_reschedule_notice_hours: 2,
      monthly_makeup_limit: 8,
      makeup_reschedule_max_count: 1,
      lesson_reschedule_notice_hours: 2
    };


    return currentStudentTeacherRescheduleRules;

  }


  currentStudentTeacherRescheduleRules =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    )
    || {
      makeup_reschedule_notice_hours: 2,
      monthly_makeup_limit: 8,
      makeup_reschedule_max_count: 1,
      lesson_reschedule_notice_hours: 2
    };


  return currentStudentTeacherRescheduleRules;

}


// =====================================================
// \u00C1REA DO ALUNO
// =====================================================

async function showStudentArea() {

  await loadStudentContextsV16();

  const hasGuardianAccessV22 =
    await loadCombinedGuardianAccessV22();

  document
    .querySelectorAll(
      "[data-student-page]"
    )
    .forEach(button => {

      const page =
        button.dataset.studentPage;

      const allowedInMakeupMode =
        page === "agenda" ||
        page === "makeups";

      button.style.display =
        currentStudentAccessMode === "makeups_only" &&
        !allowedInMakeupMode
          ? "none"
          : "";

      if (
        currentStudentAccessMode === "makeups_only" &&
        page === "agenda"
      ) {
        button.textContent =
          "Marcar reposicao";
      }

    });


  ensureStudentMaterialsNavButton();

  if (
    currentStudentAccessMode === "makeups_only"
  ) {
    const materialsButton =
      document.querySelector(
        '[data-student-page="materials"]'
      );

    if (materialsButton) {
      materialsButton.style.display =
        "none";
    }
  }


  studentScreen.classList.remove(
    "hidden"
  );

  teacherScreen.classList.add(
    "hidden"
  );


  const header =
    document.getElementById(
      "studentHeader"
    );


  if (header) {

    header.innerHTML = `
      <h2>Ol\xe1, ${escapeHtml(currentProfile.name)}</h2>
      <p>${
        currentStudentAccessMode === "makeups_only"
          ? "Acesso temporario somente para reposicoes."
          : "Area do aluno."
      }</p>
      ${renderStudentContextSwitcherV16()}
      <button type="button" class="secondary-button student-change-password-v26" id="studentChangePasswordV26">Trocar senha</button>
      ${currentUser?.user_metadata?.password_changed_at ? "" : '<p class="student-first-login-v26">Bem-vindo! Troque a senha inicial por uma senha que somente você conhece.</p>'}
      ${
        hasGuardianAccessV22
          ? `
            <button
              type="button"
              class="secondary-button"
              id="openGuardianAreaV22"
              style="margin-top:12px;"
            >
              Ver meus dependentes
            </button>
          `
          : ""
      }
    `;

    document.getElementById("studentChangePasswordV26")?.addEventListener("click", openStudentPasswordFormV26);

    const contextSelect =
      document.getElementById(
        "studentTeacherContextSelectV16"
      );

    if (contextSelect) {
      contextSelect.addEventListener(
        "change",
        () => switchStudentContextV16(
          contextSelect.value
        )
      );
    }

    const guardianButton =
      document.getElementById(
        "openGuardianAreaV22"
      );

    if (guardianButton) {
      guardianButton.addEventListener(
        "click",
        showGuardianArea
      );
    }

  }


  await loadStudentTeacherRescheduleRules();


  setStudentPage(
    currentStudentAccessMode === "makeups_only"
      ? "makeups"
      : "agenda"
  );
}


// =====================================================
// AREA DO RESPONSAVEL
// =====================================================

async function showGuardianArea() {

  studentScreen.classList.remove(
    "hidden"
  );


  teacherScreen.classList.add(
    "hidden"
  );


  document
    .querySelectorAll(
      "[data-student-page]"
    )
    .forEach(button => {

      button.style.display =
        "none";

    });


  const header =
    document.getElementById(
      "studentHeader"
    );


  if (header) {

    header.innerHTML = `

      <h2>
        Ola, ${escapeHtml(
          currentProfile.name
        )}
      </h2>

      <p>
        Area do responsavel.
      </p>

      ${
        currentProfile.role === "student"
          ? `
            <button
              type="button"
              class="secondary-button"
              id="returnToStudentAreaV22"
              style="margin-top:12px;"
            >
              Voltar para minhas aulas
            </button>
          `
          : ""
      }

    `;

    const returnButton =
      document.getElementById(
        "returnToStudentAreaV22"
      );

    if (returnButton) {
      returnButton.addEventListener(
        "click",
        showStudentArea
      );
    }

  }


  await loadGuardianDashboard();

}


// =====================================================
// CARREGAR ALUNOS DO RESPONSAVEL
// =====================================================

async function loadGuardianDashboard() {

  const content =
    document.getElementById(
      "studentContent"
    );


  if (!content) {
    return;
  }


  content.innerHTML = `

    <div class="card">
      Carregando alunos vinculados...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_guardian_students"
    );


  if (error) {

    console.error(
      "Erro ao carregar alunos do responsavel:",
      error
    );


    content.innerHTML = `

      <div class="card">

        <p>
          Nao foi possivel carregar os alunos vinculados.
        </p>

      </div>

    `;


    return;
  }


  currentGuardianStudents =
    data || [];


  if (
    currentGuardianStudents.length ===
      0
  ) {

    content.innerHTML = `

      <div class="card">

        <h3>
          Area do responsavel
        </h3>

        <p>
          Nenhum aluno esta vinculado a este acesso.
        </p>

      </div>

    `;


    return;
  }


  if (
    !selectedGuardianStudentId
    ||
    !currentGuardianStudents.some(
      item =>
        String(
          item.student_id
        ) ===
        String(
          selectedGuardianStudentId
        )
    )
  ) {

    selectedGuardianStudentId =
      currentGuardianStudents[0]
        .student_id;

  }


  content.innerHTML = `

    <div class="card">

      <h3>
        Acompanhamento do aluno
      </h3>


      <div
        style="
          max-width:420px;
          margin-top:15px;
        "
      >

        <label
          for="guardianStudentSelect"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Aluno
        </label>


        <select
          id="guardianStudentSelect"
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          ${currentGuardianStudents
            .map(
              student => `

                <option
                  value="${student.student_id}"
                  ${
                    String(
                      student.student_id
                    ) ===
                    String(
                      selectedGuardianStudentId
                    )
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(
                    student.student_name
                  )}
                </option>

              `
            )
            .join("")}

        </select>

      </div>


      <div
        id="guardianStudentDetailArea"
        style="
          margin-top:20px;
        "
      >
        Carregando informacoes...
      </div>

    </div>

  `;


  const select =
    document.getElementById(
      "guardianStudentSelect"
    );


  if (select) {

    select.addEventListener(
      "change",
      () => {

        selectedGuardianStudentId =
          select.value;


        loadGuardianStudentDetail(
          selectedGuardianStudentId
        );

      }
    );

  }


  await loadGuardianStudentDetail(
    selectedGuardianStudentId
  );

}


// =====================================================
// DETALHE DO ALUNO PARA O RESPONSAVEL
// =====================================================

async function loadGuardianStudentDetail(
  studentId
) {

  const area =
    document.getElementById(
      "guardianStudentDetailArea"
    );


  if (!area) {
    return;
  }

  area.innerHTML =
    "Carregando informacoes...";


  const [
    scheduleResult,
    historyResult,
    financialResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_guardian_student_fixed_schedule",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_guardian_student_lesson_history",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_guardian_student_financial_history",
        {
          p_student_id:
            studentId
        }
      )

    ]);


  if (
    scheduleResult.error ||
    historyResult.error ||
    financialResult.error
  ) {

    console.error(
      "Erro ao carregar detalhes para responsavel:",
      scheduleResult.error ||
      historyResult.error ||
      financialResult.error
    );


    area.innerHTML = `

      <p>
        Nao foi possivel carregar as informacoes deste aluno.
      </p>

    `;


    return;
  }


  const schedule =
    scheduleResult.data || [];


  const history =
    historyResult.data || [];


  const financial =
    financialResult.data || [];


  area.innerHTML = `

    <div
      style="
        display:grid;
        gap:18px;
      "
    >

      <div
        style="
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
          background:#fffaf3;
        "
      >

        <h4
          style="
            margin-top:0;
          "
        >
          Dias e horarios das aulas
        </h4>


        ${
          schedule.length ===
            0

            ? `

              <p>
                Nenhum horario fixo cadastrado no momento.
              </p>

            `

            : `

              <div
                style="
                  display:grid;
                  gap:8px;
                "
              >

                ${schedule
                  .map(
                    item => `

                      <div
                        style="
                          padding:10px;
                          border-radius:8px;
                          background:#ffffff;
                          border:1px solid #e5e5e5;
                        "
                      >

                        <strong>
                          ${escapeHtml(
                            formatDay(
                              item.day_of_week
                            )
                          )}
                        </strong>

                        -

                        ${normalizeTime(
                          item.start_time
                        )}

                        as

                        ${normalizeTime(
                          item.end_time
                        )}

                      </div>

                    `
                  )
                  .join("")}

              </div>

            `
        }

      </div>


      <div
        style="
          padding:16px;
          border:1px solid #ddd;
          border-radius:10px;
          background:#ffffff;
        "
      >

        <h4
          style="
            margin-top:0;
          "
        >
          Historico de aulas
        </h4>


        ${
          history.length ===
            0

            ? `

              <p>
                Ainda nao ha aulas registradas.
              </p>

            `

            : `

              <div
                style="
                  display:grid;
                  gap:10px;
                "
              >

                ${history
                  .map(
                    renderGuardianHistoryRow
                  )
                  .join("")}

              </div>

            `
        }

      </div>


      <div
        style="
          padding:16px;
          border:1px solid #ddd;
          border-radius:10px;
          background:#ffffff;
        "
      >

        <h4
          style="
            margin-top:0;
          "
        >
          Financeiro
        </h4>


        ${
          financial.length ===
            0

            ? `

              <p>
                Nenhuma mensalidade cadastrada.
              </p>

            `

            : `

              <div
                style="
                  display:grid;
                  gap:10px;
                "
              >

                ${financial
                  .map(
                    renderGuardianFinancialRow
                  )
                  .join("")}

              </div>

            `
        }


        <div
          id="guardianMonthlyFinancialReportArea"
          style="
            display:none;
            margin-top:16px;
          "
        ></div>

      </div>

    </div>

  `;


  document
    .querySelectorAll(
      ".guardian-financial-report-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openGuardianMonthlyFinancialReport(
            studentId,
            Number(
              button.dataset.year
            ),
            Number(
              button.dataset.month
            )
          );

        }
      );

    });

}


// =====================================================
// HISTORICO PARA O RESPONSAVEL
// =====================================================

function renderGuardianHistoryRow(
  record
) {

  const subject =
    [
      record.subject_name,
      record.content_title
    ]
      .filter(Boolean)
      .join(" - ");


  return `

    <div
      style="
        padding:13px;
        border:1px solid #e5e5e5;
        border-radius:8px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        "
      >

        <strong>
          ${formatDate(
            new Date(
              record.lesson_date +
              "T12:00:00"
            )
          )}

          -

          ${normalizeTime(
            record.start_time
          )}

          as

          ${normalizeTime(
            record.end_time
          )}
        </strong>


        <strong>
          ${
            record.attendance_status
              ? escapeHtml(
                  formatAttendanceStatus(
                    record.attendance_status
                  )
                )
              : (
                  record.lesson_status ===
                    "cancelled"
                    ? "Cancelada"
                    : "Sem registro de presenca"
                )
          }
        </strong>

      </div>


      ${
        subject

          ? `

            <div
              style="
                margin-top:7px;
                color:#555;
              "
            >
              ${escapeHtml(
                subject
              )}
            </div>

          `

          : ""
      }


      ${
        record.teacher_notes

          ? `

            <div
              style="
                margin-top:9px;
                padding:10px;
                background:#fffaf3;
                border-radius:8px;
                white-space:pre-wrap;
              "
            >

              <strong>
                Observacoes do professor:
              </strong>

              <div
                style="
                  margin-top:4px;
                "
              >
                ${escapeHtml(
                  record.teacher_notes
                )}
              </div>

            </div>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// RELATORIO FINANCEIRO MENSAL PARA O RESPONSAVEL
// =====================================================




// =====================================================
// FINANCEIRO PARA O RESPONSAVEL
// =====================================================

function renderGuardianFinancialRow(
  item
) {

  const grossAmount = Number(item.amount || 0);
  const discountAmount = Number(item.discount || 0);
  const netAmount = Math.max(0, grossAmount - discountAmount);

  const dueDate =
    item.due_date
      ? formatDate(
          new Date(
            item.due_date +
            "T12:00:00"
          )
        )
      : "Nao informado";


  return `

    <div
      style="
        padding:13px;
        border:1px solid #e5e5e5;
        border-radius:8px;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          flex-wrap:wrap;
        "
      >

        <strong>
          ${escapeHtml(
            formatMonth(
              item.month
            )
          )}/${item.year}
        </strong>


        <strong>
          ${formatCurrency(
            netAmount
          )}
        </strong>

      </div>

      ${discountAmount > 0 ? `
        <div style="margin-top:5px;color:#555;">
          Subtotal ${formatCurrency(grossAmount)} − desconto ${formatCurrency(discountAmount)}
        </div>
      ` : ""}


      <div
        style="
          margin-top:7px;
        "
      >
        <strong>
          Vencimento:
        </strong>

        ${dueDate}
      </div>


      <div
        style="
          margin-top:5px;
        "
      >
        <strong>
          Status:
        </strong>

        ${formatPaymentStatus(
          item.payment_status
        )}
      </div>


      ${
        item.billing_type ===
          "per_lesson"

          ? `

            <div
              style="
                margin-top:5px;
                color:#555;
              "
            >
              ${Number(
                item.lesson_count || 0
              )}
              aula(s)
              x
              ${formatCurrency(
                item.lesson_unit_value || 0
              )}
            </div>

          `

          : ""
      }


      <button
        type="button"
        class="secondary-button guardian-financial-report-button"
        data-year="${Number(
          item.year
        )}"
        data-month="${Number(
          item.month
        )}"
        style="
          margin-top:10px;
        "
      >
        Ver aulas do mes
      </button>

    </div>

  `;

}


// =====================================================
// AREA DO PROFESSOR
// =====================================================

async function showTeacherArea() {

  currentAccessViewV5 = "teacher";

  teacherScreen.classList.remove(
    "admin-mode-v18"
  );

  teacherScreen.classList.remove(
    "hidden"
  );

  studentScreen.classList.add(
    "hidden"
  );


  document
    .querySelectorAll(
      "[data-teacher-page]"
    )
    .forEach(button => {

      button.style.display =
        "";

    });


  ensureTeacherProfileNavButton();

  ensureTeacherMaterialsNavButton();

  ensureTeacherSupportNavButton();

  await loadCurrentTeacherProfileSettings();


  const header =
    document.getElementById(
      "teacherHeader"
    );


  if (header) {

    header.innerHTML = `
      <h2>Ol\xe1, ${escapeHtml(getFirstNameV5(currentProfile.name))}! <span aria-hidden="true">👋</span></h2>
      <p>Bem-vindo ao seu espa\xe7o. Aqui est\xe1 o resumo das suas aulas e atividades.</p>
      ${renderAccessSwitcherV5("teacher")}
    `;

    bindAccessSwitcherV5();

  }


  setTeacherPage("agenda");

  await loadAgendaOnboardingV5();
}


// =====================================================
// BOTAO MATERIAIS DO ALUNO
// =====================================================

function ensureStudentMaterialsNavButton() {

  if (
    document.querySelector(
      '[data-student-page="materials"]'
    )
  ) {
    return;
  }


  const firstButton =
    document.querySelector(
      "[data-student-page]"
    );


  if (
    !firstButton ||
    !firstButton.parentElement
  ) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    firstButton.className;


  button.dataset.studentPage =
    "materials";


  button.textContent =
    "Materiais";


  button.addEventListener(
    "click",
    () => {

      setStudentPage(
        "materials"
      );

    }
  );


  firstButton.parentElement.appendChild(
    button
  );

}


// =====================================================
// BOTAO MATERIAIS DO PROFESSOR
// =====================================================

function ensureTeacherMaterialsNavButton() {

  if (
    document.querySelector(
      '[data-teacher-page="materials"]'
    )
  ) {
    return;
  }


  const firstButton =
    document.querySelector(
      "[data-teacher-page]"
    );


  if (
    !firstButton ||
    !firstButton.parentElement
  ) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    firstButton.className;


  button.dataset.teacherPage =
    "materials";


  button.textContent =
    "Materiais";


  button.addEventListener(
    "click",
    () => {

      setTeacherPage(
        "materials"
      );

    }
  );


  firstButton.parentElement.appendChild(
    button
  );

}


// =====================================================
// BOTAO SUPORTE DO PROFESSOR
// =====================================================

function ensureTeacherSupportNavButton() {

  if (
    document.querySelector(
      '[data-teacher-page="support"]'
    )
  ) {
    return;
  }

  const navigation =
    document.getElementById(
      "teacherNavigation"
    );

  const firstButton =
    document.querySelector(
      "[data-teacher-page]"
    );

  if (!navigation || !firstButton) {
    return;
  }

  const button =
    document.createElement(
      "button"
    );

  button.type = "button";
  button.className = firstButton.className;
  button.dataset.teacherPage = "support";
  button.textContent = "Suporte";
  button.addEventListener(
    "click",
    () => setTeacherPage("support")
  );

  navigation.appendChild(button);
}


// =====================================================
// BOTAO PERFIL DO PROFESSOR
// =====================================================

function ensureTeacherProfileNavButton() {

  if (
    document.querySelector(
      '[data-teacher-page="profile"]'
    )
  ) {
    return;
  }


  const firstButton =
    document.querySelector(
      "[data-teacher-page]"
    );


  if (
    !firstButton ||
    !firstButton.parentElement
  ) {
    return;
  }


  const button =
    document.createElement(
      "button"
    );


  button.type =
    "button";


  button.className =
    firstButton.className;


  button.dataset.teacherPage =
    "profile";


  button.textContent =
    "Perfil";


  button.addEventListener(
    "click",
    () => {

      setTeacherPage(
        "profile"
      );

    }
  );


  firstButton.parentElement.appendChild(
    button
  );

}


// =====================================================
// CARREGAR CONFIGURACAO ATUAL DO PROFESSOR
// =====================================================

async function loadCurrentTeacherProfileSettings() {

  const [
    profileResult,
    workDaysResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_my_teacher_profile"
      ),

      supabaseClient.rpc(
        "get_my_teacher_work_days"
      )

    ]);


  if (profileResult.error) {

    console.warn(
      "Nao foi possivel carregar o perfil do professor:",
      profileResult.error
    );


    currentTeacherProfileSettings = {
      work_start_time:
        "08:00",
      work_end_time:
        "20:00",
      work_days:
        [1, 2, 3, 4, 5, 6, 7]
    };


    return currentTeacherProfileSettings;
  }


  const profileData =
    (
      Array.isArray(
        profileResult.data
      )
        ? profileResult.data[0]
        : profileResult.data
    )
    || {
      work_start_time:
        "08:00",
      work_end_time:
        "20:00"
    };


  const workDaysData =
    workDaysResult.error

      ? null

      : (
          (
            Array.isArray(
              workDaysResult.data
            )
              ? workDaysResult.data[0]
              : workDaysResult.data
          )
          || null
        );


  if (workDaysResult.error) {

    console.warn(
      "Nao foi possivel carregar os dias de atendimento:",
      workDaysResult.error
    );

  }


  currentTeacherProfileSettings = {
    ...profileData,

    work_days:
      (
        workDaysData &&
        Array.isArray(
          workDaysData.work_days
        ) &&
        workDaysData.work_days.length > 0
      )

        ? workDaysData.work_days.map(
            value =>
              Number(value)
          )

        : [1, 2, 3, 4, 5, 6, 7]
  };


  return currentTeacherProfileSettings;

}


// =====================================================
// DIAS DE ATENDIMENTO DO PROFESSOR
// ISO: 1 = segunda ... 7 = domingo
// =====================================================

function getTeacherWorkDays(
  settings =
    currentTeacherProfileSettings
) {

  const days =
    settings &&
    Array.isArray(
      settings.work_days
    )
      ? settings.work_days
          .map(
            value =>
              Number(value)
          )
          .filter(
            value =>
              value >= 1 &&
              value <= 7
          )
      : [];


  return days.length > 0
    ? days
    : [1, 2, 3, 4, 5, 6, 7];

}


function dateToIsoWeekday(
  date
) {

  const day =
    new Date(
      date
    ).getDay();


  return day === 0
    ? 7
    : day;

}


function isTeacherWorkDayNumber(
  isoDay,
  settings =
    currentTeacherProfileSettings
) {

  return getTeacherWorkDays(
    settings
  ).includes(
    Number(
      isoDay
    )
  );

}


function isTeacherWorkDayDate(
  date,
  settings =
    currentTeacherProfileSettings
) {

  return isTeacherWorkDayNumber(
    dateToIsoWeekday(
      date
    ),
    settings
  );

}


function formatTeacherWorkDays(
  workDays
) {

  const names = {
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sab",
    7: "Dom"
  };


  return (
    workDays || []
  )
    .map(
      value =>
        names[
          Number(value)
        ]
    )
    .filter(Boolean)
    .join(", ");

}


// =====================================================
// HORARIO DENTRO DA JANELA DE ATENDIMENTO
// =====================================================

function timeToEndBoundaryMinutes(
  time
) {

  const normalized =
    normalizeTime(
      time
    );


  if (
    normalized ===
      "00:00"
  ) {

    return 24 * 60;

  }


  return timeToMinutes(
    normalized
  );

}


function intervalEndToMinutes(
  startTime,
  endTime
) {

  const normalizedStart =
    normalizeTime(
      startTime
    );


  const normalizedEnd =
    normalizeTime(
      endTime
    );


  if (
    normalizedEnd ===
      "00:00"
    &&
    normalizedStart !==
      "00:00"
  ) {

    return 24 * 60;

  }


  return timeToMinutes(
    normalizedEnd
  );

}


function minutesToClockTime(
  minutes
) {

  const normalized =
    (
      (
        Number(
          minutes
        )
        %
        (
          24 *
          60
        )
      )
      +
      (
        24 *
        60
      )
    )
    %
    (
      24 *
      60
    );


  const hours =
    Math.floor(
      normalized / 60
    );


  const mins =
    normalized % 60;


  return (
    String(
      hours
    ).padStart(
      2,
      "0"
    )
    +
    ":"
    +
    String(
      mins
    ).padStart(
      2,
      "0"
    )
  );

}


function isTimeInsideTeacherWorkHours(
  startTime,
  endTime,
  settings
) {

  if (!settings) {
    return true;
  }


  const workStart =
    timeToMinutes(
      settings.work_start_time ||
      "00:00"
    );


  const workEnd =
    timeToEndBoundaryMinutes(
      settings.work_end_time ||
      "00:00"
    );


  const slotStart =
    timeToMinutes(
      startTime
    );


  const slotEnd =
    intervalEndToMinutes(
      startTime,
      endTime
    );


  return (
    slotStart >=
      workStart
    &&
    slotEnd <=
      workEnd
  );

}


// =====================================================
// NOME ABREVIADO NA AGENDA DO PROFESSOR
// Ex.: Gabriel Baggio Montes -> Gabriel B.
// =====================================================

function formatAgendaStudentName(
  fullName
) {

  const parts =
    String(
      fullName || ""
    )
      .trim()
      .split(
        /\s+/
      )
      .filter(Boolean);


  if (parts.length === 0) {
    return "";
  }


  if (parts.length === 1) {
    return parts[0];
  }


  return (
    parts[0]
    +
    " "
    +
    parts[1]
      .charAt(0)
      .toUpperCase()
    +
    "."
  );

}


// =====================================================
// AREA DO ADMINISTRADOR
// =====================================================

async function showAdminArea() {

  currentAccessViewV5 = "admin";

  teacherScreen.classList.add(
    "admin-mode-v18"
  );

  teacherScreen.classList.remove(
    "hidden"
  );


  studentScreen.classList.add(
    "hidden"
  );


  document
    .querySelectorAll(
      "[data-teacher-page]"
    )
    .forEach(button => {

      button.style.display =
        "none";

    });


  const header =
    document.getElementById(
      "teacherHeader"
    );


  if (header) {

    header.innerHTML = `

      <h2>
        Ola, ${escapeHtml(
          currentProfile.name
        )}
      </h2>

      <p>
        Area administrativa.
      </p>

      ${renderAccessSwitcherV5("admin")}

    `;

    bindAccessSwitcherV5();

  }


  renderAdminTeacherManagement();

  await loadAdminTeachers();

}


function renderAccessSwitcherV5(activeView) {
  const canUseAdmin = currentProfile?.role === "admin" || currentProfile?.is_admin === true;
  const canUseTeacher = currentProfile?.role === "teacher";

  if (!canUseAdmin || !canUseTeacher) return "";

  return `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
      <button type="button" class="${activeView === "teacher" ? "primary-button" : "secondary-button"}" data-access-view-v5="teacher">
        Area do professor
      </button>
      <button type="button" class="${activeView === "admin" ? "primary-button" : "secondary-button"}" data-access-view-v5="admin">
        Administracao
      </button>
    </div>
  `;
}


function bindAccessSwitcherV5() {
  document.querySelectorAll("[data-access-view-v5]").forEach(button => {
    button.addEventListener("click", async () => {
      const targetView = button.dataset.accessViewV5;
      if (targetView === currentAccessViewV5) return;

      if (targetView === "admin" && (currentProfile?.role === "admin" || currentProfile?.is_admin === true)) {
        await showAdminArea();
        return;
      }

      if (targetView === "teacher" && currentProfile?.role === "teacher") {
        if (currentTeacherAccess?.access_mode === "blocked") {
          alert("O acesso da area do professor esta bloqueado.");
          return;
        }

        if (currentTeacherAccess?.access_mode === "support_only") {
          await showTeacherSupportOnlyArea();
          return;
        }

        await showTeacherArea();
      }
    });
  });
}


// =====================================================
// TELA ADM
// =====================================================

function setupAdminSideMenuV8(content) {
  const teacherCard = content?.querySelector(":scope > .card");
  if (!content || !teacherCard || content.querySelector(".admin-workspace-v8")) return;

  const layout = document.createElement("div");
  layout.className = "admin-workspace-v8";
  layout.innerHTML = `
    <aside class="admin-side-menu-v8" aria-label="Menu administrativo">
      <button type="button" class="admin-side-button-v8 active" data-admin-workspace-v8="summary"><span>1</span>Resumo</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="all"><span>2</span>Todos os professores</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="paid"><span>3</span>Professores assinantes</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="trial"><span>4</span>Professores em teste</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="free"><span>5</span>Acessos gratuitos</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="finance"><span>6</span>Financeiro do Aularium</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="support"><span>7</span>Suporte</button>
      <button type="button" class="admin-side-button-v8" data-admin-workspace-v8="announcements"><span>8</span>Comunicados</button>
    </aside>
    <div class="admin-panels-v8">
      <section class="admin-panel-v8" data-admin-panel-v8="summary"></section>
      <section class="admin-panel-v8" data-admin-panel-v8="teachers"></section>
      <section class="admin-panel-v8" data-admin-panel-v8="finance" hidden></section>
      <section class="admin-panel-v8" data-admin-panel-v8="support" hidden></section>
      <section class="admin-panel-v8" data-admin-panel-v8="announcements" hidden></section>
    </div>
  `;

  content.appendChild(layout);
  const summaryPanel = layout.querySelector('[data-admin-panel-v8="summary"]');
  const teacherPanel = layout.querySelector('[data-admin-panel-v8="teachers"]');
  const financePanel = layout.querySelector('[data-admin-panel-v8="finance"]');
  const supportPanel = layout.querySelector('[data-admin-panel-v8="support"]');
  const announcementsPanel = layout.querySelector('[data-admin-panel-v8="announcements"]');
  teacherPanel.appendChild(teacherCard);
  document.getElementById("adminLegacySystemBillingSettingsV24")?.remove();
  renderAdminSummaryV24(summaryPanel);
  renderAdminPlatformFinanceV9(financePanel);
  renderAdminAnnouncementsV18(announcementsPanel);

  [
    document.getElementById("adminSupportArea")?.parentElement,
    document.getElementById("adminSecurityCheckArea")?.parentElement,
    document.getElementById("adminIntegrityCheckArea")?.parentElement,
    document.getElementById("adminQaArea")?.parentElement,
    document.getElementById("adminPrivacyRequestsV3")?.parentElement
  ].filter((section, index, sections) => section && sections.indexOf(section) === index)
    .forEach(section => supportPanel.appendChild(section));

  const selectWorkspace = view => {
    const isSummary = view === "summary";
    const isSupport = view === "support";
    const isFinance = view === "finance";
    const isAnnouncements = view === "announcements";
    summaryPanel.hidden = !isSummary;
    teacherPanel.hidden = isSummary || isSupport || isFinance || isAnnouncements;
    financePanel.hidden = !isFinance;
    supportPanel.hidden = !isSupport;
    announcementsPanel.hidden = !isAnnouncements;

    layout.querySelectorAll("[data-admin-workspace-v8]").forEach(button => {
      button.classList.toggle("active", button.dataset.adminWorkspaceV8 === view);
    });

    if (!isSummary && !isSupport && !isFinance && !isAnnouncements) {
      currentAdminTeacherFilter = view;
      document.querySelectorAll("[data-admin-teacher-filter]").forEach(button => {
        button.classList.toggle("active", button.dataset.adminTeacherFilter === view);
      });
      renderAdminTeacherListV2();
    }

    if (isFinance && !currentAdminPlatformFinanceRangeV9) {
      loadAdminPlatformFinanceV9();
    }

    if (isAnnouncements) {
      renderAdminAnnouncementsV18(announcementsPanel);
      loadAdminAnnouncementsV18();
    }

    if (isSummary) {
      renderAdminSummaryV24(summaryPanel);
    }
  };

  layout.querySelectorAll("[data-admin-workspace-v8]").forEach(button => {
    button.addEventListener("click", () => selectWorkspace(button.dataset.adminWorkspaceV8));
  });

  selectWorkspace("summary");
}


function getTeacherPlanLabelV24(planCode, accessType) {
  if (accessType === "free") return "Gratuito ilimitado";
  return ({
    trial: "Teste gratuito (15 dias)",
    starter: "Starter",
    plus: "Plus",
    pro: "Pro",
    premium: "Premium",
    custom: "VIP",
    vip: "VIP",
    free: "Gratuito ilimitado"
  })[String(planCode || "").toLowerCase()] || "Plano não informado";
}


function renderAdminSummaryV24(panel) {
  if (!panel) return;

  const countByAccess = type => currentAdminTeachers.filter(teacher =>
    String(teacher.access_category || teacher.access_type || "paid") === type
  ).length;
  const pendingPayments = currentAdminTeachers.filter(teacher =>
    String(teacher.access_category || teacher.access_type || "paid") === "paid" &&
    String(teacher.payment_status || "pending") !== "paid"
  );
  const activeTickets = adminSupportTicketsV3.filter(ticket =>
    !["closed", "resolved", "archived"].includes(String(ticket.status || "").toLowerCase())
  );

  panel.innerHTML = `
    <section class="admin-summary-v24">
      <div class="admin-summary-heading-v24">
        <div><span>VISÃO GERAL</span><h3>Resumo administrativo</h3><p>Acompanhe professores, pagamentos e solicitações de suporte em um só lugar.</p></div>
        <button type="button" class="secondary-button" id="refreshAdminSummaryV24">Atualizar resumo</button>
      </div>
      <div class="admin-summary-stats-v24">
        <article><small>Professores cadastrados</small><strong>${currentAdminTeachers.length}</strong></article>
        <article><small>Assinantes</small><strong>${countByAccess("paid")}</strong></article>
        <article><small>Em teste</small><strong>${countByAccess("trial")}</strong></article>
        <article><small>Gratuitos</small><strong>${countByAccess("free")}</strong></article>
        <article class="${pendingPayments.length ? "needs-attention" : ""}"><small>Pagamentos pendentes</small><strong>${pendingPayments.length}</strong></article>
        <article class="${activeTickets.length ? "needs-attention" : ""}"><small>Chamados em atendimento</small><strong>${activeTickets.length}</strong></article>
      </div>
      <div class="admin-summary-columns-v24">
        <section>
          <h4>Quem precisa de atenção</h4>
          ${pendingPayments.length ? `<ul>${pendingPayments.map(teacher => `<li><strong>${escapeHtml(teacher.teacher_name)}</strong><span>${getTeacherPlanLabelV24(teacher.subscription_plan, teacher.access_type)} · pagamento ${escapeHtml(teacher.payment_status || "pendente")}</span></li>`).join("")}</ul>` : `<p class="admin-summary-empty-v24">Nenhum pagamento pendente no período selecionado.</p>`}
          ${activeTickets.length ? `<ul>${activeTickets.slice(0, 8).map(ticket => `<li><strong>${escapeHtml(ticket.contact_name || ticket.contact_email || "Contato")}</strong><span>${escapeHtml(ticket.subject || "Solicitação de suporte")}</span></li>`).join("")}</ul>` : `<p class="admin-summary-empty-v24">Nenhum chamado aberto carregado.</p>`}
        </section>
        <section>
          <h4>Pagamento do Aularium</h4>
          <p>Definição única exibida para todos os professores.</p>
          <label>Chave PIX<input type="text" id="adminSystemPixKey" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"></label>
          <label>Imagem do QR Code PIX<input type="file" id="adminSystemPixQrFileV25" accept="image/png,image/jpeg,image/webp"></label>
          <small class="admin-system-pix-help-v25">Envie a imagem do QR Code em PNG, JPG ou WEBP, com até 5 MB.</small>
          <div id="adminSystemPixQrPreviewV24" class="admin-system-pix-qr-preview-v24"></div>
          <button type="button" class="action-button" id="saveAdminSystemPixButton">Salvar dados de pagamento</button>
          <p id="adminSystemPixMessage" class="admin-summary-message-v24"></p>
        </section>
      </div>
    </section>
  `;

  document.getElementById("refreshAdminSummaryV24")?.addEventListener("click", async () => {
    await Promise.all([loadAdminTeachers(), loadAdminSupportArea(false)]);
    renderAdminSummaryV24(panel);
    await loadAdminSystemPix();
  });
  document.getElementById("saveAdminSystemPixButton")?.addEventListener("click", saveAdminSystemPix);
  document.getElementById("adminSystemPixQrFileV25")?.addEventListener("change", renderAdminSystemPixQrPreviewV24);
  loadAdminSystemPix();
}


function renderAdminSystemPixQrPreviewV24() {
  const area = document.getElementById("adminSystemPixQrPreviewV24");
  if (!area) return;
  const file = document.getElementById("adminSystemPixQrFileV25")?.files?.[0] || null;
  if (file) {
    const previewUrl = URL.createObjectURL(file);
    area.innerHTML = `<img src="${escapeHtml(previewUrl)}" alt="Prévia do QR Code PIX do Aularium"><small>Nova imagem selecionada</small>`;
    area.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
    return;
  }
  area.innerHTML = currentAdminSystemPixQrUrlV25
    ? `<img src="${escapeHtml(currentAdminSystemPixQrUrlV25)}" alt="QR Code PIX atual do Aularium"><small>Imagem atualmente salva</small>`
    : `<small>Nenhuma imagem de QR Code cadastrada.</small>`;
}


function getAdminPlatformFinanceDefaultRangeV9() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    start: `${year}-01`,
    end: `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`
  };
}


function renderAdminPlatformFinanceV9(panel) {
  if (!panel) return;

  const range = getAdminPlatformFinanceDefaultRangeV9();
  panel.innerHTML = `
    <div class="admin-platform-finance-v9">
      <div class="admin-platform-finance-header-v9">
        <div>
          <p class="admin-platform-finance-kicker-v9">Financeiro da empresa</p>
          <h3>Relat&oacute;rio do Aularium para o contador</h3>
          <p>
            Consolide as vendas das assinaturas dos professores e informe os custos do per&iacute;odo
            para calcular o lucro l&iacute;quido. Este relat&oacute;rio &eacute; separado do financeiro dos alunos.
          </p>
        </div>
        <button type="button" class="action-button" id="exportAdminPlatformFinanceV9">
          Gerar planilha para o contador
        </button>
      </div>

      <div class="admin-platform-finance-fields-v9">
        <label>
          M&ecirc;s inicial
          <input type="month" id="adminPlatformFinanceStartV9" value="${range.start}">
        </label>
        <label>
          M&ecirc;s final
          <input type="month" id="adminPlatformFinanceEndV9" value="${range.end}">
        </label>
        <label>
          Taxas de pagamento (R$)
          <input type="number" id="adminPlatformFinanceFeesV9" min="0" step="0.01" value="0">
        </label>
        <label>
          Impostos provisionados (R$)
          <input type="number" id="adminPlatformFinanceTaxesV9" min="0" step="0.01" value="0">
        </label>
        <label>
          Estornos e reembolsos (R$)
          <input type="number" id="adminPlatformFinanceRefundsV9" min="0" step="0.01" value="0">
        </label>
        <label>
          Outras despesas do CNPJ (R$)
          <input type="number" id="adminPlatformFinanceExpensesV9" min="0" step="0.01" value="0">
        </label>
      </div>

      <div class="admin-platform-finance-actions-v9">
        <button type="button" class="secondary-button" id="refreshAdminPlatformFinanceV9">
          Atualizar resumo
        </button>
        <span>Os custos informados aqui entram na planilha, mas n&atilde;o alteram os cadastros.</span>
      </div>

      <div id="adminPlatformFinanceMessageV9" class="admin-platform-finance-message-v9"></div>
      <div id="adminPlatformFinanceSummaryV9" class="admin-platform-finance-summary-v9">
        <div class="admin-platform-finance-empty-v9">Carregando dados financeiros...</div>
      </div>

      <div class="admin-platform-finance-note-v9">
        <strong>O que a planilha inclui</strong>
        <p>
          Resumo do per&iacute;odo, vendas recebidas, pagamentos pendentes ou atrasados,
          clientes, CNPJ, necessidade de nota fiscal e mem&oacute;ria do c&aacute;lculo do lucro.
          A classifica&ccedil;&atilde;o fiscal final deve ser validada pelo contador.
        </p>
      </div>
    </div>
  `;

  panel.querySelector("#refreshAdminPlatformFinanceV9")
    ?.addEventListener("click", loadAdminPlatformFinanceV9);
  panel.querySelector("#exportAdminPlatformFinanceV9")
    ?.addEventListener("click", exportAdminPlatformFinanceV9);

  ["adminPlatformFinanceFeesV9", "adminPlatformFinanceTaxesV9", "adminPlatformFinanceRefundsV9", "adminPlatformFinanceExpensesV9"]
    .forEach(id => panel.querySelector(`#${id}`)?.addEventListener("input", renderAdminPlatformFinanceSummaryV9));
}


function getAdminPlatformFinanceRangeV9() {
  const start = document.getElementById("adminPlatformFinanceStartV9")?.value || "";
  const end = document.getElementById("adminPlatformFinanceEndV9")?.value || "";
  if (!/^\d{4}-\d{2}$/.test(start) || !/^\d{4}-\d{2}$/.test(end) || start > end) {
    throw new Error("Selecione um periodo mensal valido.");
  }

  const months = [];
  let [year, month] = start.split("-").map(Number);
  const [endYear, endMonth] = end.split("-").map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month, key: `${year}-${String(month).padStart(2, "0")}` });
    month += 1;
    if (month === 13) {
      year += 1;
      month = 1;
    }
    if (months.length > 60) throw new Error("O periodo maximo do relatorio e de 60 meses.");
  }
  return { start, end, months, key: `${start}:${end}` };
}


function getAdminPlatformFinanceCostsV9() {
  const read = id => Math.max(0, Number(document.getElementById(id)?.value || 0));
  return {
    fees: read("adminPlatformFinanceFeesV9"),
    taxes: read("adminPlatformFinanceTaxesV9"),
    refunds: read("adminPlatformFinanceRefundsV9"),
    expenses: read("adminPlatformFinanceExpensesV9")
  };
}


function getAdminPlatformFinanceTotalsV9() {
  const billingRecords = currentAdminPlatformFinanceV9.filter(item => item.amount != null);
  const paid = billingRecords.filter(item => item.payment_status === "paid");
  const open = billingRecords.filter(item => item.payment_status !== "paid" && Number(item.amount || 0) > 0);
  const revenue = paid.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const receivable = open.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const costs = getAdminPlatformFinanceCostsV9();
  const totalCosts = costs.fees + costs.taxes + costs.refunds + costs.expenses;
  return { paid, open, revenue, receivable, costs, totalCosts, profit: revenue - totalCosts };
}


async function loadAdminPlatformFinanceV9() {
  const message = document.getElementById("adminPlatformFinanceMessageV9");
  const summary = document.getElementById("adminPlatformFinanceSummaryV9");
  const refresh = document.getElementById("refreshAdminPlatformFinanceV9");
  if (!summary) return false;

  let range;
  try {
    range = getAdminPlatformFinanceRangeV9();
  } catch (error) {
    if (message) message.textContent = error.message;
    return false;
  }

  if (refresh) {
    refresh.disabled = true;
    refresh.textContent = "Atualizando...";
  }
  if (message) message.textContent = "Buscando as mensalidades registradas...";

  const results = await Promise.all(range.months.map(({ year, month }) =>
    supabaseClient.rpc("get_admin_teacher_system_financial", { p_year: year, p_month: month })
  ));
  const failed = results.find(result => result.error);

  if (refresh) {
    refresh.disabled = false;
    refresh.textContent = "Atualizar resumo";
  }
  if (failed) {
    if (message) message.textContent = failed.error?.message || "Nao foi possivel carregar os dados financeiros.";
    return false;
  }

  const teacherMap = new Map(currentAdminTeachers.map(teacher => [String(teacher.teacher_id), teacher]));
  currentAdminPlatformFinanceV9 = results.flatMap((result, index) => {
    const period = range.months[index];
    return (result.data || []).map(record => ({
      ...record,
      report_year: period.year,
      report_month: period.month,
      report_period: period.key,
      teacher: teacherMap.get(String(record.teacher_id)) || {}
    }));
  });
  currentAdminPlatformFinanceRangeV9 = range.key;
  if (message) message.textContent = `Dados atualizados: ${range.start} a ${range.end}.`;
  renderAdminPlatformFinanceSummaryV9();
  return true;
}


function renderAdminPlatformFinanceSummaryV9() {
  const area = document.getElementById("adminPlatformFinanceSummaryV9");
  if (!area || !currentAdminPlatformFinanceRangeV9) return;
  const totals = getAdminPlatformFinanceTotalsV9();
  area.innerHTML = `
    <article><span>Faturamento recebido</span><strong>${formatCurrency(totals.revenue)}</strong><small>${totals.paid.length} venda(s) paga(s)</small></article>
    <article><span>A receber</span><strong>${formatCurrency(totals.receivable)}</strong><small>${totals.open.length} pendencia(s)</small></article>
    <article><span>Custos informados</span><strong>${formatCurrency(totals.totalCosts)}</strong><small>Taxas, impostos, estornos e despesas</small></article>
    <article class="${totals.profit < 0 ? "negative" : "profit"}"><span>Lucro liquido estimado</span><strong>${formatCurrency(totals.profit)}</strong><small>Recebido menos custos informados</small></article>
  `;
}


function adminPlatformFinanceStatusV9(item) {
  if (item.payment_status === "paid") return "Pago";
  if (item.display_status === "overdue") return "Atrasado";
  if (item.display_status === "not_configured") return "Nao configurado";
  return "Pendente";
}


function escapeSpreadsheetXmlV9(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function buildSpreadsheetXmlV9(sheets) {
  const worksheets = sheets.map(sheet => {
    const rows = sheet.rows.map((row, rowIndex) => {
      const cells = row.map((value, cellIndex) => {
        const isNumber = typeof value === "number" && Number.isFinite(value);
        const isCurrency = isNumber && (sheet.currencyColumns || []).includes(cellIndex);
        const style = isCurrency ? ' ss:StyleID="Currency"' : (sheet.headerRows || [0]).includes(rowIndex) ? ' ss:StyleID="Header"' : "";
        return `<Cell${style}><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeSpreadsheetXmlV9(value)}</Data></Cell>`;
      }).join("");
      return `<Row>${cells}</Row>`;
    }).join("");
    return `<Worksheet ss:Name="${escapeSpreadsheetXmlV9(sheet.name)}"><Table>${rows}</Table></Worksheet>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
  <Style ss:ID="Header"><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#F7E9E1" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Currency"><NumberFormat ss:Format="R$ #,##0.00"/></Style>
 </Styles>
 ${worksheets}
</Workbook>`;
}


async function exportAdminPlatformFinanceV9() {
  const button = document.getElementById("exportAdminPlatformFinanceV9");
  const message = document.getElementById("adminPlatformFinanceMessageV9");
  let range;
  try {
    range = getAdminPlatformFinanceRangeV9();
  } catch (error) {
    if (message) message.textContent = error.message;
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Preparando planilha...";
  }

  if (currentAdminPlatformFinanceRangeV9 !== range.key) {
    const loaded = await loadAdminPlatformFinanceV9();
    if (!loaded) {
      if (button) {
        button.disabled = false;
        button.textContent = "Gerar planilha para o contador";
      }
      return;
    }
  }

  const totals = getAdminPlatformFinanceTotalsV9();
  const generatedAt = new Date().toLocaleString("pt-BR");
  const summaryRows = [
    ["AULARIUM - RELATORIO FINANCEIRO PARA O CONTADOR"],
    ["Periodo", `${range.start} a ${range.end}`],
    ["Gerado em", generatedAt],
    [],
    ["Indicador", "Valor (R$)", "Criterio"],
    ["Faturamento recebido", totals.revenue, "Somente mensalidades marcadas como pagas"],
    ["Valores a receber", totals.receivable, "Pagamentos pendentes ou atrasados; nao compoem o lucro"],
    ["Taxas de pagamento", totals.costs.fees, "Valor informado pelo administrador"],
    ["Impostos provisionados", totals.costs.taxes, "Valor informado pelo administrador"],
    ["Estornos e reembolsos", totals.costs.refunds, "Valor informado pelo administrador"],
    ["Outras despesas do CNPJ", totals.costs.expenses, "Valor informado pelo administrador"],
    ["Total de custos", totals.totalCosts, "Soma dos quatro itens anteriores"],
    ["Lucro liquido estimado", totals.profit, "Faturamento recebido menos total de custos"],
    [],
    ["Observacao", "Relatorio gerencial. O contador deve validar competencia, regime tributario, documentos fiscais e classificacao contabil."]
  ];
  const saleHeader = ["Competencia", "Cliente / professor", "E-mail", "CPF", "CNPJ", "Vencimento", "Data do pagamento", "Valor (R$)", "Status", "Nota fiscal solicitada", "ID do professor"];
  const saleRows = currentAdminPlatformFinanceV9.filter(item => item.amount != null).map(item => {
    const teacher = item.teacher || {};
    return [
      item.report_period,
      teacher.teacher_name || item.teacher_name || "",
      teacher.teacher_email || item.teacher_email || "",
      teacher.cpf || "",
      teacher.cnpj || "",
      item.due_date || "",
      item.paid_at || item.payment_date || "",
      Number(item.amount || 0),
      adminPlatformFinanceStatusV9(item),
      item.invoice_required === true || item.system_invoice_required === true ? "Sim" : "Nao",
      item.teacher_id || ""
    ];
  });
  const monthlyMap = new Map(range.months.map(period => [period.key, { received: 0, receivable: 0, paid: 0, open: 0 }]));
  currentAdminPlatformFinanceV9.forEach(item => {
    const monthly = monthlyMap.get(item.report_period);
    if (!monthly) return;
    if (item.payment_status === "paid") {
      monthly.received += Number(item.amount || 0);
      monthly.paid += 1;
    } else if (Number(item.amount || 0) > 0) {
      monthly.receivable += Number(item.amount || 0);
      monthly.open += 1;
    }
  });
  const monthlyRows = [...monthlyMap].map(([period, value]) => [period, value.received, value.paid, value.receivable, value.open]);
  const costRows = [
    ["Categoria", "Valor (R$)", "Origem"],
    ["Taxas de pagamento", totals.costs.fees, "Informado pelo administrador"],
    ["Impostos provisionados", totals.costs.taxes, "Informado pelo administrador"],
    ["Estornos e reembolsos", totals.costs.refunds, "Informado pelo administrador"],
    ["Outras despesas do CNPJ", totals.costs.expenses, "Informado pelo administrador"]
  ];
  const workbookXml = buildSpreadsheetXmlV9([
    { name: "Resumo", rows: summaryRows, currencyColumns: [1], headerRows: [0, 4] },
    { name: "Vendas e pendencias", rows: [saleHeader, ...saleRows], currencyColumns: [7] },
    { name: "Resumo mensal", rows: [["Competencia", "Recebido (R$)", "Vendas pagas", "A receber (R$)", "Pendencias"], ...monthlyRows], currencyColumns: [1, 3] },
    { name: "Custos informados", rows: costRows, currencyColumns: [1] }
  ]);
  downloadBlobV3(
    `aularium-contador-${range.start}-a-${range.end}.xls`,
    workbookXml,
    "application/vnd.ms-excel;charset=utf-8"
  );
  if (message) message.textContent = "Planilha gerada com sucesso.";
  if (button) {
    button.disabled = false;
    button.textContent = "Gerar planilha para o contador";
  }
}

function renderAdminTeacherManagement() {

  const content =
    document.getElementById(
      "teacherContent"
    );


  if (!content) {
    return;
  }


  const systemBillingNow =
    new Date();


  const defaultSystemBillingMonth =
    String(
      systemBillingNow.getFullYear()
    )
    +
    "-"
    +
    String(
      systemBillingNow.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  content.innerHTML = `

    <div class="card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          flex-wrap:wrap;
        "
      >

        <div>

          <h3
            style="
              margin:0;
            "
          >
            Professores
          </h3>


          <p
            style="
              margin:6px 0 0;
              color:#666;
            "
          >
            Cadastre, pause, reative ou exclua acessos de professores.
          </p>

        </div>


        <button
          type="button"
          class="action-button"
          id="openAdminTeacherRegistrationButton"
        >
          + Cadastrar professor
        </button>

      </div>


      <div
        id="adminTeacherRegistrationArea"
        style="
          display:none;
          margin-top:18px;
          padding:16px;
          border-radius:10px;
          background:#fffaf3;
          border:1px solid #e7dfd5;
        "
      ></div>


      <div
        id="adminLegacySystemBillingSettingsV24"
        style="
          margin-top:18px;
          padding:14px;
          border-radius:9px;
          background:#f7e9e1;
          border:1px solid #e7dfd5;
        "
      >

        <strong>
          Dados para pagamento do sistema
        </strong>


        <div
          style="
            display:flex;
            gap:10px;
            align-items:end;
            flex-wrap:wrap;
            margin-top:10px;
          "
        >

          <div
            style="
              flex:1;
              min-width:220px;
            "
          >

            <label
              for="adminSystemPixKey"
              style="
                display:block;
                font-size:12px;
                font-weight:bold;
                margin-bottom:5px;
              "
            >
              PIX para pagamento
            </label>


            <input
              type="text"
              id="adminSystemPixKey"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #ccc;
                border-radius:7px;
              "
            >

          </div>


          <button
            type="button"
            class="secondary-button"
            id="saveAdminSystemPixButton"
          >
            Salvar PIX
          </button>

        </div>


        <p
          id="adminSystemPixMessage"
          style="
            margin:8px 0 0;
            font-size:13px;
          "
        ></p>

      </div>


      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-top:18px;
          padding:12px 14px;
          border-radius:9px;
          background:#fffaf3;
        "
      >

        <div>

          <strong>
            Mensalidade dos professores
          </strong>


          <div
            style="
              margin-top:3px;
              color:#666;
              font-size:12px;
            "
          >
            Selecione o mes para conferir e registrar o pagamento.
          </div>

        </div>


        <input
          type="month"
          id="adminTeacherSystemMonth"
          value="${defaultSystemBillingMonth}"
          style="
            padding:9px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div
        id="adminTeacherSystemReceivedSummary"
        style="
          margin-top:14px;
        "
      ></div>


      <div
        id="adminTeacherFilterTabs"
        class="admin-filter-tabs"
      >
        <button type="button" class="secondary-button active" data-admin-teacher-filter="all">Todos</button>
        <button type="button" class="secondary-button" data-admin-teacher-filter="paid">Assinantes / pagos</button>
        <button type="button" class="secondary-button" data-admin-teacher-filter="trial">Interessados / teste gratis</button>
        <button type="button" class="secondary-button" data-admin-teacher-filter="free">Gratis ilimitado</button>
      </div>


      <div
        id="adminTeacherList"
        style="
          margin-top:20px;
        "
      >
        Carregando professores...
      </div>


      <div
        style="
          margin-top:22px;
          padding-top:18px;
          border-top:1px solid #ddd;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h4
              style="
                margin:0;
              "
            >
              Seguranca do Aularium
            </h4>


            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              Verificacao rapida das permissoes principais.
            </p>

          </div>


          <button
            type="button"
            class="secondary-button"
            id="runAdminSecurityCheckButton"
          >
            Executar diagnostico
          </button>

        </div>


        <div
          id="adminSecurityCheckArea"
          style="
            margin-top:12px;
          "
        ></div>

      </div>


      <div
        style="
          margin-top:22px;
          padding-top:18px;
          border-top:1px solid #ddd;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h4
              style="
                margin:0;
              "
            >
              Integridade do Aularium
            </h4>


            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              Procura inconsistencias de cadastro, agenda,
              financeiro, reposicoes e acessos.
            </p>

          </div>


          <button
            type="button"
            class="action-button"
            id="runAdminIntegrityCheckButton"
          >
            Executar verificacao completa
          </button>

        </div>


        <div
          id="adminIntegrityCheckArea"
          style="
            margin-top:12px;
          "
        ></div>


        <div
          id="adminIntegrityDetailsArea"
          style="
            margin-top:12px;
          "
        ></div>

      </div>


      <div
        style="
          margin-top:22px;
          padding-top:18px;
          border-top:1px solid #ddd;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:12px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h4
              style="
                margin:0;
              "
            >
              Homologacao final
            </h4>


            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              Execute os fluxos com contas de teste e registre
              aqui o resultado antes de liberar o Aularium.
            </p>

          </div>


          <button
            type="button"
            class="action-button"
            id="openAdminQaButton"
          >
            Abrir checklist final
          </button>

        </div>


        <div
          id="adminQaArea"
          style="
            margin-top:14px;
          "
        ></div>

      </div>


      <div
        style="
          margin-top:22px;
          padding-top:18px;
          border-top:1px solid #ddd;
        "
      >
        <h4 style="margin-top:0;">Suporte</h4>
        <p>Mensagens enviadas por professores e interessados.</p>
        <div class="admin-filter-tabs" style="margin-bottom:14px;">
          <button type="button" class="secondary-button active" data-admin-support-view-v4="active">Em atendimento</button>
          <button type="button" class="secondary-button" data-admin-support-view-v4="archived">Arquivados</button>
        </div>
        <div id="adminSupportArea">Carregando chamados...</div>
      </div>

      <div
        style="
          margin-top:22px;
          padding-top:18px;
          border-top:1px solid #ddd;
        "
      >
        <h4 style="margin-top:0;">Privacidade e dados pessoais</h4>
        <p>Pedidos de exportacao, correcao e exclusao enviados pelos usuarios.</p>
        <div id="adminPrivacyRequestsV3">Carregando solicitacoes...</div>
      </div>

    </div>

  `;


  const openButton =
    document.getElementById(
      "openAdminTeacherRegistrationButton"
    );


  if (openButton) {

    openButton.addEventListener(
      "click",
      openAdminTeacherRegistrationForm
    );

  }


  const securityButton =
    document.getElementById(
      "runAdminSecurityCheckButton"
    );


  if (securityButton) {

    securityButton.addEventListener(
      "click",
      loadAdminSecurityCheck
    );

  }


  const integrityButton =
    document.getElementById(
      "runAdminIntegrityCheckButton"
    );


  if (integrityButton) {

    integrityButton.addEventListener(
      "click",
      loadAdminIntegrityCheck
    );

  }


  const qaButton =
    document.getElementById(
      "openAdminQaButton"
    );


  if (qaButton) {

    qaButton.addEventListener(
      "click",
      loadAdminQaChecklist
    );

  }


  const systemMonthInput =
    document.getElementById(
      "adminTeacherSystemMonth"
    );


  if (systemMonthInput) {

    systemMonthInput.addEventListener(
      "change",
      loadAdminTeachers
    );

  }


  loadAdminSystemPix();

  document
    .querySelectorAll(
      "[data-admin-teacher-filter]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          currentAdminTeacherFilter =
            button.dataset.adminTeacherFilter || "all";

          document
            .querySelectorAll("[data-admin-teacher-filter]")
            .forEach(item => item.classList.toggle(
              "active",
              item === button
            ));

          renderAdminTeacherListV2();
        }
      );
    });

  loadAdminSupportArea();
  loadAdminPrivacyRequestsV3();

  document.querySelectorAll("[data-admin-support-view-v4]")
    .forEach(button => button.addEventListener("click", () => {
      adminSupportViewV4 = button.dataset.adminSupportViewV4 || "active";
      document.querySelectorAll("[data-admin-support-view-v4]")
        .forEach(item => item.classList.toggle("active", item === button));
      loadAdminSupportArea(false);
    }));

  setupAdminSideMenuV8(content);

}


// =====================================================
// TESTES DA HOMOLOGACAO FINAL
// =====================================================

function getAdminQaChecks() {

  return [

    {
      key:
        "security_diagnostic",
      category:
        "Base",
      title:
        "Diagnostico de seguranca",
      instruction:
        "No ADM, execute Seguranca do Aularium.",
      expected:
        "O diagnostico principal deve retornar OK, sem permissoes sensiveis abertas."
    },

    {
      key:
        "integrity_diagnostic",
      category:
        "Base",
      title:
        "Diagnostico de integridade",
      instruction:
        "No ADM, execute Integridade do Aularium.",
      expected:
        "Nenhuma inconsistencia critica deve permanecer antes da liberacao."
    },

    {
      key:
        "admin_create_teacher",
      category:
        "ADM",
      title:
        "Cadastrar professor",
      instruction:
        "Crie um professor de teste pelo ADM com nome, e-mail, senha e horario de atendimento.",
      expected:
        "O professor aparece como Ativo e consegue entrar com o novo login."
    },

    {
      key:
        "admin_pause_teacher",
      category:
        "ADM",
      title:
        "Pausar professor",
      instruction:
        "Pause o professor de teste e tente entrar com a conta dele.",
      expected:
        "O login do professor fica bloqueado e o historico permanece intacto."
    },

    {
      key:
        "admin_reactivate_teacher",
      category:
        "ADM",
      title:
        "Reativar professor",
      instruction:
        "Reative o mesmo professor e tente entrar novamente.",
      expected:
        "O login volta a funcionar sem perder alunos, agenda ou historico."
    },

    {
      key:
        "teacher_system_payment",
      category:
        "ADM",
      title:
        "Mensalidade do professor no sistema",
      instruction:
        "No ADM, configure PIX do sistema, valor, vencimento, necessidade de nota fiscal e status de pagamento. Depois abra o Perfil do professor.",
      expected:
        "O professor ve o PIX correto, valor, vencimento, status e se a nota fiscal e necessaria."
    },

    {
      key:
        "teacher_profile_hours",
      category:
        "Professor",
      title:
        "Perfil e horario da agenda",
      instruction:
        "No Perfil do professor, altere o horario, por exemplo para 08:00 ate 20:00.",
      expected:
        "A agenda passa a exibir somente a janela configurada, com blocos de 30 minutos ate 19:30."
    },

    {
      key:
        "student_registration_schedule",
      category:
        "Alunos",
      title:
        "Cadastrar aluno com contrato e horario",
      instruction:
        "Cadastre um aluno de teste com nascimento, financeiro, contrato e aula fixa.",
      expected:
        "O acesso e criado, o aluno aparece em Alunos e a aula aparece na agenda correta."
    },

    {
      key:
        "student_name_abbreviation",
      category:
        "Agenda",
      title:
        "Nome abreviado na agenda",
      instruction:
        "Cadastre nome completo com pelo menos sobrenome e abra a agenda do professor.",
      expected:
        "A agenda mostra primeiro nome + inicial do primeiro sobrenome, sem alterar o nome completo no cadastro."
    },

    {
      key:
        "minor_guardian_privacy",
      category:
        "Responsavel",
      title:
        "Menor sem valores financeiros",
      instruction:
        "Use um aluno menor de 18 anos. Entre como aluno e depois como responsavel vinculado.",
      expected:
        "O aluno nao recebe valores monetarios; o responsavel ve o financeiro completo."
    },

    {
      key:
        "regular_lesson_change",
      category:
        "Agenda",
      title:
        "Alteracao de uma aula regular",
      instruction:
        "Mude somente uma ocorrencia de uma aula para outro horario.",
      expected:
        "Apenas aquela data muda. A agenda fixa e o historico das demais semanas permanecem corretos."
    },

    {
      key:
        "student_regular_cancellation",
      category:
        "Cancelamentos",
      title:
        "Cancelamento de aula regular pelo aluno",
      instruction:
        "Teste um cancelamento com mais de 2 horas e outro com menos de 2 horas.",
      expected:
        "Com 2h ou mais gera direito a reposicao; com menos de 2h nao gera."
    },

    {
      key:
        "makeup_flow",
      category:
        "Reposicoes",
      title:
        "Fluxo completo de reposicao",
      instruction:
        "Reserve uma reposicao, cancele uma vez com antecedencia e depois teste o segundo cancelamento.",
      expected:
        "Primeiro cancelamento devolve a reposicao uma vez; o segundo faz perder o direito conforme a regra."
    },

    {
      key:
        "attendance_makeup",
      category:
        "Presenca",
      title:
        "Falta e falta justificada",
      instruction:
        "Registre falta normal, falta justificada e depois corrija o status.",
      expected:
        "Falta normal nao gera reposicao; justificada gera; ao corrigir o status a reposicao correspondente e ajustada."
    },

    {
      key:
        "national_holiday",
      category:
        "Feriados",
      title:
        "Feriado nacional",
      instruction:
        "Abra uma semana com feriado nacional e teste Aula normal e Nao ter aula.",
      expected:
        "A decisao aparece na agenda; em Sem aula o dia bloqueia reposicoes e nao conta como aula cobrada por aula."
    },

    {
      key:
        "rules_image",
      category:
        "Regras",
      title:
        "Imagem nas regras",
      instruction:
        "Envie uma imagem nas Regras, confira como aluno, substitua e depois remova.",
      expected:
        "Texto e imagem aparecem ao aluno; substituicao e remocao funcionam sem quebrar as regras."
    },

    {
      key:
        "student_materials",
      category:
        "Materiais",
      title:
        "Material individual do aluno",
      instruction:
        "Envie um link para apenas um aluno e entre com duas contas de alunos diferentes.",
      expected:
        "Somente o aluno selecionado ve o material e consegue abrir o link."
    },

    {
      key:
        "student_comment",
      category:
        "Comunicacao",
      title:
        "Comentario do aluno",
      instruction:
        "O aluno comenta uma aula. Depois abra Ver aluno como professor.",
      expected:
        "O professor recebe indicacao de comentario novo, consegue ler e o aviso deixa de ficar como nao lido."
    },

    {
      key:
        "monthly_finance",
      category:
        "Financeiro",
      title:
        "Cobranca mensal",
      instruction:
        "Configure um aluno como mensal e gere o financeiro de um mes dentro do contrato.",
      expected:
        "O valor mensal, vencimento, status e relatorio do mes aparecem sem duplicar o lancamento."
    },

    {
      key:
        "per_lesson_finance",
      category:
        "Financeiro",
      title:
        "Cobranca por aula",
      instruction:
        "Configure um aluno por aula e gere um mes com contrato, pausa ou feriado no periodo.",
      expected:
        "Somente aulas regulares cobraveis sao contadas; reposicoes nao sao cobradas novamente."
    },

    {
      key:
        "contract_renewal",
      category:
        "Contrato",
      title:
        "Renovacao de contrato",
      instruction:
        "Renove o contrato de um aluno de teste.",
      expected:
        "O novo contrato vira o atual e o contrato anterior permanece no Historico de contratos."
    },

    {
      key:
        "guardian_readonly",
      category:
        "Responsavel",
      title:
        "Acesso somente leitura do responsavel",
      instruction:
        "Entre como responsavel e percorra agenda, historico, observacoes e financeiro.",
      expected:
        "O responsavel consegue consultar os dados vinculados, mas nao consegue alterar aulas ou registros."
    }

  ];

}


// =====================================================
// CARREGAR HOMOLOGACAO
// =====================================================

async function loadAdminQaChecklist() {

  const area =
    document.getElementById(
      "adminQaArea"
    );


  const openButton =
    document.getElementById(
      "openAdminQaButton"
    );


  if (!area) {
    return;
  }


  if (openButton) {

    openButton.disabled =
      true;

    openButton.textContent =
      "Carregando...";

  }


  area.innerHTML =
    "Carregando checklist...";


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_qa_results"
    );


  if (openButton) {

    openButton.disabled =
      false;

    openButton.textContent =
      "Atualizar checklist";

  }


  if (error) {

    console.error(
      "Erro ao carregar homologacao:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:8px;
          background:#fdecea;
          color:#8a1f17;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar a homologacao."
        )}
      </div>

    `;


    return;
  }


  const savedResults =
    data || [];


  const checks =
    getAdminQaChecks()
      .map(
        check => {

          const saved =
            savedResults.find(
              item =>
                item.check_key ===
                  check.key
            );


          return {
            ...check,

            status:
              saved
                ? saved.status
                : "not_tested",

            notes:
              saved
                ? saved.notes || ""
                : "",

            updated_at:
              saved
                ? saved.updated_at
                : null
          };

        }
      );


  renderAdminQaChecklist(
    checks
  );

}


// =====================================================
// RENDERIZAR HOMOLOGACAO
// =====================================================

function renderAdminQaChecklist(
  checks
) {

  const area =
    document.getElementById(
      "adminQaArea"
    );


  if (!area) {
    return;
  }


  const total =
    checks.length;


  const passed =
    checks.filter(
      item =>
        item.status ===
          "passed"
    ).length;


  const failed =
    checks.filter(
      item =>
        item.status ===
          "failed"
    ).length;


  const tested =
    passed +
    failed;


  const percent =
    total > 0

      ? Math.round(
          (
            passed /
            total
          )
          *
          100
        )

      : 0;


  const categories =
    [
      ...new Set(
        checks.map(
          item =>
            item.category
        )
      )
    ];


  area.innerHTML = `

    <div
      style="
        padding:14px;
        border-radius:10px;
        background:${
          failed > 0
            ? "#fff3cd"
            : (
                passed === total
                  ? "#eef8f0"
                  : "#fffaf3"
              )
        };
        border:1px solid #ddd;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
          align-items:flex-start;
        "
      >

        <div>

          <strong
            style="
              font-size:18px;
            "
          >
            ${passed}/${total} testes aprovados
          </strong>


          <div
            style="
              margin-top:4px;
              color:#666;
              font-size:13px;
            "
          >
            ${tested} testado(s) -
            ${failed} falha(s) -
            ${total - tested} pendente(s)
          </div>

        </div>


        <div
          style="
            text-align:right;
          "
        >

          <strong
            style="
              font-size:24px;
            "
          >
            ${percent}%
          </strong>


          <div
            style="
              font-size:12px;
              color:#666;
            "
          >
            aprovacao
          </div>

        </div>

      </div>


      <div
        style="
          height:10px;
          background:#e2e2e2;
          border-radius:999px;
          overflow:hidden;
          margin-top:12px;
        "
      >

        <div
          style="
            width:${percent}%;
            height:100%;
            background:currentColor;
          "
        ></div>

      </div>


      ${
        passed === total

          ? `

            <div
              style="
                margin-top:12px;
                font-weight:bold;
              "
            >
              Checklist completo. Execute novamente Seguranca
              e Integridade antes da liberacao definitiva.
            </div>

          `

          : ""
      }

    </div>


    <div
      style="
        display:flex;
        justify-content:flex-end;
        margin-top:10px;
      "
    >

      <button
        type="button"
        class="secondary-button"
        id="resetAdminQaButton"
      >
        Reiniciar homologacao
      </button>

    </div>


    <div
      style="
        display:grid;
        gap:18px;
        margin-top:16px;
      "
    >

      ${categories
        .map(
          category => `

            <div>

              <h4
                style="
                  margin:0 0 9px;
                "
              >
                ${escapeHtml(
                  category
                )}
              </h4>


              <div
                style="
                  display:grid;
                  gap:10px;
                "
              >

                ${checks
                  .filter(
                    item =>
                      item.category ===
                        category
                  )
                  .map(
                    renderAdminQaCheck
                  )
                  .join("")}

              </div>

            </div>

          `
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".admin-qa-status-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          saveAdminQaCheck(
            button.dataset.checkKey,
            button.dataset.status
          );

        }
      );

    });


  const resetButton =
    document.getElementById(
      "resetAdminQaButton"
    );


  if (resetButton) {

    resetButton.addEventListener(
      "click",
      resetAdminQaChecklist
    );

  }

}


// =====================================================
// CARD DE UM TESTE
// =====================================================

function renderAdminQaCheck(
  item
) {

  const statusLabel =
    item.status ===
      "passed"

      ? "PASSOU"

      : (
          item.status ===
            "failed"

            ? "FALHOU"

            : "NAO TESTADO"
        );


  const statusBackground =
    item.status ===
      "passed"

      ? "#eef8f0"

      : (
          item.status ===
            "failed"

            ? "#fdecea"

            : "#fffaf3"
        );


  return `

    <div
      style="
        padding:14px;
        border:1px solid #ddd;
        border-radius:9px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
          flex-wrap:wrap;
        "
      >

        <div>

          <strong>
            ${escapeHtml(
              item.title
            )}
          </strong>


          <div
            style="
              display:inline-block;
              margin-left:7px;
              padding:3px 7px;
              border-radius:999px;
              background:${statusBackground};
              font-size:11px;
              font-weight:bold;
            "
          >
            ${statusLabel}
          </div>

        </div>


        <div
          style="
            display:flex;
            gap:6px;
            flex-wrap:wrap;
          "
        >

          <button
            type="button"
            class="secondary-button admin-qa-status-button"
            data-check-key="${item.key}"
            data-status="passed"
          >
            Passou
          </button>


          <button
            type="button"
            class="secondary-button admin-qa-status-button"
            data-check-key="${item.key}"
            data-status="failed"
            style="
              color:#a12622;
              border-color:#a12622;
            "
          >
            Falhou
          </button>


          <button
            type="button"
            class="secondary-button admin-qa-status-button"
            data-check-key="${item.key}"
            data-status="not_tested"
          >
            Limpar
          </button>

        </div>

      </div>


      <div
        style="
          margin-top:10px;
          font-size:13px;
        "
      >

        <strong>
          Como testar:
        </strong>

        ${escapeHtml(
          item.instruction
        )}

      </div>


      <div
        style="
          margin-top:7px;
          padding:9px 10px;
          border-radius:7px;
          background:#fffaf3;
          font-size:13px;
        "
      >

        <strong>
          Resultado esperado:
        </strong>

        ${escapeHtml(
          item.expected
        )}

      </div>


      <textarea
        id="adminQaNotes_${item.key}"
        rows="2"
        maxlength="4000"
        placeholder="Observacoes, erro encontrado, conta usada no teste..."
        style="
          width:100%;
          box-sizing:border-box;
          margin-top:9px;
          padding:9px;
          border:1px solid #ccc;
          border-radius:7px;
          resize:vertical;
          font-family:inherit;
        "
      >${escapeHtml(
        item.notes || ""
      )}</textarea>

    </div>

  `;

}


// =====================================================
// SALVAR RESULTADO DE UM TESTE
// =====================================================

async function saveAdminQaCheck(
  checkKey,
  status
) {

  const notesInput =
    document.getElementById(
      "adminQaNotes_" +
      checkKey
    );


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_admin_qa_result",
      {

        p_check_key:
          checkKey,

        p_status:
          status,

        p_notes:
          notesInput
            ? notesInput.value.trim() || null
            : null

      }
    );


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel salvar o resultado do teste."
    );


    return;
  }


  await loadAdminQaChecklist();

}


// =====================================================
// REINICIAR HOMOLOGACAO
// =====================================================

async function resetAdminQaChecklist() {

  if (
    !window.confirm(
      "Reiniciar toda a homologacao? Todos os status e observacoes deste ADM serao apagados."
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "reset_admin_qa_results"
    );


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel reiniciar a homologacao."
    );


    return;
  }


  await loadAdminQaChecklist();

}


// =====================================================
// DIAGNOSTICO DE INTEGRIDADE DO ERP
// =====================================================

async function loadAdminIntegrityCheck() {

  const area =
    document.getElementById(
      "adminIntegrityCheckArea"
    );


  const detailsArea =
    document.getElementById(
      "adminIntegrityDetailsArea"
    );


  const button =
    document.getElementById(
      "runAdminIntegrityCheckButton"
    );


  if (!area) {
    return;
  }


  if (detailsArea) {

    detailsArea.innerHTML =
      "";

  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Verificando...";

  }


  area.innerHTML =
    "Executando verificacoes...";


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_erp_integrity_check"
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Executar verificacao completa";

  }


  if (error) {

    console.error(
      "Erro no diagnostico de integridade:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:8px;
          background:#fdecea;
          color:#8a1f17;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel executar o diagnostico."
        )}
      </div>

    `;


    return;
  }


  const checks =
    data || [];


  const issues =
    checks.filter(
      item =>
        Number(
          item.issue_count || 0
        ) > 0
    );


  const criticalCount =
    issues
      .filter(
        item =>
          item.severity ===
            "critical"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total
          +
          Number(
            item.issue_count || 0
          ),
        0
      );


  const warningCount =
    issues
      .filter(
        item =>
          item.severity ===
            "warning"
      )
      .reduce(
        (
          total,
          item
        ) =>
          total
          +
          Number(
            item.issue_count || 0
          ),
        0
      );


  if (
    criticalCount === 0
    &&
    warningCount === 0
  ) {

    area.innerHTML = `

      <div
        style="
          padding:14px;
          border-radius:9px;
          background:#eef8f0;
        "
      >
        <strong>
          Integridade principal: OK
        </strong>

        <div
          style="
            margin-top:5px;
            color:#555;
            font-size:13px;
          "
        >
          Nenhuma inconsistencia foi encontrada nas
          verificacoes automaticas.
        </div>
      </div>

    `;


    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:14px;
        border-radius:9px;
        background:${
          criticalCount > 0
            ? "#fdecea"
            : "#fff3cd"
        };
      "
    >

      <strong>
        ${
          criticalCount > 0
            ? (
                criticalCount
                +
                " problema(s) critico(s)"
              )
            : "Nenhum problema critico"
        }
      </strong>


      <div
        style="
          margin-top:4px;
          font-size:13px;
        "
      >
        ${warningCount}
        aviso(s) adicional(is).
      </div>


      <div
        style="
          display:grid;
          gap:9px;
          margin-top:12px;
        "
      >

        ${issues
          .map(
            item => `

              <div
                style="
                  padding:11px;
                  border-radius:8px;
                  background:#ffffff;
                  border:1px solid #e2e2e2;
                "
              >

                <div
                  style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:10px;
                    flex-wrap:wrap;
                  "
                >

                  <div>

                    <strong>
                      ${
                        item.severity ===
                          "critical"
                          ? "CRITICO"
                          : "ATENCAO"
                      }
                      -
                      ${escapeHtml(
                        item.title
                      )}
                    </strong>


                    <div
                      style="
                        margin-top:4px;
                        color:#666;
                        font-size:13px;
                      "
                    >
                      ${escapeHtml(
                        item.detail || ""
                      )}
                    </div>

                  </div>


                  <div
                    style="
                      display:flex;
                      align-items:center;
                      gap:8px;
                    "
                  >

                    <strong
                      style="
                        font-size:20px;
                      "
                    >
                      ${Number(
                        item.issue_count || 0
                      )}
                    </strong>


                    <button
                      type="button"
                      class="secondary-button admin-integrity-details-button"
                      data-check-key="${escapeHtml(
                        item.check_key
                      )}"
                      data-check-title="${escapeHtml(
                        item.title
                      )}"
                    >
                      Ver detalhes
                    </button>

                  </div>

                </div>

              </div>

            `
          )
          .join("")}

      </div>

    </div>

  `;


  document
    .querySelectorAll(
      ".admin-integrity-details-button"
    )
    .forEach(buttonItem => {

      buttonItem.addEventListener(
        "click",
        () => {

          loadAdminIntegrityDetails(
            buttonItem.dataset.checkKey,
            buttonItem.dataset.checkTitle
          );

        }
      );

    });

}


// =====================================================
// DETALHES DE UMA INCONSISTENCIA
// =====================================================

async function loadAdminIntegrityDetails(
  checkKey,
  checkTitle
) {

  const area =
    document.getElementById(
      "adminIntegrityDetailsArea"
    );


  if (!area) {
    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:12px;
        border-radius:8px;
        background:#fffaf3;
      "
    >
      Carregando detalhes...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_erp_integrity_details",
      {
        p_check_key:
          checkKey
      }
    );


  if (error) {

    area.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:8px;
          background:#fdecea;
          color:#8a1f17;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar os detalhes."
        )}
      </div>

    `;


    return;
  }


  const rows =
    data || [];


  area.innerHTML = `

    <div
      style="
        padding:14px;
        border:1px solid #ddd;
        border-radius:9px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
          flex-wrap:wrap;
        "
      >

        <strong>
          ${escapeHtml(
            checkTitle || "Detalhes"
          )}
        </strong>


        <button
          type="button"
          class="secondary-button"
          id="closeAdminIntegrityDetailsButton"
        >
          Fechar
        </button>

      </div>


      <div
        style="
          display:grid;
          gap:7px;
          margin-top:12px;
        "
      >

        ${
          rows.length === 0

            ? `

              <div>
                Nenhum registro encontrado.
              </div>

            `

            : rows
                .map(
                  row => `

                    <div
                      style="
                        padding:9px 10px;
                        border-radius:7px;
                        background:#fffaf3;
                      "
                    >

                      <strong>
                        ${escapeHtml(
                          row.primary_label || ""
                        )}
                      </strong>


                      ${
                        row.secondary_label

                          ? `

                            <div
                              style="
                                margin-top:3px;
                                color:#666;
                                font-size:13px;
                              "
                            >
                              ${escapeHtml(
                                row.secondary_label
                              )}
                            </div>

                          `

                          : ""
                      }

                    </div>

                  `
                )
                .join("")
        }

      </div>

    </div>

  `;


  const closeButton =
    document.getElementById(
      "closeAdminIntegrityDetailsButton"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior:
      "smooth",

    block:
      "nearest"
  });

}


// =====================================================
// DIAGNOSTICO DE SEGURANCA DO ADM
// =====================================================

async function loadAdminSecurityCheck() {

  const area =
    document.getElementById(
      "adminSecurityCheckArea"
    );


  const button =
    document.getElementById(
      "runAdminSecurityCheckButton"
    );


  if (!area) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Verificando...";

  }


  area.innerHTML =
    "Verificando permissoes...";


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_security_check"
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Executar diagnostico";

  }


  if (error) {

    console.error(
      "Erro no diagnostico de seguranca:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:8px;
          background:#fdecea;
          color:#8a1f17;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel executar o diagnostico."
        )}
      </div>

    `;


    return;
  }


  const checks =
    data || [];


  const warningCount =
    checks.filter(
      item =>
        item.status ===
          "warning"
    ).length;


  area.innerHTML = `

    <div
      style="
        padding:12px 14px;
        border-radius:9px;
        background:${
          warningCount === 0
            ? "#eef8f0"
            : "#fff3cd"
        };
      "
    >

      <strong>
        ${
          warningCount === 0
            ? "Diagnostico principal: OK"
            : (
                warningCount
                +
                " ponto(s) precisam de revisao"
              )
        }
      </strong>


      <div
        style="
          display:grid;
          gap:8px;
          margin-top:10px;
        "
      >

        ${checks
          .map(
            item => `

              <div
                style="
                  padding:9px 10px;
                  background:#ffffff;
                  border-radius:7px;
                "
              >

                <strong>
                  ${
                    item.status ===
                      "ok"
                      ? "OK"
                      : "ATENCAO"
                  }
                  -
                  ${escapeHtml(
                    item.check_name
                  )}
                </strong>


                <div
                  style="
                    margin-top:3px;
                    color:#666;
                    font-size:13px;
                  "
                >
                  ${escapeHtml(
                    item.detail || ""
                  )}
                </div>

              </div>

            `
          )
          .join("")}

      </div>

    </div>

  `;

}


// =====================================================
// FORMULARIO DE NOVO PROFESSOR
// =====================================================

function openAdminTeacherRegistrationForm() {

  const area =
    document.getElementById(
      "adminTeacherRegistrationArea"
    );


  if (!area) {
    return;
  }


  area.style.display =
    "block";


  area.innerHTML = `

    <h4
      style="
        margin-top:0;
      "
    >
      Cadastrar professor e acesso
    </h4>


    <div
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:12px;
      "
    >

      <div>

        <label
          for="adminNewTeacherName"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Nome
        </label>

        <input
          type="text"
          id="adminNewTeacherName"
          autocomplete="off"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherEmail"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          E-mail
        </label>

        <input
          type="email"
          id="adminNewTeacherEmail"
          autocomplete="off"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherPassword"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Senha inicial
        </label>

        <input
          type="password"
          id="adminNewTeacherPassword"
          minlength="6"
          autocomplete="new-password"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>
        <label for="adminNewTeacherPhone" style="display:block;font-weight:bold;margin-bottom:7px;">
          Telefone
        </label>
        <input type="tel" id="adminNewTeacherPhone" autocomplete="tel" placeholder="(11) 99999-9999" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>


      <div>
        <label for="adminNewTeacherCpf" style="display:block;font-weight:bold;margin-bottom:7px;">
          CPF
        </label>
        <input type="text" id="adminNewTeacherCpf" inputmode="numeric" placeholder="000.000.000-00" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>


      <div>

        <label
          for="adminNewTeacherPasswordConfirm"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Confirmar senha
        </label>

        <input
          type="password"
          id="adminNewTeacherPasswordConfirm"
          minlength="6"
          autocomplete="new-password"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherPix"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          PIX
        </label>

        <input
          type="text"
          id="adminNewTeacherPix"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherCnpj"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          CNPJ
        </label>

        <input
          type="text"
          id="adminNewTeacherCnpj"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherStart"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Inicio das aulas
        </label>

        <input
          type="time"
          id="adminNewTeacherStart"
          step="1800"
          value="08:00"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div>

        <label
          for="adminNewTeacherEnd"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Fim das aulas
        </label>

        <input
          type="time"
          id="adminNewTeacherEnd"
          step="1800"
          value="20:00"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <div class="full-width" style="grid-column:1 / -1;">
        <label style="display:block;font-weight:bold;margin-bottom:7px;">
          Dias em que da aula
        </label>
        ${renderWeekdayCheckboxesV2("adminNewTeacherWorkDay", [1,2,3,4,5])}
      </div>


      <div>
        <label for="adminNewTeacherAccessType" style="display:block;font-weight:bold;margin-bottom:7px;">
          Tipo de acesso
        </label>
        <select id="adminNewTeacherAccessType" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
          <option value="paid">Assinante / pago</option>
          <option value="trial">Teste gratis por 15 dias</option>
          <option value="free">Gratis por tempo ilimitado</option>
        </select>
      </div>

    </div>


    <div
      style="
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:14px;
      "
    >

      <button
        type="button"
        class="action-button"
        id="saveAdminTeacherButton"
      >
        Criar professor
      </button>


      <button
        type="button"
        class="secondary-button"
        id="cancelAdminTeacherButton"
      >
        Cancelar
      </button>

    </div>


    <p
      id="adminTeacherRegistrationMessage"
      style="
        margin-top:10px;
      "
    ></p>

  `;


  const saveButton =
    document.getElementById(
      "saveAdminTeacherButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveAdminTeacherV2
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelAdminTeacherButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        area.style.display =
          "none";

        area.innerHTML =
          "";

      }
    );

  }

}


// =====================================================
// ACESSO COMBINADO: ALUNO E RESPONSAVEL
// =====================================================

async function loadCombinedGuardianAccessV22() {

  if (
    !currentProfile ||
    currentProfile.role !== "student"
  ) {
    return false;
  }

  const { data, error } =
    await supabaseClient.rpc(
      "get_my_guardian_students"
    );

  if (error) {
    console.warn(
      "Nao foi possivel verificar dependentes:",
      error
    );
    return false;
  }

  currentGuardianStudents = data || [];
  return currentGuardianStudents.length > 0;
}


// =====================================================
// CADASTRAR PROFESSOR PELO ADM
// =====================================================

async function saveAdminTeacher() {

  const nameInput =
    document.getElementById(
      "adminNewTeacherName"
    );


  const emailInput =
    document.getElementById(
      "adminNewTeacherEmail"
    );


  const passwordInput =
    document.getElementById(
      "adminNewTeacherPassword"
    );


  const confirmInput =
    document.getElementById(
      "adminNewTeacherPasswordConfirm"
    );


  const pixInput =
    document.getElementById(
      "adminNewTeacherPix"
    );


  const cnpjInput =
    document.getElementById(
      "adminNewTeacherCnpj"
    );


  const startInput =
    document.getElementById(
      "adminNewTeacherStart"
    );


  const endInput =
    document.getElementById(
      "adminNewTeacherEnd"
    );


  const message =
    document.getElementById(
      "adminTeacherRegistrationMessage"
    );


  const button =
    document.getElementById(
      "saveAdminTeacherButton"
    );


  if (
    !nameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmInput ||
    !startInput ||
    !endInput
  ) {
    return;
  }


  const name =
    nameInput.value.trim();


  const email =
    emailInput.value
      .trim()
      .toLowerCase();


  const password =
    passwordInput.value;


  const startTime =
    startInput.value;


  const endTime =
    endInput.value;


  function showError(
    value
  ) {

    if (message) {

      message.textContent =
        value;

      message.style.color =
        "red";

    }

  }


  if (!name) {

    showError(
      "Informe o nome do professor."
    );

    return;
  }


  if (!email) {

    showError(
      "Informe o e-mail do professor."
    );

    return;
  }


  if (
    password.length <
      6
  ) {

    showError(
      "A senha deve ter pelo menos 6 caracteres."
    );

    return;
  }


  if (
    password !==
      confirmInput.value
  ) {

    showError(
      "As senhas nao conferem."
    );

    return;
  }


  if (
    !startTime ||
    !endTime ||
    timeToMinutes(
      startTime
    ) >=
    timeToEndBoundaryMinutes(
      endTime
    )
  ) {

    showError(
      "Informe um horario de atendimento valido. O fim pode ser 00:00 para representar meia-noite."
    );

    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Criando...";

  }


  let authClient;


  try {

    authClient =
      createStudentAccessAuthClient();

  }

  catch (error) {

    showError(
      error.message ||
      "Nao foi possivel iniciar o cadastro."
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar professor";

    }


    return;
  }


  const {
    data: authData,
    error: authError
  } =
    await authClient.auth.signUp({

      email,

      password,

      options: {

        data: {
          name,
          role:
            "teacher"
        }

      }

    });


  const rpcParams = {

    p_name:
      name,

    p_email:
      email,

    p_pix:
      pixInput
        ? pixInput.value.trim() || null
        : null,

    p_cnpj:
      cnpjInput
        ? cnpjInput.value.trim() || null
        : null,

    p_work_start_time:
      startTime,

    p_work_end_time:
      endTime

  };


  if (authError) {

    const existingText =
      String(
        authError.message || ""
      ).toLowerCase();


    const maybeExisting =
      existingText.includes(
        "already"
      );


    if (!maybeExisting) {

      showError(
        authError.message ||
        "Nao foi possivel criar o acesso."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar professor";

      }


      return;
    }


    const {
      error: recoverError
    } =
      await supabaseClient.rpc(
        "recover_teacher_from_auth_email",
        rpcParams
      );


    if (recoverError) {

      showError(
        recoverError.message ||
        "Nao foi possivel recuperar este acesso."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar professor";

      }


      return;
    }

  }

  else {

    const authUser =
      authData
        ? authData.user
        : null;


    if (
      !authUser ||
      !authUser.id
    ) {

      showError(
        "O Supabase nao retornou o usuario criado."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar professor";

      }


      return;
    }


    if (
      Array.isArray(
        authUser.identities
      )
      &&
      authUser.identities.length ===
        0
    ) {

      const {
        error: recoverError
      } =
        await supabaseClient.rpc(
          "recover_teacher_from_auth_email",
          rpcParams
        );


      if (recoverError) {

        showError(
          recoverError.message ||
          "Nao foi possivel vincular o acesso existente."
        );


        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Criar professor";

        }


        return;
      }

    }

    else {

      const {
        error: registerError
      } =
        await supabaseClient.rpc(
          "register_teacher_from_auth",
          {
            p_auth_user_id:
              authUser.id,
            ...rpcParams
          }
        );


      if (registerError) {

        showError(
          registerError.message ||
          "O acesso foi criado, mas o professor nao foi registrado."
        );


        if (button) {

          button.disabled =
            false;

          button.textContent =
            "Criar professor";

        }


        return;
      }

    }

  }


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Criar professor";

  }


  const area =
    document.getElementById(
      "adminTeacherRegistrationArea"
    );


  if (area) {

    area.style.display =
      "none";

    area.innerHTML =
      "";

  }


  await loadAdminTeachers();


  alert(
    "Professor cadastrado com sucesso."
  );

}


async function loadAdminSystemPix() {

  const input =
    document.getElementById(
      "adminSystemPixKey"
    );


  if (!input) {
    return;
  }


  let { data, error } = await supabaseClient.rpc(
    "get_admin_system_billing_settings_v24"
  );

  if (error) {
    const fallback = await supabaseClient.rpc(
      "get_admin_system_billing_settings"
    );
    data = fallback.data;
    error = fallback.error;
  }


  if (error) {

    console.warn(
      "Nao foi possivel carregar o PIX do sistema:",
      error
    );

    return;
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    const fallback = await supabaseClient.rpc("get_admin_system_billing_settings");
    if (!fallback.error) data = fallback.data;
  }


  const settings =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    )
    || {};


  input.value =
    settings.pix_key || "";

  currentAdminSystemPixQrUrlV25 = settings.pix_qr_code_url || "";
  renderAdminSystemPixQrPreviewV24();

}


// =====================================================
// SALVAR PIX GLOBAL DO SISTEMA
// =====================================================

async function saveAdminSystemPix() {

  const input =
    document.getElementById(
      "adminSystemPixKey"
    );


  const message =
    document.getElementById(
      "adminSystemPixMessage"
    );


  const button =
    document.getElementById(
      "saveAdminSystemPixButton"
    );


  if (!input) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  const qrFileInput = document.getElementById("adminSystemPixQrFileV25");
  const qrFile = qrFileInput?.files?.[0] || null;
  let qrUrl = currentAdminSystemPixQrUrlV25 || null;

  if (qrFile) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(qrFile.type) || qrFile.size > 5 * 1024 * 1024) {
      if (button) {
        button.disabled = false;
        button.textContent = "Salvar dados de pagamento";
      }
      if (message) {
        message.textContent = "O QR Code deve ser uma imagem PNG, JPG ou WEBP de até 5 MB.";
        message.style.color = "red";
      }
      return;
    }

    const extension = (qrFile.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${currentUser.id}/system-pix-${Date.now()}.${extension}`;
    const upload = await supabaseClient.storage.from("rules-images").upload(path, qrFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: qrFile.type
    });

    if (upload.error) {
      if (button) {
        button.disabled = false;
        button.textContent = "Salvar dados de pagamento";
      }
      if (message) {
        message.textContent = upload.error.message || "Não foi possível enviar a imagem do QR Code.";
        message.style.color = "red";
      }
      return;
    }

    qrUrl = supabaseClient.storage.from("rules-images").getPublicUrl(path).data?.publicUrl || null;
  }

  const { error } = await supabaseClient.rpc(
    "save_admin_system_billing_settings_v24",
    {
      p_pix_key: input.value.trim() || null,
      p_pix_qr_code_url: qrUrl
    }
  );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar dados de pagamento";

  }


  if (error) {

    if (message) {

      message.textContent =
        error.message ||
        "Não foi possível salvar os dados de pagamento.";

      message.style.color =
        "red";

    }

    return;
  }


  if (message) {

    message.textContent =
      "PIX e QR Code atualizados com sucesso.";

    message.style.color =
      "green";

  }

}


function getAdminTeacherSystemMonthParts() {

  const input =
    document.getElementById(
      "adminTeacherSystemMonth"
    );


  const value =
    input &&
    input.value
      ? input.value
      : "";


  if (
    /^\d{4}-\d{2}$/.test(
      value
    )
  ) {

    const [
      year,
      month
    ] =
      value
        .split("-")
        .map(Number);


    return {
      year,
      month
    };

  }


  const now =
    new Date();


  return {
    year:
      now.getFullYear(),

    month:
      now.getMonth() + 1
  };

}


// =====================================================
// LISTAR PROFESSORES NO ADM
// =====================================================

async function loadAdminTeachers() {

  const container =
    document.getElementById(
      "adminTeacherList"
    );


  if (!container) {
    return;
  }


  const {
    year,
    month
  } =
    getAdminTeacherSystemMonthParts();


  const [
    teachersResult,
    systemFinancialResult,
    capacityResult,
    accessResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_admin_teachers"
      ),

      supabaseClient.rpc(
        "get_admin_teacher_system_financial",
        {
          p_year:
            year,

          p_month:
            month
        }
      ),

      supabaseClient.rpc(
        "get_admin_teacher_student_capacity_v3"
      ),

      supabaseClient.rpc(
        "get_admin_teacher_access_v2"
      )

    ]);


  if (
    teachersResult.error ||
    systemFinancialResult.error ||
    capacityResult.error ||
    accessResult.error
  ) {

    console.error(
      "Erro ao carregar professores:",
      teachersResult.error ||
      systemFinancialResult.error ||
      capacityResult.error ||
      accessResult.error
    );


    container.innerHTML = `

      <p>
        ${escapeHtml(
          (
            teachersResult.error ||
            systemFinancialResult.error ||
            capacityResult.error ||
            accessResult.error
          ).message ||
          "Nao foi possivel carregar os professores."
        )}
      </p>

    `;


    return;
  }


  currentAdminTeacherSystemFinancial =
    systemFinancialResult.data || [];


  const teacherStudentCapacity =
    capacityResult.data || [];

  const teacherAccessData =
    accessResult.data || [];


  currentAdminTeachers =
    (teachersResult.data || [])
      .map(
        teacher => {

          const billing =
            currentAdminTeacherSystemFinancial.find(
              item =>
                String(
                  item.teacher_id
                ) ===
                String(
                  teacher.teacher_id
                )
            )
            || {};


          const capacity =
            teacherStudentCapacity.find(
              item =>
                String(
                  item.teacher_id
                ) ===
                String(
                  teacher.teacher_id
                )
            )
            || {};

          const access =
            teacherAccessData.find(
              item =>
                String(item.teacher_id) ===
                String(teacher.teacher_id)
            ) || {};


          return {
            ...teacher,
            ...billing,
            ...capacity,
            ...access,
            system_billing_year:
              year,
            system_billing_month:
              month
          };

        }
      );


  const announcementsPanel =
    document.querySelector(
      '[data-admin-panel-v8="announcements"]'
    );

  if (announcementsPanel) {
    renderAdminAnnouncementsV18(
      announcementsPanel
    );
  }


  renderAdminTeacherSystemReceivedSummary(
    year,
    month
  );

  const summaryPanel = document.querySelector('[data-admin-panel-v8="summary"]');
  if (summaryPanel) renderAdminSummaryV24(summaryPanel);


  if (
    currentAdminTeachers.length ===
      0
  ) {

    container.innerHTML = `

      <div
        style="
          padding:15px;
          border-radius:9px;
          background:#fffaf3;
        "
      >
        Nenhum professor cadastrado.
      </div>

    `;


    return;
  }


  renderAdminTeacherListV2();

}


function renderAdminTeacherListV2() {

  const container =
    document.getElementById(
      "adminTeacherList"
    );

  if (!container) {
    return;
  }

  const filtered =
    currentAdminTeachers.filter(
      teacher =>
        currentAdminTeacherFilter === "all" ||
        String(
          teacher.access_category ||
          teacher.access_type ||
          "paid"
        ) === currentAdminTeacherFilter
    );

  container.innerHTML =
    filtered.length === 0
      ? `
        <div style="padding:15px;border-radius:9px;background:#fffaf3;">
          Nenhum professor nesta categoria.
        </div>
      `
      : `
        <div style="display:grid;gap:12px;">
          ${filtered.map(renderAdminTeacherCard).join("")}
        </div>
      `;

  bindAdminTeacherCardEventsV2();
}


function bindAdminTeacherCardEventsV2() {

  document
    .querySelectorAll(
      ".admin-teacher-status-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => changeAdminTeacherStatus(
          button.dataset.teacherId,
          button.dataset.status,
          button.dataset.teacherName
        )
      );
    });

  document
    .querySelectorAll(
      ".save-admin-teacher-system-billing-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => saveAdminTeacherSystemBilling(
          button.dataset.teacherId
        )
      );
    });

  document
    .querySelectorAll(
      ".save-admin-teacher-student-limit-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => saveAdminTeacherStudentLimit(
          button.dataset.teacherId
        )
      );
    });

  document
    .querySelectorAll(
      ".save-admin-teacher-access-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => saveAdminTeacherAccessV2(
          button.dataset.teacherId
        )
      );
    });

  document
    .querySelectorAll(
      ".edit-admin-teacher-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => openAdminTeacherEditV2(
          button.dataset.teacherId
        )
      );
    });

  document
    .querySelectorAll(
      ".reset-admin-teacher-password-button"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => sendAdminTeacherPasswordResetV2(
          button.dataset.teacherEmail
        )
      );
    });

  document.querySelectorAll(".open-admin-teacher-students-v24").forEach(button => {
    button.addEventListener("click", () => loadAdminTeacherStudentsV24(button.dataset.teacherId));
  });
}


async function loadAdminTeacherStudentsV24(teacherId) {
  const area = document.getElementById(`adminTeacherStudentsV24-${teacherId}`);
  if (!area) return;
  area.innerHTML = `<p>Carregando alunos...</p>`;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_teacher_students_v24",
    { p_teacher_id: teacherId }
  );
  if (error) {
    area.innerHTML = `<p class="admin-summary-message-v24">${escapeHtml(error.message || "Não foi possível carregar os alunos.")}</p>`;
    return;
  }

  const students = data || [];
  adminTeacherStudentsV24.set(String(teacherId), students);
  area.innerHTML = students.length ? students.map(student => `
    <article>
      <div><strong>${escapeHtml(student.student_name)}</strong><span>${escapeHtml(student.student_email)}</span><small>${student.active === false ? "Inativo" : (student.classes_paused ? "Aulas pausadas" : "Ativo")}</small></div>
      <div>
        <button type="button" class="secondary-button admin-reset-student-v24" data-student-email="${escapeHtml(student.student_email)}">Redefinir senha</button>
        <button type="button" class="secondary-button admin-edit-student-v26" data-student-id="${student.student_id}">Editar aluno</button>
        <button type="button" class="secondary-button admin-toggle-student-v25" data-teacher-id="${teacherId}" data-student-id="${student.student_id}" data-student-name="${escapeHtml(student.student_name)}" data-active="${student.active === false ? "false" : "true"}">${student.active === false ? "Reativar aluno" : "Desativar aluno"}</button>
        <button type="button" class="secondary-button admin-delete-student-v24" data-teacher-id="${teacherId}" data-student-id="${student.student_id}" data-student-name="${escapeHtml(student.student_name)}">Excluir definitivamente</button>
      </div>
    </article>
  `).join("") : `<p>Nenhum aluno vinculado a este professor.</p>`;

  area.querySelectorAll(".admin-reset-student-v24").forEach(button => {
    button.addEventListener("click", () => sendPasswordResetV24(button.dataset.studentEmail));
  });
  area.querySelectorAll(".admin-edit-student-v26").forEach(button => {
    button.addEventListener("click", () => editAdminStudentV26(teacherId, button.dataset.studentId));
  });
  area.querySelectorAll(".admin-toggle-student-v25").forEach(button => {
    button.addEventListener("click", () => setAdminTeacherStudentActiveV25(
      button.dataset.teacherId,
      button.dataset.studentId,
      button.dataset.studentName,
      button.dataset.active !== "true"
    ));
  });
  area.querySelectorAll(".admin-delete-student-v24").forEach(button => {
    button.addEventListener("click", () => deleteAdminTeacherStudentV24(
      button.dataset.teacherId,
      button.dataset.studentId,
      button.dataset.studentName
    ));
  });
}


async function editAdminStudentV26(teacherId, studentId) {
  const { data, error } = await supabaseClient.rpc("admin_get_student_personal_v26", { p_student_id: studentId });
  if (error || !data) return alert(error?.message || "Não foi possível carregar o aluno.");
  const dialog = document.createElement("dialog");
  dialog.className = "student-edit-dialog-v26";
  dialog.innerHTML = `<form><h3>Editar aluno</h3>
    <label>Nome completo<input name="name" required minlength="3" maxlength="200" value="${escapeHtml(data.name || "")}"></label>
    <label>Nome social / apelido (opcional)<input name="preferred_name" maxlength="120" value="${escapeHtml(data.preferred_name || "")}"></label>
    <label>E-mail de acesso<input name="email" type="email" required value="${escapeHtml(data.email || "")}"></label>
    <label>Telefone<input name="phone" required value="${escapeHtml(data.phone || "")}"></label>
    <label>CPF<input name="cpf" required value="${escapeHtml(data.cpf || "")}"></label>
    <p role="status"></p><button type="submit" class="primary-button">Salvar</button>
    <button type="button" class="secondary-button" data-close>Cancelar</button></form>`;
  document.body.appendChild(dialog);
  dialog.addEventListener("close", () => dialog.remove());
  dialog.querySelector("[data-close]").onclick = () => dialog.close();
  dialog.querySelector("form").onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const button = form.querySelector('[type="submit"]');
    const message = form.querySelector('[role="status"]');
    button.disabled = true;
    try {
      const email = String(values.get("email")).trim().toLowerCase();
      if (email !== String(data.email).toLowerCase()) {
        const changed = await updateUserEmailV2(data.profile_id, email);
        if (changed.error) throw new Error(changed.error);
      }
      const saved = await supabaseClient.rpc("admin_save_student_personal_v26", {
        p_student_id: studentId, p_name: values.get("name"), p_phone: values.get("phone"),
        p_cpf: values.get("cpf"), p_preferred_name: values.get("preferred_name") || null
      });
      if (saved.error) throw saved.error;
      dialog.close();
      await loadAdminTeacherStudentsV24(teacherId);
    } catch (error) { message.textContent = error.message || "Não foi possível salvar."; }
    finally { button.disabled = false; }
  };
  dialog.showModal();
}

async function setAdminTeacherStudentActiveV25(teacherId, studentId, studentName, nextActive) {
  const action = nextActive ? "reativar" : "desativar";
  const warning = nextActive
    ? `Reativar o acesso de ${studentName}?`
    : `Desativar ${studentName}?\n\nO histórico será preservado, mas o aluno não poderá usar normalmente o portal até ser reativado.`;
  if (!window.confirm(warning)) return;

  const { error } = await supabaseClient.rpc("admin_set_student_active_v25", {
    p_student_id: studentId,
    p_active: nextActive
  });
  if (error) {
    alert(error.message || `Não foi possível ${action} o aluno.`);
    return;
  }
  await Promise.all([loadAdminTeacherStudentsV24(teacherId), loadAdminTeachers()]);
}


async function sendPasswordResetV24(email) {
  if (!email || !window.confirm(`Enviar um e-mail de redefinição de senha para ${email}?`)) return;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    email,
    { redirectTo: getAppBaseUrlV4() }
  );
  alert(error ? (error.message || "Não foi possível enviar a redefinição.") : "E-mail de redefinição enviado.");
}


async function deleteAdminTeacherStudentV24(teacherId, studentId, studentName) {
  const confirmed = window.confirm(
    `Excluir definitivamente o cadastro de ${studentName}?\n\nTodo o histórico deste vínculo será apagado, incluindo aulas, reposições, financeiro, materiais e observações. Esta ação não pode ser desfeita.`
  );
  if (!confirmed) return;

  const { data, error } = await supabaseClient.functions.invoke("provision-users", {
    body: { kind: "admin_delete_student", student_id: studentId }
  });
  if (error || data?.error) {
    alert(data?.error || error?.message || "Não foi possível excluir o aluno.");
    return;
  }
  alert("Cadastro e histórico excluídos.");
  await Promise.all([loadAdminTeacherStudentsV24(teacherId), loadAdminTeachers()]);
}


// =====================================================
// ADM - SALVAR LIMITE DE ALUNOS
// =====================================================

async function saveAdminTeacherStudentLimit(
  teacherId
) {

  const input =
    document.querySelector(
      '.admin-teacher-student-limit[data-teacher-id="' +
      teacherId +
      '"]'
    );


  const button =
    document.querySelector(
      '.save-admin-teacher-student-limit-button[data-teacher-id="' +
      teacherId +
      '"]'
    );


  if (!input) {
    return;
  }


  const rawValue =
    input.value.trim();


  const limit =
    rawValue === ""
      ? null
      : Number(
          rawValue
        );


  if (
    limit !== null

    &&
    (
      !Number.isInteger(
        limit
      )
      ||
      limit < 1
      ||
      limit > 1000
    )
  ) {

    alert(
      "Informe um numero inteiro entre 1 e 1000, ou deixe vazio para sem limite."
    );

    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_admin_teacher_student_limit_v2",
      {
        p_teacher_id:
          teacherId,

        p_max_registered_students:
          limit
      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar limite";

  }


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel salvar o limite de alunos."
    );

    return;
  }


  await loadAdminTeachers();

}


// =====================================================
// TOTAL RECEBIDO DOS PROFESSORES NO MES
// =====================================================

function renderAdminTeacherSystemReceivedSummary(
  year,
  month
) {

  const area =
    document.getElementById(
      "adminTeacherSystemReceivedSummary"
    );


  if (!area) {
    return;
  }


  const paidRecords =
    currentAdminTeacherSystemFinancial.filter(
      item =>
        item.payment_status ===
          "paid"
    );


  const totalReceived =
    paidRecords.reduce(
      (
        total,
        item
      ) =>
        total
        +
        Number(
          item.amount || 0
        ),
      0
    );


  area.innerHTML = `

    <div
      style="
        padding:15px;
        border-radius:10px;
        background:#eef8f0;
        border:1px solid #d6ead9;
      "
    >

      <div
        style="
          color:#555;
          font-size:13px;
        "
      >
        Total recebido dos professores em
        ${formatMonth(
          Number(
            month
          )
        )}/${Number(
          year
        )}
      </div>


      <strong
        style="
          display:block;
          margin-top:4px;
          font-size:26px;
        "
      >
        ${formatCurrency(
          totalReceived
        )}
      </strong>


      <div
        style="
          margin-top:3px;
          color:#666;
          font-size:12px;
        "
      >
        ${paidRecords.length}
        pagamento(s) marcado(s) como pago.
      </div>

    </div>

  `;

}


// =====================================================
// CARD DO PROFESSOR NO ADM
// =====================================================

function renderAdminTeacherCard(
  teacher
) {

  const status =
    String(
      teacher.account_status ||
      "active"
    );


  const statusLabel =
    status ===
      "active"

      ? "Ativo"

      : (
          status ===
            "paused"
            ? "Pausado"
            : "Excluido"
        );


  return `
    <details class="admin-teacher-details-v24">
      <summary>
        <span><strong>${escapeHtml(teacher.teacher_name)}</strong><small>${escapeHtml(teacher.teacher_email)}</small></span>
        <span class="admin-teacher-summary-plan-v24">${escapeHtml(getTeacherPlanLabelV24(teacher.subscription_plan, teacher.access_type))}</span>
        <span class="admin-teacher-summary-status-v24 status-${escapeHtml(status)}">${statusLabel}</span>
      </summary>
      <div class="admin-teacher-details-body-v24">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
          flex-wrap:wrap;
        "
      >

        <div>

          <strong
            style="
              font-size:18px;
            "
          >
            ${escapeHtml(
              teacher.teacher_name
            )}
          </strong>


          <div
            style="
              margin-top:4px;
              color:#666;
            "
          >
            ${escapeHtml(
              teacher.teacher_email
            )}
          </div>

        </div>


        <strong>
          ${statusLabel}
        </strong>

      </div>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
          gap:8px;
          margin-top:13px;
        "
      >

        <div>
          <strong>Plano:</strong>
          ${escapeHtml(getTeacherPlanLabelV24(teacher.subscription_plan, teacher.access_type))}
        </div>

        <div>
          <strong>Alunos cadastrados:</strong>

          ${Number(
            teacher.registered_student_count ??
            teacher.total_student_count ??
            teacher.student_count ??
            0
          )}

          /

          ${
            teacher.max_registered_students == null

              ? "sem limite"

              : Number(
                  teacher.max_registered_students
                )
          }
        </div>


        <div>
          <strong>Total historico:</strong>

          ${Number(
            teacher.total_student_count ??
            teacher.student_count ??
            0
          )}
        </div>


        <div>
          <strong>Agenda:</strong>
          ${normalizeTime(
            teacher.work_start_time
          )}
          as
          ${normalizeTime(
            teacher.work_end_time
          )}
        </div>


        ${
          teacher.pix

            ? `

              <div>
                <strong>PIX:</strong>
                ${escapeHtml(
                  teacher.pix
                )}
              </div>

            `

            : ""
        }


        ${
          teacher.cnpj

            ? `

              <div>
                <strong>CNPJ:</strong>
                ${escapeHtml(
                  teacher.cnpj
                )}
              </div>

            `

            : ""
        }

      </div>


      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:9px;
          background:#fff8df;
          border:1px solid #f0cf82;
        "
      >
        <strong>Tipo de acesso</strong>

        <div style="display:flex;gap:10px;align-items:end;flex-wrap:wrap;margin-top:10px;">
          <select
            class="admin-teacher-access-type"
            data-teacher-id="${teacher.teacher_id}"
            style="padding:9px;border:1px solid #ccc;border-radius:8px;"
          >
            ${["trial","free","starter","plus","pro","premium","vip"].map(plan => `<option value="${plan}" ${plan === (teacher.access_type === "free" ? "free" : teacher.access_type === "trial" ? "trial" : teacher.subscription_plan === "custom" ? "vip" : teacher.subscription_plan) ? "selected" : ""}>${getTeacherPlanLabelV24(plan)}</option>`).join("")}
          </select>

          <button type="button" class="secondary-button save-admin-teacher-access-button" data-teacher-id="${teacher.teacher_id}">
            Salvar acesso
          </button>

          <button type="button" class="secondary-button edit-admin-teacher-button" data-teacher-id="${teacher.teacher_id}">
            Editar cadastro
          </button>

          <button type="button" class="secondary-button reset-admin-teacher-password-button" data-teacher-email="${escapeHtml(teacher.teacher_email)}">
            Enviar redefinicao de senha
          </button>
        </div>

        ${
          teacher.access_type === "trial"
            ? `<div style="margin-top:8px;font-size:13px;">Tempo restante: ${formatRemainingTimeV2(teacher.remaining_seconds)}</div>`
            : ""
        }

        <div id="adminTeacherEditArea-${teacher.teacher_id}" style="display:none;margin-top:14px;"></div>
      </div>


      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:9px;
          background:#f7e9e1;
          border:1px solid #e7dfd5;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <div>

            <strong>
              Limite de alunos
            </strong>


            <div
              style="
                margin-top:3px;
                color:#666;
                font-size:12px;
              "
            >
              O limite considera todos os alunos cadastrados,
              inclusive pausados, desativados e excluidos logicamente.
            </div>

          </div>


          <strong>
            ${Number(
              teacher.registered_student_count ??
              teacher.total_student_count ??
              teacher.student_count ??
              0
            )}
            cadastrado(s)
          </strong>

        </div>


        <div
          style="
            display:flex;
            gap:8px;
            align-items:end;
            flex-wrap:wrap;
            margin-top:11px;
          "
        >

          <div
            style="
              flex:1;
              min-width:180px;
            "
          >

            <label
              style="
                display:block;
                font-size:12px;
                font-weight:bold;
                margin-bottom:5px;
              "
            >
              Maximo de alunos cadastrados
            </label>


            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              class="admin-teacher-student-limit"
              data-teacher-id="${teacher.teacher_id}"
              value="${
                teacher.max_registered_students == null
                  ? ""
                  : Number(
                      teacher.max_registered_students
                    )
              }"
              placeholder="Sem limite"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #ccc;
                border-radius:7px;
              "
            >

          </div>


          <button
            type="button"
            class="secondary-button save-admin-teacher-student-limit-button"
            data-teacher-id="${teacher.teacher_id}"
          >
            Salvar limite
          </button>

        </div>


        <div
          style="
            margin-top:7px;
            color:#666;
            font-size:12px;
          "
        >
          Deixe vazio para sem limite.
          O total inclui cadastros pausados, desativados e excluidos logicamente.
        </div>

      </div>


      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:9px;
          background:#fffaf3;
          border:1px solid #e7dfd5;
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:flex-start;
            gap:10px;
            flex-wrap:wrap;
          "
        >

          <div>

            <strong>
              Mensalidade do sistema
            </strong>


            <div
              style="
                margin-top:3px;
                color:#666;
                font-size:12px;
              "
            >
              ${formatMonth(
                Number(
                  teacher.system_billing_month
                )
              )}/${Number(
                teacher.system_billing_year
              )}
            </div>

          </div>


          <strong
            style="
              padding:5px 9px;
              border-radius:999px;
              background:${
                teacher.display_status ===
                  "paid"

                  ? "#eef8f0"

                  : (
                      teacher.display_status ===
                        "overdue"

                        ? "#fdecea"

                        : "#fff3cd"
                    )
              };
            "
          >
            ${
              teacher.display_status ===
                "paid"

                ? "Pago"

                : (
                    teacher.display_status ===
                      "overdue"

                      ? "Atrasado"

                      : (
                          teacher.display_status ===
                            "not_configured"

                            ? "Nao configurado"

                            : "Pendente"
                        )
                  )
            }
          </strong>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
            gap:10px;
            margin-top:12px;
          "
        >

          <div>

            <label
              style="
                display:block;
                font-size:12px;
                font-weight:bold;
                margin-bottom:5px;
              "
            >
              Valor mensal
            </label>


            <input
              type="number"
              min="0"
              step="0.01"
              class="admin-teacher-system-fee"
              data-teacher-id="${teacher.teacher_id}"
              value="${
                teacher.system_monthly_fee != null
                  ? Number(
                      teacher.system_monthly_fee
                    ).toFixed(2)
                  : ""
              }"
              placeholder="0.00"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #ccc;
                border-radius:7px;
              "
            >

          </div>


          <div>

            <label
              style="
                display:block;
                font-size:12px;
                font-weight:bold;
                margin-bottom:5px;
              "
            >
              Dia do vencimento
            </label>


            <input
              type="number"
              min="1"
              max="31"
              step="1"
              class="admin-teacher-system-due-day"
              data-teacher-id="${teacher.teacher_id}"
              value="${Number(
                teacher.system_payment_due_day || 10
              )}"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #ccc;
                border-radius:7px;
              "
            >

          </div>


          <div
            style="
              display:flex;
              align-items:end;
            "
          >

            <label
              style="
                display:flex;
                align-items:center;
                gap:8px;
                min-height:39px;
                cursor:pointer;
              "
            >

              <input
                type="checkbox"
                class="admin-teacher-system-paid"
                data-teacher-id="${teacher.teacher_id}"
                ${
                  teacher.payment_status ===
                    "paid"
                    ? "checked"
                    : ""
                }
              >

              Pago neste mes

            </label>

          </div>


          <div
            style="
              display:flex;
              align-items:end;
            "
          >

            <label
              style="
                display:flex;
                align-items:center;
                gap:8px;
                min-height:39px;
                cursor:pointer;
              "
            >

              <input
                type="checkbox"
                class="admin-teacher-system-invoice"
                data-teacher-id="${teacher.teacher_id}"
                ${
                  teacher.invoice_required ===
                    true
                  ||
                  (
                    teacher.invoice_required == null
                    &&
                    teacher.system_invoice_required ===
                      true
                  )
                    ? "checked"
                    : ""
                }
              >

              Precisa de nota fiscal

            </label>

          </div>

        </div>


        ${
          teacher.amount != null

            ? `

              <div
                style="
                  margin-top:10px;
                  color:#555;
                  font-size:13px;
                "
              >
                Lancamento do mes:
                <strong>
                  ${formatCurrency(
                    teacher.amount
                  )}
                </strong>

                ${
                  teacher.due_date

                    ? `

                      -
                      vencimento
                      ${formatDate(
                        new Date(
                          String(
                            teacher.due_date
                          )
                          +
                          "T12:00:00"
                        )
                      )}

                    `

                    : ""
                }
              </div>

            `

            : ""
        }


        <button
          type="button"
          class="secondary-button save-admin-teacher-system-billing-button"
          data-teacher-id="${teacher.teacher_id}"
          style="
            margin-top:11px;
          "
        >
          Salvar mensalidade
        </button>

      </div>

      <div class="admin-teacher-students-block-v24">
        <div><strong>Alunos deste professor</strong><p>Consulte os cadastros, envie redefinição de senha ou exclua definitivamente um vínculo.</p></div>
        <button type="button" class="secondary-button open-admin-teacher-students-v24" data-teacher-id="${teacher.teacher_id}">Mostrar alunos</button>
        <div class="admin-teacher-students-list-v24" id="adminTeacherStudentsV24-${teacher.teacher_id}"></div>
      </div>


      ${
        status !==
          "deleted"

          ? `

            <div
              style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
                margin-top:14px;
              "
            >

              ${
                status ===
                  "active"

                  ? `

                    <button
                      type="button"
                      class="secondary-button admin-teacher-status-button"
                      data-teacher-id="${teacher.teacher_id}"
                      data-teacher-name="${escapeHtml(
                        teacher.teacher_name
                      )}"
                      data-status="paused"
                    >
                      Pausar professor
                    </button>

                  `

                  : `

                    <button
                      type="button"
                      class="action-button admin-teacher-status-button"
                      data-teacher-id="${teacher.teacher_id}"
                      data-teacher-name="${escapeHtml(
                        teacher.teacher_name
                      )}"
                      data-status="active"
                    >
                      Reativar professor
                    </button>

                  `
              }


              <button
                type="button"
                class="secondary-button admin-teacher-status-button"
                data-teacher-id="${teacher.teacher_id}"
                data-teacher-name="${escapeHtml(
                  teacher.teacher_name
                )}"
                data-status="deleted"
                style="
                  border-color:#c0392b;
                  color:#c0392b;
                "
              >
                Excluir professor
              </button>

            </div>

          `

          : ""
      }

      </div>
    </details>

  `;

}


// =====================================================
// SALVAR MENSALIDADE DO PROFESSOR
// =====================================================

async function saveAdminTeacherSystemBilling(
  teacherId
) {

  const feeInput =
    document.querySelector(
      '.admin-teacher-system-fee[data-teacher-id="' +
      teacherId +
      '"]'
    );


  const dueDayInput =
    document.querySelector(
      '.admin-teacher-system-due-day[data-teacher-id="' +
      teacherId +
      '"]'
    );


  const paidInput =
    document.querySelector(
      '.admin-teacher-system-paid[data-teacher-id="' +
      teacherId +
      '"]'
    );


  const invoiceInput =
    document.querySelector(
      '.admin-teacher-system-invoice[data-teacher-id="' +
      teacherId +
      '"]'
    );


  const button =
    document.querySelector(
      '.save-admin-teacher-system-billing-button[data-teacher-id="' +
      teacherId +
      '"]'
    );


  if (
    !feeInput ||
    !dueDayInput
  ) {
    return;
  }


  const fee =
    Number(
      feeInput.value
    );


  const dueDay =
    Number(
      dueDayInput.value
    );


  if (
    feeInput.value ===
      ""
    ||
    !Number.isFinite(
      fee
    )
    ||
    fee < 0
  ) {

    alert(
      "Informe um valor mensal valido."
    );

    return;
  }


  if (
    !Number.isInteger(
      dueDay
    )
    ||
    dueDay < 1
    ||
    dueDay > 31
  ) {

    alert(
      "O dia do vencimento deve estar entre 1 e 31."
    );

    return;
  }


  const {
    year,
    month
  } =
    getAdminTeacherSystemMonthParts();


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_admin_teacher_system_billing",
      {

        p_teacher_id:
          teacherId,

        p_monthly_fee:
          fee,

        p_due_day:
          dueDay,

        p_year:
          year,

        p_month:
          month,

        p_paid:
          Boolean(
            paidInput &&
            paidInput.checked
          ),

        p_invoice_required:
          Boolean(
            invoiceInput &&
            invoiceInput.checked
          )

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar mensalidade";

  }


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel salvar a mensalidade do professor."
    );


    return;
  }


  await loadAdminTeachers();

}


// =====================================================
// ALTERAR STATUS DO PROFESSOR
// =====================================================

async function changeAdminTeacherStatus(
  teacherId,
  newStatus,
  teacherName
) {

  let question =
    "";


  if (
    newStatus ===
      "paused"
  ) {

    question =
      "Pausar o professor \"" +
      String(
        teacherName || ""
      )
      +
      "\"? O login ficara bloqueado ate a reativacao.";

  }

  else if (
    newStatus ===
      "active"
  ) {

    question =
      "Reativar o professor \"" +
      String(
        teacherName || ""
      )
      +
      "\"?";

  }

  else {

    question =
      "Excluir o professor \"" +
      String(
        teacherName || ""
      )
      +
      "\"?\n\n"
      +
      "O login sera bloqueado definitivamente, mas o historico de alunos, aulas e financeiro sera preservado.";

  }


  if (
    !window.confirm(
      question
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "set_admin_teacher_status",
      {
        p_teacher_id:
          teacherId,

        p_status:
          newStatus
      }
    );


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel alterar o professor."
    );


    return;
  }


  await loadAdminTeachers();

}


// =====================================================
// NAVEGACAO DO ALUNO
// =====================================================


function setStudentPage(page) {

  if (
    currentStudentAccessMode === "makeups_only" &&
    page !== "agenda" &&
    page !== "makeups"
  ) {
    page = "makeups";
  }

  const content =
    document.getElementById(
      "studentContent"
    );

  if (!content) {
    return;
  }

  document
    .querySelectorAll(
      "[data-student-page]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.studentPage === page
      );

    });


  // ===================================================
  // AGENDA
  // ===================================================

  if (page === "agenda") {

    content.innerHTML = `

      ${
        currentStudentAccessMode === "makeups_only"
          ? `
            <div class="restricted-access-note">
              Seu cadastro esta pausado ou desativado. Esta tela serve
              somente para escolher horarios de reposicao disponiveis.
            </div>
          `
          : ""
      }

      <div
        id="studentClassLinkArea"
        style="
          margin-bottom:16px;
        "
      ></div>


      <div
        id="studentNoticesArea"
        style="margin-bottom:20px;"
      ></div>

      <div class="card">

        <h3>Agenda semanal</h3>

        <p>
          Clique em um hor\u00E1rio livre para
          escolher uma reposi\u00E7\u00E3o.
        </p>

        <div
          style="
            display:flex;
            justify-content:center;
            gap:10px;
            flex-wrap:wrap;
            margin:20px 0;
          "
        >

          <button
            type="button"
            class="secondary-button"
            id="previousWeekButton"
          >
            \u2190 Semana anterior
          </button>

          <button
            type="button"
            class="secondary-button"
            id="currentWeekButton"
          >
            Semana atual
          </button>

          <button
            type="button"
            class="secondary-button"
            id="nextWeekButton"
          >
            Pr\u00F3xima semana \u2192
          </button>

        </div>

        <div
          id="selectedWeekLabel"
          style="
            text-align:center;
            font-weight:bold;
            margin-bottom:14px;
          "
        ></div>


        <div
          id="studentHolidayArea"
          style="
            margin-bottom:16px;
          "
        ></div>

        <div class="schedule-wrapper">

          <table class="schedule-table">

            <thead id="studentScheduleHead"></thead>

            <tbody id="studentScheduleBody">

              <tr>
                <td colspan="8">
                  Carregando agenda...
                </td>
              </tr>

            </tbody>

          </table>

        </div>

        <div
          id="makeupSelectionArea"
          style="margin-top:20px;"
        ></div>

        <div class="schedule-legend student-legend-v26">
          <span data-agenda-color="available">Livre</span><span data-agenda-color="occupied">Ocupado</span>
          <span data-agenda-color="unavailable">Indisponível</span><span data-agenda-color="own">Minha aula</span>
          <span data-agenda-color="paused-own">Aulas pausadas</span><span data-agenda-color="own-makeup">Minha reposição</span>
          <span data-agenda-color="cancelled">Aula cancelada</span><span data-agenda-color="expired">Prazo encerrado</span>
        </div>

      </div>

    `;


    const previousWeekButton =
      document.getElementById(
        "previousWeekButton"
      );

    const currentWeekButton =
      document.getElementById(
        "currentWeekButton"
      );

    const nextWeekButton =
      document.getElementById(
        "nextWeekButton"
      );


    if (previousWeekButton) {

      previousWeekButton.onclick =
        async () => {

          selectedWeekStart =
            addDays(
              selectedWeekStart,
              -7
            );

          await loadStudentWeeklySchedule();

        };

    }


    if (currentWeekButton) {

      currentWeekButton.onclick =
        async () => {

          selectedWeekStart =
            getMonday(
              new Date()
            );

          await loadStudentWeeklySchedule();

        };

    }


    if (nextWeekButton) {

      nextWeekButton.onclick =
        async () => {

          selectedWeekStart =
            addDays(
              selectedWeekStart,
              7
            );

          await loadStudentWeeklySchedule();

        };

    }


    if (
      currentStudentAccessMode !== "makeups_only"
    ) {

      loadStudentClassLink()
        .catch(error => {

          console.error(
            "Erro ao carregar link da aula:",
            error
          );

        });


      loadStudentNotices()
        .catch(error => {

          console.error(
            "Erro ao carregar avisos:",
            error
          );

        });

    }


    loadStudentWeeklySchedule()
      .catch(error => {

        console.error(
          "Erro ao carregar agenda:",
          error
        );

      });


    return;
  }


  // ===================================================
  // MATERIAIS
  // ===================================================

  if (page === "materials") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Materiais
        </h3>


        <p>
          Links e materiais disponibilizados pelo seu professor.
        </p>


        <div
          id="studentMaterialsContent"
          style="
            margin-top:18px;
          "
        >
          Carregando materiais...
        </div>

      </div>

    `;


    loadStudentMaterials();

    return;
  }


  // ===================================================
  // HIST\u00D3RICO
  // ===================================================

  if (page === "history") {

    content.innerHTML = `

      <div class="card">

        <h3>Hist\u00F3rico de aulas</h3>

        <p>
          Aqui voc\u00EA pode acompanhar suas aulas,
          conte\u00FAdos, presen\u00E7a e observa\u00E7\u00F5es.
        </p>

        <div
          id="studentHistoryContent"
          style="margin-top:20px;"
        >
          Carregando hist\u00F3rico...
        </div>

      </div>

    `;


    loadStudentHistory()
      .catch(error => {

        console.error(
          "Erro ao carregar hist\u00F3rico:",
          error
        );

        const container =
          document.getElementById(
            "studentHistoryContent"
          );

        if (container) {

          container.innerHTML = `
            <p>
              N\u00E3o foi poss\u00EDvel carregar seu hist\u00F3rico.
            </p>
          `;

        }

      });


    return;
  }


  // ===================================================
  // REPOSI\u00C7\u00D5ES
  // ===================================================

  if (page === "makeups") {

    content.innerHTML = `

      <div class="card">

        <h3>Minhas reposi\u00E7\u00F5es</h3>

        <p>
          Consulte suas reposi\u00E7\u00F5es,
          dura\u00E7\u00E3o, validade e situa\u00E7\u00E3o.
        </p>

        <div
          id="makeupsContent"
          style="margin-top:20px;"
        >
          Carregando...
        </div>

      </div>

    `;


    loadStudentMakeups();

    return;
  }


  // ===================================================
  // MENSALIDADE
  // ===================================================

  if (page === "financial") {

    content.innerHTML = `

      <div class="card">

        <h3>Minha mensalidade</h3>

        <p>
          Consulte suas mensalidades e
          hist\u00F3rico de pagamentos.
        </p>

        <div
          id="studentFinancialContent"
          style="margin-top:20px;"
        >
          Carregando mensalidades...
        </div>

      </div>

    `;


    loadStudentFinancialHistory();

    return;
  }


  // ===================================================
  // REGRAS
  // ===================================================

  if (page === "rules") {

    content.innerHTML = `

      <div class="card">

        <h3>Regras</h3>

        <p>
          Confira abaixo as regras definidas
          pelo seu professor.
        </p>

        <div
          id="studentRulesContent"
          style="
            margin-top:20px;
            white-space:pre-wrap;
            line-height:1.6;
          "
        >
          Carregando regras...
        </div>

      </div>

    `;


    loadStudentRules();

    return;
  }

}


// =====================================================
// LINK DA AULA NO TOPO DA AGENDA DO ALUNO
// =====================================================

async function loadStudentClassLink() {

  const area =
    document.getElementById(
      "studentClassLinkArea"
    );


  if (!area) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_class_link"
    );


  if (error) {

    area.innerHTML =
      "";

    throw error;
  }


  const item =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    )
    || {};


  if (!item.class_link) {

    area.innerHTML =
      "";

    return;
  }


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
      "
    >

      <div>

        <strong
          style="
            font-size:18px;
          "
        >
          Link da minha aula
        </strong>


        <div
          style="
            margin-top:5px;
            color:#666;
            font-size:13px;
          "
        >
          Use este botao para entrar na sua sala de aula.
        </div>

      </div>


      <a
        href="${safeHrefV3(
          item.class_link
        )}"
        target="_blank"
        rel="noopener noreferrer"
        class="action-button"
        style="
          text-decoration:none;
          display:inline-block;
        "
      >
        Entrar na aula
      </a>

    </div>

  `;

}


// =====================================================
// AVISOS DO ALUNO
// =====================================================

async function loadStudentNotices() {

  const container =
    document.getElementById(
      "studentNoticesArea"
    );


  if (!container) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_unread_notices"
    );


  if (error) {

    console.error(
      "Erro ao carregar avisos:",
      error
    );

    container.innerHTML = "";

    return;
  }


  const notices =
    data || [];


  if (notices.length === 0) {

    container.innerHTML = "";

    return;
  }


  container.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #f0ad4e;
      "
    >

      <div
        style="
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:15px;
        "
      >

        <span style="font-size:24px;">
          \uD83D\uDCE2
        </span>

        <h3 style="margin:0;">
          Avisos
        </h3>

      </div>

      <div
        style="
          display:grid;
          gap:12px;
        "
      >

        ${notices
          .map(
            notice =>
              renderStudentNotice(
                notice
              )
          )
          .join("")}

      </div>

    </div>

  `;


  document
    .querySelectorAll(
      ".mark-student-notice-read-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          markStudentNoticeAsRead(
            button.dataset.noticeId
          );

        }
      );

    });

}


// =====================================================
// CARD DE AVISO
// =====================================================

function renderStudentNotice(
  notice
) {

  let validityInfo = "";


  if (notice.expires_at) {

    validityInfo = `

      <div
        style="
          margin-top:10px;
          font-size:13px;
          color:#666;
        "
      >
        Aviso v\u00E1lido at\u00E9:
        ${formatDateTime(
          notice.expires_at
        )}
      </div>

    `;

  }


  return `

    <div
      id="student-notice-${notice.notice_id}"
      style="
        padding:15px;
        border:1px solid #e2e2e2;
        border-radius:10px;
        background:#fffdf5;
      "
    >

      <strong
        style="
          display:block;
          margin-bottom:8px;
          font-size:17px;
        "
      >
        ${escapeHtml(
          notice.title
        )}
      </strong>

      <div
        style="
          white-space:pre-wrap;
          line-height:1.5;
        "
      >
        ${escapeHtml(
          notice.message
        )}
      </div>

      ${validityInfo}

      <button
        type="button"
        class="secondary-button mark-student-notice-read-button"
        data-notice-id="${notice.notice_id}"
        style="
          margin-top:12px;
        "
      >
        \u2713 Marcar como lido
      </button>

    </div>

  `;

}


// =====================================================
// MARCAR AVISO DO ALUNO COMO LIDO
// =====================================================

async function markStudentNoticeAsRead(
  noticeId
) {

  if (!noticeId) {
    return;
  }


  const button =
    document.querySelector(
      `.mark-student-notice-read-button[data-notice-id="${noticeId}"]`
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Marcando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "mark_student_notice_read",
      {
        p_notice_id:
          noticeId
      }
    );


  if (error) {

    console.error(
      "Erro ao marcar aviso como lido:",
      error
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "\u2713 Marcar como lido";

    }


    alert(
      error.message ||
      "N\u00E3o foi poss\u00EDvel marcar o aviso como lido."
    );

    return;
  }


  await loadStudentNotices();

}


// =====================================================
// REGRAS DO ALUNO
// =====================================================

function formatTeacherRulesForStudentV25(value) {
  const lines = String(value || "").split(/\r?\n/).map(line => line.trim());
  const parts = [];
  let listItems = [];
  const flushList = () => {
    if (!listItems.length) return;
    parts.push(`<ul>${listItems.join("")}</ul>`);
    listItems = [];
  };

  lines.forEach(line => {
    if (!line) {
      flushList();
      return;
    }
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s*(.+)$/);
    if (bullet) {
      listItems.push(`<li>${escapeHtml(bullet[1])}</li>`);
      return;
    }
    flushList();
    if (/^.{2,80}:$/.test(line)) {
      parts.push(`<h4>${escapeHtml(line.replace(/:$/, ""))}</h4>`);
    } else {
      parts.push(`<p>${escapeHtml(line)}</p>`);
    }
  });
  flushList();
  return parts.join("");
}

async function loadStudentRules() {

  const container =
    document.getElementById(
      "studentRulesContent"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <p>Carregando regras...</p>
  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_student_rules_content"
    );


  if (error) {

    console.error(
      "Erro ao carregar regras:",
      error
    );


    container.innerHTML = `

      <div
        style="
          padding:20px;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        <strong>
          Nao foi possivel carregar as regras.
        </strong>
      </div>

    `;

    return;
  }


  const content =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    )
    || {};


  const rules =
    String(
      content.rules_text || ""
    ).trim();


  const imageUrl = getRulesImagePublicUrl(content.rules_image_path);


  if (
    !rules &&
    !imageUrl
  ) {

    container.innerHTML = `

      <div class="student-rules-empty-v11">
        <span class="student-rules-empty-icon-v11" aria-hidden="true">☼</span>
        <strong>
          Professor está definindo as regras.
        </strong>
        <small>Assim que estiverem prontas, elas aparecerão aqui.</small>
      </div>

    `;

    return;
  }


  container.innerHTML = `

    <div class="student-rules-card-v11 ${rules ? "has-text" : "image-only"}">

      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="Imagem das regras" class="student-rules-image-v11">` : ""}

      ${
        rules

          ? `

            <span class="student-rules-label-v25">REGRAS DAS AULAS</span>
            <div class="student-rules-text-v11">${formatTeacherRulesForStudentV25(rules)}</div>

          `

          : ""
      }


    </div>

  `;

  const rulesImage = container.querySelector(".student-rules-image-v11");
  if (rulesImage) {
    const trim = () => trimRulesImageWhitespaceV20(rulesImage);
    if (rulesImage.complete) trim();
    else rulesImage.addEventListener("load", trim, { once: true });
  }

}


// =====================================================
// FINANCEIRO DO ALUNO
// =====================================================

async function loadStudentFinancialHistory() {

  const container =
    document.getElementById(
      "studentFinancialContent"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <p>Carregando mensalidades...</p>
  `;


  const [financialResult, paymentResult] = await Promise.all([
    supabaseClient.rpc("get_my_financial_history"),
    supabaseClient.rpc("get_my_teacher_payment_info_v20")
  ]);

  const { data, error } = financialResult;
  const paymentInfo = Array.isArray(paymentResult.data)
    ? paymentResult.data[0]
    : paymentResult.data;


  if (error) {

    console.error(
      "Erro ao carregar financeiro:",
      error
    );


    container.innerHTML = `
      <p>
        N\xe3o foi poss\xedvel carregar
        suas mensalidades.
      </p>
    `;

    return;
  }


  const financial =
    data || [];

  const paymentBlock = paymentInfo?.pix
    ? `
      <section class="student-payment-highlight-v20">
        <div>
          <span class="student-payment-eyebrow-v20">Forma de pagamento do professor</span>
          <strong>PIX</strong>
          <div class="student-payment-pix-v20">${escapeHtml(paymentInfo.pix)}</div>
          <button type="button" class="secondary-button" id="copyStudentTeacherPixV20">Copiar PIX</button>
        </div>
        ${paymentInfo.pix_qr_code_url ? `
          <figure class="student-payment-qr-v20">
            <img src="${escapeHtml(paymentInfo.pix_qr_code_url)}" alt="QR Code PIX do professor">
            <figcaption>Escaneie para pagar</figcaption>
          </figure>
        ` : ""}
      </section>
    `
    : "";


  if (financial.length === 0) {

    container.innerHTML = `

      ${paymentBlock}

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

        <strong>
          Nenhuma mensalidade cadastrada.
        </strong>

        <p>
          Quando o professor cadastrar
          uma mensalidade, ela aparecer\xe1 aqui.
        </p>

      </div>

    `;

    bindStudentPixCopyV20(paymentInfo?.pix);
    return;
  }


  financial.sort(
    (a, b) => {

      const dateA =
        Number(a.year) * 100 +
        Number(a.month);

      const dateB =
        Number(b.year) * 100 +
        Number(b.month);

      return dateB - dateA;

    }
  );


  container.innerHTML = `

    ${paymentBlock}

    <p class="student-financial-history-note-v20">
      Seu histórico mensal fica preservado para consulta, inclusive depois do pagamento.
    </p>

    <div
      style="
        display:grid;
        gap:15px;
      "
    >

      ${financial
        .map(
          item =>
            renderFinancialCard(item)
        )
        .join("")}

    </div>


    <div
      id="studentMonthlyFinancialReportArea"
      style="
        display:none;
        margin-top:18px;
      "
    ></div>

  `;


  bindStudentPixCopyV20(paymentInfo?.pix);


  document
    .querySelectorAll(
      ".student-financial-report-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openStudentMonthlyFinancialReport(
            Number(
              button.dataset.year
            ),
            Number(
              button.dataset.month
            )
          );

        }
      );

    });
}


// =====================================================
// RELATORIO MENSAL DO PROPRIO ALUNO
// =====================================================




// =====================================================
// CARD FINANCEIRO
// =====================================================

function renderFinancialCard(item) {

  const grossAmount = Number(item.amount || 0);
  const discountAmount = Number(item.discount || 0);
  const netAmount = Math.max(0, grossAmount - discountAmount);

  const month =
    formatMonth(
      item.month
    );


  const fallbackDueDate =
    (
      item.year &&
      item.month
    )
      ? (
          String(
            item.year
          )
          +
          "-"
          +
          String(
            item.month
          ).padStart(
            2,
            "0"
          )
          +
          "-01"
        )
      : null;


  const dueDateValue =
    item.due_date ||
    fallbackDueDate;


  const valuesHidden =
    item.financial_values_hidden ===
      true;


  const status =
    formatPaymentStatus(
      item.payment_status
    );


  return `

    <div
      style="
        border:1px solid #ddd;
        border-radius:12px;
        padding:20px;
        background:white;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <h4
          style="
            margin:0;
            font-size:20px;
          "
        >
          ${month}/${item.year}
        </h4>


        <span
          style="
            font-weight:bold;
          "
        >
          ${status}
        </span>

      </div>


      ${
        valuesHidden

          ? `

            <div
              style="
                margin:15px 0 10px;
                padding:14px;
                border-radius:9px;
                background:#fff3cd;
                color:#6b5400;
              "
            >

              <strong>
                Valores financeiros disponiveis apenas para o responsavel.
              </strong>


              <div
                style="
                  margin-top:5px;
                  font-size:13px;
                "
              >
                O login do aluno nao exibe mensalidade,
                valor por aula, descontos ou valores de calculo.
              </div>

            </div>

          `

          : `

            <p
              style="
                font-size:24px;
                font-weight:bold;
                margin:15px 0 7px;
              "
            >
              ${formatCurrency(
                netAmount
              )}
            </p>


            ${
              item.billing_type ===
                "per_lesson"

                ? `

                  <p
                    style="
                      margin-top:0;
                      color:#555;
                    "
                  >
                    <strong>
                      Calculo:
                    </strong>

                    ${Number(
                      item.lesson_count || 0
                    )}
                    aula(s)

                    x

                    ${formatCurrency(
                      item.lesson_unit_value || 0
                    )}

                    ${discountAmount > 0 ? `
                      <br>Subtotal: ${formatCurrency(grossAmount)}<br>
                      Desconto: ${formatCurrency(discountAmount)}<br>
                      <strong>Total: ${formatCurrency(netAmount)}</strong>
                    ` : ""}
                  </p>

                `

                : `

                  <p
                    style="
                      margin-top:0;
                      color:#555;
                    "
                  >
                    Cobranca mensal
                  </p>

                `
            }

          `
      }


      <p>
        <strong>Vencimento:</strong>

        ${
          dueDateValue

            ? formatDate(
                new Date(
                  dueDateValue +
                  "T12:00:00"
                )
              )

            : "Nao informado"
        }
      </p>


      ${
        item.paid_at

          ? `

            <p>
              <strong>Pagamento:</strong>
              ${formatDate(
             [Truncated]
