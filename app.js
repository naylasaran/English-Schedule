console.log(
  "Aulora build: identidade-visual-v1-20260826"
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

let currentStudentTeacherRescheduleRules = {
  makeup_reschedule_notice_hours: 2,
  monthly_makeup_limit: 8,
  makeup_reschedule_max_count: 1,
  lesson_reschedule_notice_hours: 2
};

let currentAdminTeachers = [];
let currentAdminTeacherSystemFinancial = [];
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


function getAppBaseUrlV4() {
  const url = new URL(".", window.location.href);
  url.search = "";
  url.hash = "";
  return url.href;
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
      "register_public_teacher_from_auth_v2",
      {
        p_name: metadata.name,
        p_email: user.email,
        p_phone: metadata.phone,
        p_cpf: metadata.cpf,
        p_pix: metadata.pix,
        p_cnpj: metadata.cnpj,
        p_work_start_time: metadata.work_start_time,
        p_work_end_time: metadata.work_end_time,
        p_work_days: Array.isArray(metadata.work_days) ? metadata.work_days : []
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
        work_days: null
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


  if (error) {

    console.error(
      "Erro ao carregar perfil:",
      error
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

async function showLoggedUser(user) {

  currentUser = user;

  currentProfile =
    await loadProfile(user.id);

  if (!currentProfile) {
    currentProfile = await finalizeConfirmedPublicTeacherV4(user);
  }

  if (!currentProfile) {

    loginMessage.textContent =
      "N\xe3o foi poss\xedvel carregar seu perfil.";

    return;
  }

  loginScreen.classList.add("hidden");


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
        currentTeacherAccess = teacherAccount;
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
        "Este acesso esta pausado ou desativado e nao possui reposicoes disponiveis.";

      return;
    }


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


      return;
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
    `;

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

    `;

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

async function openGuardianMonthlyFinancialReport(
  studentId,
  year,
  month
) {

  const area =
    document.getElementById(
      "guardianMonthlyFinancialReportArea"
    );


  if (!area) {
    return;
  }


  area.style.display =
    "block";


  area.innerHTML = `

    <div
      style="
        padding:15px;
        border:1px solid #e7dfd5;
        border-radius:8px;
        background:#fffaf3;
      "
    >
      Carregando aulas do mes...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_guardian_student_monthly_financial_report",
      {

        p_student_id:
          studentId,

        p_year:
          year,

        p_month:
          month

      }
    );


  if (error) {

    console.error(
      "Erro ao carregar relatorio financeiro do responsavel:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:15px;
          border:1px solid #d9534f;
          border-radius:8px;
          background:#ffffff;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar as aulas do mes."
        )}
      </div>

    `;


    return;
  }


  const lessons =
    data || [];


  area.innerHTML = `

    <div
      style="
        padding:16px;
        border:1px solid #e7dfd5;
        border-radius:8px;
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

        <div>

          <strong>
            Aulas de
            ${escapeHtml(
              formatMonth(
                month
              )
            )}/${year}
          </strong>


          <div
            style="
              margin-top:4px;
              color:#666;
              font-size:13px;
            "
          >
            Aulas regulares consideradas no financeiro daquele mes.
          </div>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="closeGuardianMonthlyFinancialReportButton"
        >
          Fechar
        </button>

      </div>


      <div
        style="
          display:grid;
          gap:9px;
          margin-top:14px;
        "
      >

        ${
          lessons.length === 0

            ? `

              <div
                style="
                  padding:13px;
                  border:1px solid #ddd;
                  border-radius:8px;
                "
              >
                Nenhuma aula regular encontrada neste mes.
              </div>

            `

            : lessons
                .map(
                  renderMonthlyFinancialLessonRow
                )
                .join("")
        }

      </div>


      <p
        style="
          margin:14px 0 0;
          color:#666;
          font-size:13px;
        "
      >
        Reposicoes nao aparecem como uma nova cobranca.
      </p>

    </div>

  `;


  const closeButton =
    document.getElementById(
      "closeGuardianMonthlyFinancialReportButton"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        area.style.display =
          "none";

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });

}


// =====================================================
// FINANCEIRO PARA O RESPONSAVEL
// =====================================================

function renderGuardianFinancialRow(
  item
) {

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
            item.amount
          )}
        </strong>

      </div>


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
              Seguranca da Aulora
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
              Integridade da Aulora
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
              aqui o resultado antes de liberar a Aulora.
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


  const savePixButton =
    document.getElementById(
      "saveAdminSystemPixButton"
    );


  if (savePixButton) {

    savePixButton.addEventListener(
      "click",
      saveAdminSystemPix
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
        "No ADM, execute Seguranca da Aulora.",
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
        "No ADM, execute Integridade da Aulora.",
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


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_admin_system_billing_settings"
    );


  if (error) {

    console.warn(
      "Nao foi possivel carregar o PIX do sistema:",
      error
    );

    return;
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


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_admin_system_billing_settings",
      {
        p_pix_key:
          input.value.trim() || null
      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar PIX";

  }


  if (error) {

    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o PIX.";

      message.style.color =
        "red";

    }

    return;
  }


  if (message) {

    message.textContent =
      "PIX atualizado com sucesso.";

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
        "get_admin_teacher_student_capacity_v2"
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


  renderAdminTeacherSystemReceivedSummary(
    year,
    month
  );


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

    <div
      style="
        padding:16px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#ffffff;
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
            <option value="paid" ${teacher.access_type === "paid" ? "selected" : ""}>Assinante / pago</option>
            <option value="trial" ${teacher.access_type === "trial" ? "selected" : ""}>Teste gratis por 15 dias</option>
            <option value="free" ${teacher.access_type === "free" ? "selected" : ""}>Gratis por tempo ilimitado</option>
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

        <div class="schedule-legend">
          <span>\uD83D\uDFE2 Livre</span>
          <span>\uD83D\uDD34 Ocupado</span>
          <span>\u26AB Indispon\u00EDvel</span>
          <span>\uD83D\uDD35 Minha aula</span>
          <span>\u23F8 Aulas pausadas</span>
          <span>\uD83D\uDFE3 Minha reposi\u00E7\u00E3o</span>
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


  const imageUrl =
    getRulesImagePublicUrl(
      content.rules_image_path
    );


  if (
    !rules &&
    !imageUrl
  ) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        <strong>
          Nenhuma regra cadastrada.
        </strong>
      </div>

    `;

    return;
  }


  container.innerHTML = `

    <div
      style="
        padding:20px;
        border:1px solid #ddd;
        border-radius:10px;
        background:white;
      "
    >

      ${
        rules

          ? `

            <div
              style="
                white-space:pre-wrap;
                line-height:1.6;
              "
            >
              ${escapeHtml(
                rules
              )}
            </div>

          `

          : ""
      }


      ${
        imageUrl

          ? `

            <img
              src="${escapeHtml(
                imageUrl
              )}"
              alt="Imagem das regras"
              style="
                display:block;
                max-width:100%;
                max-height:700px;
                object-fit:contain;
                margin-top:${rules ? "18px" : "0"};
                border-radius:10px;
              "
            >

          `

          : ""
      }

    </div>

  `;

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


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_financial_history"
    );


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


  if (financial.length === 0) {

    container.innerHTML = `

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

async function openStudentMonthlyFinancialReport(
  year,
  month
) {

  const area =
    document.getElementById(
      "studentMonthlyFinancialReportArea"
    );


  if (!area) {
    return;
  }


  area.style.display =
    "block";


  area.innerHTML = `

    <div
      style="
        padding:18px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#fffaf3;
      "
    >
      Carregando aulas do mes...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_monthly_financial_report",
      {

        p_year:
          year,

        p_month:
          month

      }
    );


  if (error) {

    console.error(
      "Erro ao carregar aulas do financeiro:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:18px;
          border:1px solid #d9534f;
          border-radius:10px;
          background:#ffffff;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar as aulas."
        )}
      </div>

    `;


    return;
  }


  const lessons =
    data || [];


  area.innerHTML = `

    <div
      style="
        padding:20px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          align-items:flex-start;
          flex-wrap:wrap;
        "
      >

        <div>

          <h4
            style="
              margin:0;
            "
          >
            Aulas de
            ${escapeHtml(
              formatMonth(
                month
              )
            )}/${year}
          </h4>


          <p
            style="
              margin:6px 0 0;
              color:#666;
            "
          >
            Aulas regulares consideradas neste mes.
          </p>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="closeStudentMonthlyFinancialReportButton"
        >
          Fechar
        </button>

      </div>


      <div
        style="
          display:grid;
          gap:9px;
          margin-top:16px;
        "
      >

        ${
          lessons.length === 0

            ? `

              <div
                style="
                  padding:15px;
                  border:1px solid #ddd;
                  border-radius:8px;
                "
              >
                Nenhuma aula regular encontrada neste mes.
              </div>

            `

            : lessons
                .map(
                  renderMonthlyFinancialLessonRow
                )
                .join("")
        }

      </div>


      <p
        style="
          margin-top:14px;
          color:#666;
          font-size:13px;
        "
      >
        Reposicoes nao aparecem como uma nova cobranca.
      </p>

    </div>

  `;


  const closeButton =
    document.getElementById(
      "closeStudentMonthlyFinancialReportButton"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        area.style.display =
          "none";

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// CARD FINANCEIRO
// =====================================================

function renderFinancialCard(item) {

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
                item.amount
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
                new Date(
                  item.paid_at
                )
              )}
            </p>

          `

          : ""
      }


      ${
        !valuesHidden &&
        Number(
          item.discount || 0
        ) > 0

          ? `

            <p>
              <strong>Desconto:</strong>
              ${formatCurrency(
                item.discount
              )}
            </p>

          `

          : ""
      }


      ${
        item.invoice_required

          ? `

            <p>
              <strong>Nota fiscal:</strong>
              ${
                item.invoice_issued
                  ? "Emitida"
                  : "Pendente"
              }
            </p>

          `

          : ""
      }


      <p>
        <strong>Observa\xe7\xf5es:</strong>
        ${
          item.notes ||
          "Nenhuma observa\xe7\xe3o."
        }
      </p>


      <button
        type="button"
        class="secondary-button student-financial-report-button"
        data-year="${Number(
          item.year
        )}"
        data-month="${Number(
          item.month
        )}"
        style="
          margin-top:8px;
        "
      >
        Ver aulas do mes
      </button>

    </div>

  `;
}


// =====================================================
// M\xcaS
// =====================================================

function formatMonth(month) {

  const months = [

    "",
    "Janeiro",
    "Fevereiro",
    "Mar\xe7o",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"

  ];


  return (
    months[
      Number(month)
    ] || `M\xeas ${month}`
  );
}


// =====================================================
// MOEDA
// =====================================================

function formatCurrency(amount) {

  const value =
    Number(amount);


  if (
    Number.isNaN(value)
  ) {

    return "Valor n\xe3o informado";

  }


  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  ).format(value);
}


// =====================================================
// STATUS FINANCEIRO
// =====================================================

function formatPaymentStatus(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "paid":
    case "pago":

      return "\uD83D\uDFE2 Pago";


    case "pending":
    case "pendente":

      return "\uD83D\uDFE1 Pendente";


    case "overdue":
    case "atrasado":

      return "\uD83D\uDD34 Atrasado";


    case "cancelled":
    case "cancelado":

      return "\u26ab Cancelado";


    default:

      return (
        status ||
        "Status n\xe3o informado"
      );

  }
}


// =====================================================
// HIST\xd3RICO
// =====================================================

async function loadStudentHistory() {

  const container =
    document.getElementById(
      "studentHistoryContent"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <p>Carregando hist\xf3rico...</p>
  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_student_history"
    );


  if (error) {

    console.error(
      "Erro ao carregar hist\xf3rico:",
      error
    );


    container.innerHTML = `
      <p>
        N\xe3o foi poss\xedvel carregar seu hist\xf3rico.
      </p>
    `;

    return;
  }


  const lessons =
    data || [];


  if (lessons.length === 0) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

        <strong>
          Nenhuma aula encontrada.
        </strong>

        <p>
          Seu hist\xf3rico aparecer\xe1 aqui
          depois que houver aulas registradas.
        </p>

      </div>

    `;

    return;
  }


  const lessonIds =
    lessons.map(
      lesson => lesson.lesson_id
    );


  const {
    data: comments,
    error: commentsError
  } =
    await supabaseClient.rpc(
      "get_my_lesson_comments_v3",
      {
        p_lesson_ids:
          lessonIds
      }
    );


  if (commentsError) {

    console.error(
      "Erro ao carregar coment\xe1rios:",
      commentsError
    );

  }


  const commentList =
    comments || [];


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:18px;
      "
    >

      ${lessons
        .map(
          lesson =>
            renderHistoryLesson(
              lesson,
              commentList
            )
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".add-lesson-comment-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          addLessonComment(
            button.dataset.lessonId
          );

        }
      );

    });
}


// =====================================================
// CARD DO HIST\xd3RICO
// =====================================================

function renderHistoryLesson(
  lesson,
  comments
) {

  const lessonComments =
    comments.filter(
      comment =>
        comment.lesson_id ===
        lesson.lesson_id
    );


  const date =
    lesson.lesson_date
      ? formatDate(
          new Date(
            lesson.lesson_date +
            "T12:00:00"
          )
        )
      : "Data n\xe3o informada";


  const start =
    lesson.start_time
      ? normalizeTime(
          lesson.start_time
        )
      : "";


  const end =
    lesson.end_time
      ? normalizeTime(
          lesson.end_time
        )
      : "";


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
          gap:10px;
          flex-wrap:wrap;
          margin-bottom:15px;
        "
      >

        <h4
          style="
            margin:0;
            font-size:20px;
          "
        >
          ${date}
        </h4>

        <strong>
          ${start}
          ${end ? " \xe0s " + end : ""}
        </strong>

      </div>


      <p>
        <strong>Mat\xe9ria:</strong>
        ${
          lesson.subject_name ||
          "N\xe3o informada"
        }
      </p>


      <p>
        <strong>Conte\xfado:</strong>
        ${
          lesson.content_title ||
          "N\xe3o informado"
        }
      </p>


      <p>
        <strong>Presen\xe7a:</strong>
        ${formatAttendanceStatus(
          lesson.attendance_status
        )}
      </p>


      ${
        lesson.lesson_status ===
        "cancelled"

          ? `

            <div
              style="
                margin-top:15px;
                padding:15px;
                background:#fff3cd;
                border-radius:8px;
              "
            >

              <strong>
                Cancelamento
              </strong>

              <p>
                <strong>
                  Cancelado por:
                </strong>

                ${escapeHtml(
                  lesson.cancelled_by ||
                  "N\u00E3o informado"
                )}
              </p>

              <p>
                <strong>
                  Reposi\u00E7\u00E3o gerada:
                </strong>

                ${
                  lesson.generated_makeup
                    ? "\u2705 Sim"
                    : "\u274C N\u00E3o"
                }
              </p>

              ${
                lesson.cancellation_notes

                  ? `

                    <p>
                      <strong>
                        Detalhes:
                      </strong>

                      ${escapeHtml(
                        lesson.cancellation_notes
                      )}
                    </p>

                  `

                  : ""
              }

            </div>

          `

          : ""
      }


      <div
        style="
          margin-top:15px;
          padding:15px;
          background:#f7f7f7;
          border-radius:8px;
        "
      >

        <strong>
          Observa\xe7\xf5es do professor
        </strong>

        <p>
          ${
            lesson.teacher_notes ||
            "Nenhuma observa\xe7\xe3o registrada."
          }
        </p>

      </div>


      <div
        style="
          margin-top:18px;
        "
      >

        <strong>
          Coment\xe1rios do aluno
        </strong>


        ${
          lessonComments.length === 0

            ? `

              <p>
                Voc\xea ainda n\xe3o adicionou
                um coment\xe1rio nesta aula.
              </p>

            `

            : lessonComments
                .map(
                  comment => `

                    <div
                      style="
                        margin-top:10px;
                        padding:12px;
                        background:#f7e9e1;
                        border-radius:8px;
                      "
                    >

                      <div>
                        ${escapeHtml(
                          comment.comment
                        )}
                      </div>

                      <small>
                        ${formatDateTime(
                          comment.created_at
                        )}
                      </small>

                    </div>

                  `
                )
                .join("")
        }


        <div
          style="
            margin-top:15px;
          "
        >

          <textarea
            id="comment-${lesson.lesson_id}"
            placeholder="Escreva um coment\xe1rio sobre esta aula..."
            rows="3"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
              resize:vertical;
            "
          ></textarea>


          <button
            type="button"
            class="action-button add-lesson-comment-button"
            data-lesson-id="${lesson.lesson_id}"
            style="margin-top:8px;"
          >
            Adicionar coment\xe1rio
          </button>


          <p
            id="comment-message-${lesson.lesson_id}"
            style="margin-top:8px;"
          ></p>

        </div>

      </div>

    </div>

  `;
}


// =====================================================
// ADICIONAR COMENT\xc1RIO
// =====================================================

async function addLessonComment(
  lessonId
) {

  const input =
    document.getElementById(
      `comment-${lessonId}`
    );


  const message =
    document.getElementById(
      `comment-message-${lessonId}`
    );


  const button =
    document.querySelector(
      `.add-lesson-comment-button[data-lesson-id="${lessonId}"]`
    );


  if (!input) {
    return;
  }


  const comment =
    input.value.trim();


  if (!comment) {

    if (message) {

      message.textContent =
        "Escreva um coment\xe1rio antes de enviar.";

      message.style.color =
        "red";

    }

    return;
  }


  if (button) {

    button.disabled = true;

    button.textContent =
      "Salvando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "add_my_lesson_comment_v3",
      {
        p_lesson_id:
          lessonId,

        p_comment:
          comment
      }
    );


  if (error) {

    console.error(
      "Erro ao adicionar coment\xe1rio:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\xe3o foi poss\xedvel adicionar o coment\xe1rio.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled = false;

      button.textContent =
        "Adicionar coment\xe1rio";

    }

    return;
  }


  if (message) {

    message.textContent =
      "Coment\xe1rio adicionado com sucesso.";

    message.style.color =
      "green";

  }


  input.value = "";

  await loadStudentHistory();
}


// =====================================================
// PRESEN\xc7A
// =====================================================

function formatAttendanceStatus(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "present":
      return "\u2705 Presente";

    case "absent":
      return "\u274c Falta sem justificativa";

    case "justified_absence":
      return "\u26a0\ufe0f Falta justificada";

    case "cancelled":
      return "\uD83D\uDEAB Cancelada";

    case "makeup":
      return "\uD83D\uDD04 Reposi\xe7\xe3o";

    default:
      return status || "N\xe3o registrado";

  }
}


// =====================================================
// REPOSI\u00C7\u00D5ES
// =====================================================

async function loadStudentMakeups() {

  const container =
    document.getElementById(
      "makeupsContent"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <p>Carregando reposi\u00E7\u00F5es...</p>
  `;


  if (!currentStudentId) {

    await loadCurrentStudentId();

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_makeups"
    );


  if (error) {

    console.error(
      "Erro ao carregar reposi\u00E7\u00F5es:",
      error
    );

    container.innerHTML = `
      <p>
        N\u00E3o foi poss\u00EDvel carregar suas reposi\u00E7\u00F5es.
      </p>
    `;

    return;
  }


  const makeups =
    data || [];


  if (makeups.length === 0) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

        <strong>
          Voc\u00EA n\u00E3o possui reposi\u00E7\u00F5es cadastradas.
        </strong>

        <p>
          Quando uma falta, cancelamento de aula
          ou atribui\u00E7\u00E3o do professor gerar uma
          reposi\u00E7\u00E3o, ela aparecer\u00E1 aqui.
        </p>

      </div>

    `;

    return;
  }


  const enrichedMakeups =
    makeups.map(
      makeup => {

        const isReserved =
          Boolean(
            makeup.reservation_id
          );


        return {

          ...makeup,

          reserved_now:
            isReserved,

          display_status:
            isReserved
              ? "reserved"
              : makeup.status

        };

      }
    );


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:15px;
      "
    >

      ${enrichedMakeups
        .map(
          renderMakeupCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".cancel-makeup-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            cancelStudentMakeup(
              button.dataset.reservationId
            );

          }
        );

      }
    );

}


// =====================================================
// ID DO ALUNO ATUAL
// =====================================================

function currentStudentIdForQuery() {

  /*
   * IMPORTANTE:
   * reservations.student_id aponta para students.id.
   * students.id n\xe3o \xe9 necessariamente igual ao auth user id.
   */

  return currentStudentId || null;
}


// =====================================================
// CARD DE REPOSI\u00C7\u00C3O
// =====================================================

function renderMakeupCard(makeup) {

  const duration =
    makeup.duration_minutes || 0;

  const source =
    formatMakeupSource(
      makeup.source
    );

  const status =
    formatMakeupStatus(
      makeup.display_status ||
      makeup.status
    );

  const expires =
    makeup.expires_at
      ? formatDateTime(
          makeup.expires_at
        )
      : "N\u00E3o informado";

  const cancellationCount =
    Number(
      makeup.cancellation_count ||
      0
    );

  const isReserved =
    Boolean(
      makeup.reserved_now &&
      makeup.reservation_id
    );


  // ===================================================
  // AULA QUE GEROU A REPOSI\u00C7\u00C3O
  // ===================================================

  let sourceLessonInfo = "";


  if (
    makeup.source_lesson_date
  ) {

    const sourceDate =
      formatDate(
        new Date(
          makeup.source_lesson_date +
          "T12:00:00"
        )
      );

    const sourceStart =
      makeup.source_lesson_start_time
        ? normalizeTime(
            makeup.source_lesson_start_time
          )
        : "";

    const sourceEnd =
      makeup.source_lesson_end_time
        ? normalizeTime(
            makeup.source_lesson_end_time
          )
        : "";


    sourceLessonInfo = `

      <p>
        <strong>
          Aula de origem:
        </strong>

        ${sourceDate}

        ${
          sourceStart
            ? `, ${sourceStart}`
            : ""
        }

        ${
          sourceEnd
            ? ` \u00E0s ${sourceEnd}`
            : ""
        }
      </p>

    `;

  }

  else if (
    String(
      makeup.source || ""
    ).toLowerCase() ===
    "manual"
  ) {

    sourceLessonInfo = `

      <p>
        <strong>
          Aula de origem:
        </strong>

        Nao vinculada.
        Esta reposicao foi concedida manualmente
        pelo professor.
      </p>

    `;

  }


  // ===================================================
  // RESERVA ATUAL
  // ===================================================

  let reservationInfo = "";


  if (
    isReserved &&
    makeup.reservation_date
  ) {

    reservationInfo = `

      <div
        style="
          margin-top:15px;
          padding:14px;
          border-radius:8px;
          background:#f7e9e1;
        "
      >

        <strong>
          Reposi\u00E7\u00E3o agendada:
        </strong>

        <br>

        ${formatDate(
          new Date(
            makeup.reservation_date +
            "T12:00:00"
          )
        )}

        ${
          makeup.reservation_start_time
            ? ` \u00E0s ${normalizeTime(
                makeup.reservation_start_time
              )}`
            : ""
        }

        ${
          makeup.reservation_end_time
            ? ` at\u00E9 ${normalizeTime(
                makeup.reservation_end_time
              )}`
            : ""
        }

      </div>

    `;

  }


  // ===================================================
  // BOT\u00C3O DE CANCELAMENTO
  // ===================================================

  let cancelButton = "";


  if (
    isReserved &&
    makeup.reservation_id &&
    makeup.reservation_date &&
    makeup.reservation_start_time
  ) {

    const reservationDate =
      new Date(
        makeup.reservation_date +
        "T12:00:00"
      );

    const reservationDateTime =
      combineDateAndTime(
        reservationDate,
        makeup.reservation_start_time
      );

    const now =
      new Date();


    if (
      reservationDateTime > now
    ) {

      cancelButton = `

        <button
          type="button"
          class="secondary-button cancel-makeup-button"
          data-reservation-id="${makeup.reservation_id}"
          style="
            margin-top:15px;
            border-color:#c0392b;
            color:#c0392b;
          "
        >
          Cancelar reposi\u00E7\u00E3o
        </button>

        <p
          id="cancel-makeup-message-${makeup.reservation_id}"
          style="margin-top:8px;"
        ></p>

      `;

    }

    else {

      cancelButton = `

        <div
          style="
            margin-top:15px;
            padding:12px;
            border-radius:8px;
            background:#eeeeee;
            color:#666666;
          "
        >
          Esta reposi\u00E7\u00E3o j\u00E1 ocorreu.
        </div>

      `;

    }

  }


  return `

    <div
      style="
        border:1px solid #ddd;
        border-radius:12px;
        padding:18px;
        background:white;
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

        <h4
          style="
            margin:0;
            font-size:20px;
          "
        >
          ${duration} minutos
        </h4>

        <span style="font-weight:bold;">
          ${status.label}
        </span>

      </div>

      <div style="margin-top:12px;">

        <p>
          <strong>Origem:</strong>
          ${source}
        </p>

        ${sourceLessonInfo}

        <p>
          <strong>Validade:</strong>
          ${expires}
        </p>

        <p>
          <strong>
            Remarca\u00E7\u00F5es usadas:
          </strong>

          ${cancellationCount}
          de
          ${Number(
            currentStudentTeacherRescheduleRules
              .makeup_reschedule_max_count ||
            1
          )}
        </p>

        ${reservationInfo}

        ${cancelButton}

      </div>

    </div>

  `;

}


// =====================================================
// CANCELAR REPOSI\u00C7\u00C3O DO ALUNO
// =====================================================

async function openStudentMakeupFromAgenda(
  reservation
) {

  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (
    !area ||
    !reservation
  ) {
    return;
  }


  area.innerHTML = `

    <div class="card">

      <h3>
        Carregando reposicao...
      </h3>

    </div>

  `;


  let makeup =
    null;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_makeups"
    );


  if (!error) {

    makeup =
      (data || []).find(
        item =>
          String(
            item.makeup_id
          ) ===
          String(
            reservation.makeup_id
          )
      ) || null;

  }


  const sourceLabel =
    makeup
      ? formatMakeupSource(
          makeup.source
        )
      : "Nao informado";


  let sourceLessonHtml =
    "";


  if (
    makeup &&
    makeup.source_lesson_date
  ) {

    sourceLessonHtml = `

      <p>
        <strong>Aula de origem:</strong>

        ${formatDate(
          new Date(
            makeup.source_lesson_date +
            "T12:00:00"
          )
        )}

        -

        ${normalizeTime(
          makeup.source_lesson_start_time
        )}

        as

        ${normalizeTime(
          makeup.source_lesson_end_time
        )}
      </p>

    `;

  }


  const reservationDate =
    new Date(
      reservation.reservation_date +
      "T12:00:00"
    );


  const reservationDateTime =
    new Date(
      reservation.reservation_date +
      "T" +
      normalizeTime(
        reservation.start_time
      ) +
      ":00"
    );


  const futureReservation =
    reservationDateTime >
    new Date();


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #a9573a;
      "
    >

      <h3>
        Minha reposicao
      </h3>


      <p>
        <strong>Data:</strong>

        ${formatDate(
          reservationDate
        )}
      </p>


      <p>
        <strong>Horario:</strong>

        ${normalizeTime(
          reservation.start_time
        )}

        as

        ${normalizeTime(
          reservation.end_time
        )}
      </p>


      <p>
        <strong>Origem:</strong>

        ${escapeHtml(
          sourceLabel
        )}
      </p>


      ${sourceLessonHtml}


      ${
        futureReservation

          ? `

            <button
              type="button"
              class="danger-button cancel-makeup-button"
              data-reservation-id="${reservation.id}"
              id="agendaCancelMakeupButton"
            >
              Cancelar reposicao
            </button>


            <p
              id="cancel-makeup-message-${reservation.id}"
              style="
                margin-top:10px;
              "
            ></p>

          `

          : `

            <p>
              Esta reposicao ja ocorreu ou ja comecou.
            </p>

          `
      }


      <button
        type="button"
        class="secondary-button"
        id="closeStudentMakeupAgendaButton"
        style="
          margin-top:12px;
          margin-left:8px;
        "
      >
        Fechar
      </button>

    </div>

  `;


  const cancelButton =
    document.getElementById(
      "agendaCancelMakeupButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        cancelStudentMakeup(
          reservation.id
        );

      }
    );

  }


  const closeButton =
    document.getElementById(
      "closeStudentMakeupAgendaButton"
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

}


// =====================================================
// CANCELAR REPOSICAO DO ALUNO
// =====================================================

async function cancelStudentMakeup(
  reservationId
) {

  if (!reservationId) {

    alert(
      "N\u00E3o foi poss\u00EDvel identificar a reserva."
    );

    return;
  }


  await loadStudentTeacherRescheduleRules();


  const button =
    document.querySelector(
      `.cancel-makeup-button[data-reservation-id="${reservationId}"]`
    );


  const message =
    document.getElementById(
      `cancel-makeup-message-${reservationId}`
    );


  const [
    reservationResult,
    makeupsResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_my_reservation",
        {
          p_reservation_id:
            reservationId
        }
      ),

      supabaseClient.rpc(
        "get_my_makeups"
      )

    ]);


  if (reservationResult.error) {

    console.error(
      "Erro ao consultar reserva:",
      reservationResult.error
    );


    if (message) {

      message.textContent =
        "N\u00E3o foi poss\u00EDvel consultar a reserva.";

      message.style.color =
        "red";

    }


    return;
  }


  const reservation =
    reservationResult.data;


  const makeup =
    makeupsResult.error

      ? null

      : (
          makeupsResult.data || []
        ).find(
          item =>
            String(
              item.reservation_id || ""
            ) ===
            String(
              reservationId
            )
        )
        || null;


  const usedReschedules =
    Number(
      makeup?.cancellation_count ||
      0
    );


  const maximumReschedules =
    Number(
      currentStudentTeacherRescheduleRules
        .makeup_reschedule_max_count ||
      1
    );


  const minimumHours =
    Number(
      currentStudentTeacherRescheduleRules
        .makeup_reschedule_notice_hours ||
      2
    );


  const reservationDateTime =
    new Date(
      reservation.reservation_date +
      "T" +
      normalizeTime(
        reservation.start_time
      ) +
      ":00"
    );


  const now =
    new Date();


  if (
    reservationDateTime <= now
  ) {

    alert(
      "Essa reposi\u00E7\u00E3o j\u00E1 come\u00E7ou ou j\u00E1 ocorreu e n\u00E3o pode mais ser cancelada."
    );

    return;
  }


  const hoursUntilClass =
    (
      reservationDateTime.getTime()
      - now.getTime()
    )
    /
    (
      1000 *
      60 *
      60
    );


  const lateCancellation =
    hoursUntilClass <
    minimumHours;


  const rescheduleLimitReached =
    usedReschedules >=
    maximumReschedules;


  let confirmationText;


  if (lateCancellation) {

    confirmationText =
      "Tem certeza que deseja cancelar esta reposi\u00E7\u00E3o?\n\n"
      +
      "Faltam menos de "
      +
      minimumHours
      +
      " horas para a aula.\n\n"
      +
      "Essa reposi\u00E7\u00E3o ser\u00E1 perdida.";

  }

  else if (rescheduleLimitReached) {

    confirmationText =
      "Tem certeza que deseja cancelar esta reposi\u00E7\u00E3o?\n\n"
      +
      "O limite de "
      +
      maximumReschedules
      +
      " remarca\u00E7\u00E3o"
      +
      (
        maximumReschedules === 1
          ? ""
          : "\u00F5es"
      )
      +
      " j\u00E1 foi usado.\n\n"
      +
      "Ao cancelar novamente, esta reposi\u00E7\u00E3o ser\u00E1 perdida.";

  }

  else {

    confirmationText =
      "Tem certeza que deseja remarcar esta reposi\u00E7\u00E3o?\n\n"
      +
      "Esta ser\u00E1 a remarca\u00E7\u00E3o "
      +
      (
        usedReschedules + 1
      )
      +
      " de "
      +
      maximumReschedules
      +
      ".\n\n"
      +
      "A reposi\u00E7\u00E3o voltar\u00E1 para dispon\u00EDvel.";

  }


  const confirmed =
    window.confirm(
      confirmationText
    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Cancelando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "cancel_reservation_with_teacher_rules",
      {
        p_reservation_id:
          reservationId
      }
    );


  if (error) {

    console.error(
      "Erro ao cancelar reposi\u00E7\u00E3o:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel cancelar a reposi\u00E7\u00E3o.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Cancelar reposi\u00E7\u00E3o";

    }


    return;
  }


  if (message) {

    if (lateCancellation) {

      message.textContent =
        "Reposi\u00E7\u00E3o cancelada. Como n\u00E3o houve a anteced\u00EAncia de "
        +
        minimumHours
        +
        " horas, o direito \u00E0 reposi\u00E7\u00E3o foi perdido.";

    }

    else if (rescheduleLimitReached) {

      message.textContent =
        "Reposi\u00E7\u00E3o cancelada. O limite de remarca\u00E7\u00F5es j\u00E1 havia sido usado, por isso o direito foi perdido.";

    }

    else {

      message.textContent =
        "Reposi\u00E7\u00E3o liberada para nova marca\u00E7\u00E3o. Remarca\u00E7\u00E3o "
        +
        (
          usedReschedules + 1
        )
        +
        " de "
        +
        maximumReschedules
        +
        " utilizada.";

    }


    message.style.color =
      "green";

  }


  await loadStudentMakeups();

  await loadStudentWeeklySchedule();

}


// =====================================================
// STATUS REPOSI\xc7\xc3O
// =====================================================

function formatMakeupStatus(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "available":

      return {
        label: "\uD83D\uDFE2 Dispon\xedvel"
      };


    case "reserved":

      return {
        label: "\uD83D\uDFE3 Minha reposi\xe7\xe3o"
      };


    case "used":
    case "completed":

      return {
        label: "\u26ab Utilizada"
      };


    case "lost":

      return {
        label: "\uD83D\uDD34 Perdida"
      };


    case "expired":

      return {
        label: "\uD83D\uDFE0 Expirada"
      };


    default:

      return {
        label:
          status ||
          "Situa\xe7\xe3o desconhecida"
      };

  }
}


// =====================================================
// ORIGEM REPOSI\u00C7\u00C3O
// =====================================================

function formatMakeupSource(source) {

  switch (
    String(
      source || ""
    ).toLowerCase()
  ) {

    case "absence":
      return "Falta justificada";

    case "manual":
      return "Professor";

    case "student_cancellation":
      return "Cancelamento de aula";

    case "teacher_cancellation":
      return "Cancelamento do professor";

    default:
      return (
        source ||
        "N\u00E3o informado"
      );

  }

}


// =====================================================
// AGENDA DO ALUNO
// =====================================================

async function loadStudentWeeklySchedule() {

  const body = document.getElementById("studentScheduleBody");

  if (!body) return;

  const label = document.getElementById("selectedWeekLabel");

  if (label) {
    label.textContent = formatWeekLabel(selectedWeekStart);
  }

  body.innerHTML = `
    <tr>
      <td colspan="8">Carregando agenda...</td>
    </tr>
  `;

  if (!currentStudentId) {
    await loadCurrentStudentId();
  }

  const weekStart = formatDateForDatabase(selectedWeekStart);

  const {
    data,
    error
  } = await supabaseClient.rpc(
    "get_student_weekly_schedule",
    { p_week_start: weekStart }
  );

  if (error) {
    console.error("Erro ao carregar agenda:", error);

    body.innerHTML = `
      <tr>
        <td colspan="8">Erro ao carregar a agenda.</td>
      </tr>
    `;

    return;
  }

  const {
    data: teacherSettingsData,
    error: teacherSettingsError
  } =
    await supabaseClient.rpc(
      "get_my_teacher_public_settings"
    );


  if (teacherSettingsError) {

    console.warn(
      "Nao foi possivel carregar o horario do professor:",
      teacherSettingsError
    );


    currentStudentTeacherSettings =
      null;

  }

  else {

    currentStudentTeacherSettings =
      (
        Array.isArray(
          teacherSettingsData
        )
          ? teacherSettingsData[0]
          : teacherSettingsData
      )
      || null;

  }


  currentStudentSchedule =
    (data || [])
      .filter(
        slot =>
          isTimeInsideTeacherWorkHours(
            slot.start_time,
            slot.end_time,
            currentStudentTeacherSettings
          )
      );


  const {
    data: studentHolidayData,
    error: studentHolidayError
  } =
    await supabaseClient.rpc(
      "get_my_holidays_for_week",
      {
        p_week_start:
          weekStart
      }
    );


  if (studentHolidayError) {

    console.warn(
      "Nao foi possivel carregar os feriados da semana:",
      studentHolidayError
    );


    currentStudentHolidayWeek =
      [];

  }

  else {

    currentStudentHolidayWeek =
      studentHolidayData || [];

  }


  renderStudentHolidayArea();


  let weeklyMakeupReservations = [];
  let weeklyLessonHistory = [];
  let weeklyPausePeriods = [];


  const {
    data: releasedPauseSlotData,
    error: releasedPauseSlotError
  } =
    await supabaseClient.rpc(
      "get_my_released_pause_slots",
      {
        p_week_start:
          weekStart
      }
    );


  if (releasedPauseSlotError) {

    console.warn(
      "Nao foi possivel carregar os horarios liberados pelas pausas:",
      releasedPauseSlotError
    );

  }

  else {

    const releasedSlots =
      releasedPauseSlotData || [];


    releasedSlots
      .filter(
        releasedSlot =>
          isTimeInsideTeacherWorkHours(
            releasedSlot.start_time,
            releasedSlot.end_time,
            currentStudentTeacherSettings
          )
      )
      .forEach(
      releasedSlot => {

        const existingSlot =
          currentStudentSchedule.find(
            slot =>
              Number(
                slot.day_of_week
              ) ===
              Number(
                releasedSlot.day_of_week
              )
              &&
              normalizeTime(
                slot.start_time
              ) ===
              normalizeTime(
                releasedSlot.start_time
              )
          );


        if (existingSlot) {

          existingSlot.status =
            "free";

          existingSlot.reservation_id =
            null;

          existingSlot.makeup_id =
            null;

          existingSlot.reservation_date =
            null;

        }

        else {

          currentStudentSchedule.push({

            day_of_week:
              releasedSlot.day_of_week,

            start_time:
              releasedSlot.start_time,

            end_time:
              releasedSlot.end_time,

            status:
              "free",

            reservation_id:
              null,

            makeup_id:
              null,

            reservation_date:
              null

          });

        }

      }
    );

  }


  const {
    data: lessonHistoryData,
    error: lessonHistoryError
  } =
    await supabaseClient.rpc(
      "get_my_week_lesson_records",
      {
        p_week_start:
          weekStart
      }
    );


  if (lessonHistoryError) {

    console.warn(
      "Nao foi possivel carregar o historico da semana:",
      lessonHistoryError
    );

  }

  else {

    weeklyLessonHistory =
      lessonHistoryData || [];

  }


  const weekEndForPause =
    addDays(
      selectedWeekStart,
      6
    );


  const {
    data: pauseData,
    error: pauseError
  } =
    await supabaseClient.rpc(
      "get_my_pause_periods",
      {

        p_from_date:
          weekStart,

        p_to_date:
          formatDateForDatabase(
            weekEndForPause
          )

      }
    );


  if (pauseError) {

    console.warn(
      "Nao foi possivel carregar as pausas do aluno:",
      pauseError
    );

  }

  else {

    weeklyPausePeriods =
      pauseData || [];

  }


  if (currentStudentId) {

    const weekEnd = addDays(selectedWeekStart, 6);

    const {
      data: reservationData,
      error: reservationError
    } =
      await supabaseClient.rpc(
        "get_my_makeup_reservations_for_period",
        {
          p_from_date:
            formatDateForDatabase(
              selectedWeekStart
            ),

          p_to_date:
            formatDateForDatabase(
              weekEnd
            )
        }
      );

    if (reservationError) {
      console.warn(
        "N\xe3o foi poss\xedvel carregar as reposi\xe7\xf5es da semana:",
        reservationError
      );
    } else {
      weeklyMakeupReservations = reservationData || [];
    }
  }

  renderStudentWeeklySchedule(
    currentStudentSchedule,
    weeklyMakeupReservations,
    weeklyLessonHistory,
    weeklyPausePeriods
  );
}



// =====================================================
// RENDERIZAR AGENDA
// =====================================================

function renderStudentWeeklySchedule(
  schedule,
  makeupReservations = [],
  lessonHistoryRecords = [],
  pausePeriods = []
) {

  const head =
    document.getElementById(
      "studentScheduleHead"
    );

  const body =
    document.getElementById(
      "studentScheduleBody"
    );


  if (!head || !body) {
    return;
  }


  head.innerHTML = `

    <tr>

      <th>Hor\u00E1rio</th>

      ${getWeekDays()
        .map(
          day => `

            <th>

              ${day.name}<br>

              <small>
                ${formatDate(day.date)}
              </small>


              ${
                day.holiday

                  ? `

                    <div
                      style="
                        margin-top:4px;
                        font-size:11px;
                        font-weight:normal;
                      "
                    >
                      ${escapeHtml(
                        day.holiday.holiday_name
                      )}

                      <br>

                      ${
                        day.holiday.has_classes ===
                          false

                          ? "Sem aula"

                          : (
                              day.holiday.has_classes ===
                                true

                                ? "Aula normal"

                                : "Decisao pendente"
                            )
                      }
                    </div>

                  `

                  : ""
              }

            </th>

          `
        )
        .join("")}

    </tr>

  `;


  body.innerHTML = "";


  const times = [];


  schedule.forEach(slot => {

    const time =
      normalizeTime(
        slot.start_time
      );


    if (!times.includes(time)) {

      times.push(time);

    }

  });


  times.sort();


  times.forEach(time => {

    const row =
      document.createElement("tr");

    const timeCell =
      document.createElement("td");

    timeCell.textContent =
      time;

    row.appendChild(
      timeCell
    );


    for (
      let day = 1;
      day <= 7;
      day++
    ) {

      const cell =
        document.createElement("td");

      cell.classList.add(
        "schedule-cell"
      );


      const slot =
        findScheduleSlot(
          schedule,
          day,
          time
        );


      if (!slot) {

        cell.textContent =
          "\u2014";

        cell.classList.add(
          "unavailable"
        );

      }

      else {

        const slotDate =
          getDateForDay(
            selectedWeekStart,
            Number(
              slot.day_of_week
            )
          );

        const slotDateDb =
          formatDateForDatabase(
            slotDate
          );


        const holiday =
          currentStudentHolidayWeek.find(
            item =>
              String(
                item.holiday_date
              ) ===
              slotDateDb
          )
          || null;


        if (
          holiday
          &&
          holiday.has_classes ===
            false
        ) {

          cell.classList.add(
            "unavailable"
          );


          cell.innerHTML = `

            <strong>
              Feriado
            </strong>

            <br>

            <small>
              Sem aula
            </small>

          `;


          cell.title =
            holiday.holiday_name;


          row.appendChild(
            cell
          );


          continue;
        }


        const pausePeriod =
          pausePeriods.find(
            period => {

              const startsOn =
                String(
                  period.starts_on
                );


              const endsOn =
                period.ends_on
                  ? String(
                      period.ends_on
                    )
                  : null;


              return (
                slotDateDb >= startsOn
                &&
                (
                  !endsOn
                  ||
                  slotDateDb <= endsOn
                )
              );

            }
          );


        const lessonHistory =
          lessonHistoryRecords.find(
            record => {

              if (
                String(
                  record.lesson_date
                ) !==
                slotDateDb
              ) {
                return false;
              }


              const recordStart =
                timeToMinutes(
                  record.start_time
                );

              const recordEnd =
                timeToMinutes(
                  record.end_time
                );

              const slotStart =
                timeToMinutes(
                  slot.start_time
                );

              const slotEnd =
                timeToMinutes(
                  slot.end_time
                );


              return (
                recordStart < slotEnd &&
                recordEnd > slotStart
              );

            }
          );


        const historyDisplay =
          lessonHistory
            ? getStudentAgendaHistoryDisplay(
                lessonHistory
              )
            : null;


        const ownMakeupReservation =
          makeupReservations.find(
            reservation => {

              const sameDate =
                String(
                  reservation.reservation_date
                ) ===
                slotDateDb;


              if (!sameDate) {
                return false;
              }


              const reservationStart =
                timeToMinutes(
                  reservation.start_time
                );

              const reservationEnd =
                timeToMinutes(
                  reservation.end_time
                );

              const slotStart =
                timeToMinutes(
                  slot.start_time
                );

              const slotEnd =
                timeToMinutes(
                  slot.end_time
                );


              return (
                reservationStart < slotEnd &&
                reservationEnd > slotStart
              );

            }
          );


        const baseStatus =
          normalizeStudentScheduleStatus(
            slot.status
          );


        const pausedOwnLesson =
          Boolean(
            pausePeriod
            &&
            baseStatus.className ===
              "own"
            &&
            !historyDisplay
            &&
            !ownMakeupReservation
          );


        const pausedOwnLessonReserved =
          Boolean(
            pausedOwnLesson
            &&
            pausePeriod.keep_slot_reserved !==
              false
          );


        const pausedOwnLessonReleased =
          Boolean(
            pausedOwnLesson
            &&
            pausePeriod.keep_slot_reserved ===
              false
          );


        const status =
          historyDisplay

            ? historyDisplay

            : ownMakeupReservation

              ? {
                  className:
                    "own-makeup",

                  label:
                    "Minha reposi\u00E7\u00E3o"
                }

              : pausedOwnLessonReserved

                ? {
                    className:
                      "paused-own",

                    label:
                      "Aulas pausadas"
                  }

                : pausedOwnLessonReleased

                  ? {
                      className:
                        "available",

                      label:
                        "Livre"
                    }

                  : baseStatus;


        cell.classList.add(
          status.className
        );

        cell.textContent =
          status.label;


        // =============================================
        // HISTORICO DA AULA
        // =============================================

        if (
          historyDisplay &&
          lessonHistory
        ) {

          cell.style.backgroundColor =
            historyDisplay.background;

          cell.style.color =
            historyDisplay.color;

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "pointer";

          cell.innerHTML = `

            <strong>
              ${escapeHtml(
                historyDisplay.label
              )}
            </strong>

            <br>

            <small>
              Ver registro / comentar
            </small>

          `;

          cell.title =
            "Clique para ver o registro e comentar diretamente pela agenda.";


          cell.addEventListener(
            "click",
            () => {

              openStudentAgendaLessonHistory(
                lessonHistory
              );

            }
          );

        }


        // =============================================
        // AULAS PAUSADAS
        // =============================================

        else if (
          status.className ===
          "paused-own"
        ) {

          cell.style.backgroundColor =
            "#e5e5e5";

          cell.style.color =
            "#555555";

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "default";

          cell.innerHTML = `

            <strong>
              Aulas pausadas
            </strong>

            <br>

            <small>
              Horario reservado
            </small>

          `;

          cell.title =
            "As aulas deste aluno estao pausadas. O horario fixo continua reservado.";

        }


        // =============================================
        // MINHA REPOSI\u00C7\u00C3O
        // =============================================

        else if (
          status.className ===
          "own-makeup"
        ) {

          cell.style.backgroundColor =
            "#f5e8c8";

          cell.style.color =
            "#a9573a";

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "pointer";

          cell.innerHTML = `

            <strong>
              Minha reposicao
            </strong>

            <br>

            <small>
              Ver detalhes
            </small>

          `;

          cell.title =
            "Clique para ver os detalhes da sua reposicao.";


          cell.addEventListener(
            "click",
            () => {

              openStudentMakeupFromAgenda(
                ownMakeupReservation
              );

            }
          );

        }


        // =============================================
        // MINHA AULA
        // =============================================

        else if (
          status.className ===
          "own"
        ) {

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "pointer";

          cell.innerHTML = `

            <strong>
              Minha aula
            </strong>

            <br>

            <small>
              Abrir / comentar
            </small>

          `;


          cell.title =
            "Clique para abrir a aula, comentar ou cancelar.";


          cell.addEventListener(
            "click",
            () => {

              openStudentAgendaOwnLesson(
                slot,
                slotDate
              );

            }
          );

        }


        // =============================================
        // HOR\u00C1RIO LIVRE
        // =============================================

        else if (
          status.className ===
          "available"
        ) {

          if (
            pausedOwnLessonReleased
          ) {

            cell.innerHTML = `

              <strong>
                Livre
              </strong>

              <br>

              <small>
                Horario liberado durante a pausa
              </small>

            `;

          }


          if (
            !canBookMakeupOnDate(
              slotDate
            )
          ) {

            cell.textContent =
              "Prazo encerrado";

            cell.style.cursor =
              "not-allowed";

            cell.style.opacity =
              "0.55";

            cell.style.backgroundColor =
              "#eeeeee";

            cell.style.color =
              "#777777";

            cell.title =
              "Reposi\u00E7\u00F5es precisam ser marcadas at\u00E9 o dia anterior.";

          }

          else {

            cell.style.cursor =
              "pointer";

            cell.title =
              "Clique para escolher uma reposi\u00E7\u00E3o.";

            cell.addEventListener(
              "click",
              () => {

                openMakeupSelection(
                  slot
                );

              }
            );

          }

        }

      }


      row.appendChild(
        cell
      );

    }


    body.appendChild(
      row
    );

  });


  if (times.length === 0) {

    body.innerHTML = `
      <tr>
        <td colspan="8">
          Nenhum hor\u00E1rio cadastrado.
        </td>
      </tr>
    `;

  }

}


// =====================================================
// ENCONTRAR HOR\xc1RIO
// =====================================================
// HISTORICO DA AULA NA AGENDA DO ALUNO
// =====================================================

function getStudentAgendaHistoryDisplay(
  record
) {

  const attendance =
    String(
      record.attendance_status ||
      ""
    ).toLowerCase();


  if (
    record.lesson_status ===
    "cancelled"
  ) {

    return {
      className:
        "student-history",
      label:
        "Aula cancelada",
      background:
        "#fff3cd",
      color:
        "#856404"
    };

  }


  switch (
    attendance
  ) {

    case "present":

      return {
        className:
          "student-history",
        label:
          "\u2705 Presente",
        background:
          "#f7e9e1",
        color:
          "#a9573a"
      };


    case "absent":

      return {
        className:
          "student-history",
        label:
          "\u274C Falta sem justificativa",
        background:
          "#f8d7da",
        color:
          "#842029"
      };


    case "justified_absence":

      return {
        className:
          "student-history",
        label:
          "\u26A0\uFE0F Falta justificada",
        background:
          "#fff3cd",
        color:
          "#856404"
      };


    case "makeup":

      return {
        className:
          "student-history",
        label:
          "\uD83D\uDD04 Reposicao realizada",
        background:
          "#f5e8c8",
        color:
          "#a9573a"
      };


    default:

      if (
        record.lesson_status ===
        "completed"
      ) {

        return {
          className:
            "student-history",
          label:
            "Aula realizada",
          background:
            "#f7e9e1",
          color:
            "#a9573a"
        };

      }


      return null;

  }

}


async function openStudentAgendaLessonHistory(
  record
) {

  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (!area) {
    return;
  }


  const attendance =
    record.attendance_status
      ? formatAttendanceStatus(
          record.attendance_status
        )
      : (
          record.lesson_status ===
          "cancelled"
            ? "Aula cancelada"
            : "Nao registrado"
        );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >
      Carregando registro da aula...
    </div>

  `;


  const {
    data: commentsData,
    error: commentsError
  } =
    await supabaseClient.rpc(
      "get_my_lesson_comments_v3",
      {
        p_lesson_ids:
          [
            record.lesson_id
          ]
      }
    );


  const comments =
    commentsError
      ? []
      : (
          commentsData || []
        );


  if (commentsError) {

    console.warn(
      "Nao foi possivel carregar os comentarios desta aula:",
      commentsError
    );

  }


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >

      <h3>
        Registro da aula
      </h3>


      <p>
        <strong>Data:</strong>

        ${formatDate(
          new Date(
            record.lesson_date +
            "T12:00:00"
          )
        )}
      </p>


      <p>
        <strong>Horario:</strong>

        ${normalizeTime(
          record.start_time
        )}

        as

        ${normalizeTime(
          record.end_time
        )}
      </p>


      <p>
        <strong>Presenca:</strong>

        ${escapeHtml(
          attendance
        )}
      </p>


      <p>
        <strong>Materia:</strong>

        ${escapeHtml(
          record.subject_name ||
          "Nao informada"
        )}
      </p>


      <p>
        <strong>Conteudo:</strong>

        ${escapeHtml(
          record.content_title ||
          "Nao informado"
        )}
      </p>


      <div
        style="
          margin-top:15px;
          padding:15px;
          background:#f7f7f7;
          border-radius:8px;
        "
      >

        <strong>
          Observacoes do professor
        </strong>


        <p
          style="
            white-space:pre-wrap;
            margin-bottom:0;
          "
        >
          ${escapeHtml(
            record.teacher_notes ||
            "Nenhuma observacao registrada."
          )}
        </p>

      </div>


      <div
        style="
          margin-top:15px;
          padding:15px;
          background:#fffaf3;
          border-radius:8px;
          border:1px solid #e7dfd5;
        "
      >

        <strong>
          Meus comentarios
        </strong>


        <div
          style="
            display:grid;
            gap:7px;
            margin-top:10px;
          "
        >

          ${
            comments.length ===
              0

              ? `

                <div
                  style="
                    color:#666;
                    font-size:13px;
                  "
                >
                  Voce ainda nao comentou esta aula.
                </div>

              `

              : comments
                  .map(
                    comment => `

                      <div
                        style="
                          padding:9px 10px;
                          border-radius:7px;
                          background:#ffffff;
                        "
                      >

                        <div
                          style="
                            white-space:pre-wrap;
                          "
                        >
                          ${escapeHtml(
                            comment.comment
                          )}
                        </div>


                        <div
                          style="
                            margin-top:4px;
                            color:#777;
                            font-size:11px;
                          "
                        >
                          ${escapeHtml(
                            formatDateTime(
                              comment.created_at
                            )
                          )}
                        </div>

                      </div>

                    `
                  )
                  .join("")
          }

        </div>


        <textarea
          id="agendaLessonCommentInput"
          maxlength="4000"
          rows="3"
          placeholder="Escreva um comentario para o professor..."
          style="
            width:100%;
            box-sizing:border-box;
            margin-top:12px;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
          "
        ></textarea>


        <div
          style="
            display:flex;
            gap:8px;
            align-items:center;
            flex-wrap:wrap;
            margin-top:9px;
          "
        >

          <button
            type="button"
            class="action-button"
            id="agendaAddLessonCommentButton"
          >
            Adicionar comentario
          </button>


          <span
            id="agendaLessonCommentMessage"
            style="
              font-size:13px;
            "
          ></span>

        </div>

      </div>


      <button
        type="button"
        class="secondary-button"
        id="closeStudentAgendaHistoryButton"
        style="
          margin-top:15px;
        "
      >
        Fechar
      </button>

    </div>

  `;


  const commentButton =
    document.getElementById(
      "agendaAddLessonCommentButton"
    );


  if (commentButton) {

    commentButton.addEventListener(
      "click",
      async () => {

        const input =
          document.getElementById(
            "agendaLessonCommentInput"
          );


        const message =
          document.getElementById(
            "agendaLessonCommentMessage"
          );


        const comment =
          input
            ? input.value.trim()
            : "";


        if (!comment) {

          if (message) {

            message.textContent =
              "Escreva um comentario antes de enviar.";

            message.style.color =
              "red";

          }


          return;
        }


        commentButton.disabled =
          true;

        commentButton.textContent =
          "Salvando...";


        const {
          error
        } =
          await supabaseClient.rpc(
            "add_my_lesson_comment_v3",
            {
              p_lesson_id:
                record.lesson_id,

              p_comment:
                comment
            }
          );


        commentButton.disabled =
          false;

        commentButton.textContent =
          "Adicionar comentario";


        if (error) {

          console.error(
            "Erro ao comentar pela agenda:",
            error
          );


          if (message) {

            message.textContent =
              error.message ||
              "Nao foi possivel adicionar o comentario.";

            message.style.color =
              "red";

          }


          return;
        }


        await openStudentAgendaLessonHistory(
          record
        );

      }
    );

  }


  const closeButton =
    document.getElementById(
      "closeStudentAgendaHistoryButton"
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

}


// =====================================================

// =====================================================

function findScheduleSlot(
  schedule,
  day,
  time
) {

  return schedule.find(
    slot =>

      Number(
        slot.day_of_week
      ) === day &&

      normalizeTime(
        slot.start_time
      ) === time
  );
}


// =====================================================
// STATUS DA AGENDA
// =====================================================

function normalizeStudentScheduleStatus(
  status
) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "free":
    case "available":

      return {
        className: "available",
        label: "Livre"
      };


    case "occupied":

      return {
        className: "occupied",
        label: "Ocupado"
      };


    case "unavailable":

      return {
        className: "unavailable",
        label: "Indispon\xedvel"
      };


    case "own_makeup":
    case "my_makeup":

      return {
        className: "own-makeup",
        label: "Minha reposi\xe7\xe3o"
      };


    case "own_lesson":
    case "my_lesson":
    case "own":

      return {
        className: "own",
        label: "Minha aula"
      };


    default:

      return {
        className: "occupied",
        label: "Ocupado"
      };

  }
}


async function openStudentAgendaOwnLesson(
  slot,
  slotDate
) {

  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (!area) {
    return;
  }


  const lessonDateDb =
    formatDateForDatabase(
      slotDate
    );


  area.innerHTML = `

    <div class="card">
      Carregando aula...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_or_create_my_lesson_for_slot",
      {
        p_lesson_date:
          lessonDateDb,

        p_slot_start:
          normalizeTime(
            slot.start_time
          )
      }
    );


  if (error) {

    console.error(
      "Erro ao abrir aula pela agenda:",
      error
    );


    area.innerHTML = `

      <div class="card">

        <p
          style="
            color:#b3261e;
          "
        >
          ${escapeHtml(
            error.message ||
            "Nao foi possivel abrir esta aula."
          )}
        </p>


        <button
          type="button"
          class="secondary-button"
          id="closeStudentOwnLessonErrorButton"
        >
          Voltar
        </button>

      </div>

    `;


    const closeErrorButton =
      document.getElementById(
        "closeStudentOwnLessonErrorButton"
      );


    if (closeErrorButton) {

      closeErrorButton.onclick =
        () => {

          area.innerHTML =
            "";

        };

    }


    return;
  }


  const lesson =
    Array.isArray(
      data
    )
      ? data[0]
      : data;


  if (
    !lesson ||
    !lesson.lesson_id
  ) {

    area.innerHTML = `

      <div class="card">
        <p>
          Nao foi possivel identificar esta aula.
        </p>
      </div>

    `;


    return;
  }


  const {
    data: commentsData,
    error: commentsError
  } =
    await supabaseClient.rpc(
      "get_my_lesson_comments_v3",
      {
        p_lesson_ids:
          [
            lesson.lesson_id
          ]
      }
    );


  if (commentsError) {

    console.warn(
      "Erro ao carregar comentarios da aula:",
      commentsError
    );

  }


  const comments =
    commentsError
      ? []
      : (
          commentsData || []
        );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >

      <h3>
        Minha aula
      </h3>


      <p>
        <strong>Data:</strong>

        ${formatDate(
          new Date(
            lesson.lesson_date +
            "T12:00:00"
          )
        )}
      </p>


      <p>
        <strong>Horario:</strong>

        ${normalizeTime(
          lesson.start_time
        )}

        as

        ${normalizeTime(
          lesson.end_time
        )}
      </p>


      <div
        style="
          margin-top:15px;
          padding:15px;
          border-radius:8px;
          background:#fffaf3;
          border:1px solid #e7dfd5;
        "
      >

        <strong>
          Comentarios para o professor
        </strong>


        <div
          style="
            display:grid;
            gap:7px;
            margin-top:10px;
          "
        >

          ${
            comments.length ===
              0

              ? `

                <div
                  style="
                    color:#666;
                    font-size:13px;
                  "
                >
                  Voce ainda nao comentou esta aula.
                </div>

              `

              : comments
                  .map(
                    comment => `

                      <div
                        style="
                          padding:9px 10px;
                          border-radius:7px;
                          background:#ffffff;
                        "
                      >

                        <div
                          style="
                            white-space:pre-wrap;
                          "
                        >
                          ${escapeHtml(
                            comment.comment
                          )}
                        </div>


                        <div
                          style="
                            margin-top:4px;
                            color:#777;
                            font-size:11px;
                          "
                        >
                          ${escapeHtml(
                            formatDateTime(
                              comment.created_at
                            )
                          )}
                        </div>

                      </div>

                    `
                  )
                  .join("")
          }

        </div>


        <textarea
          id="studentOwnLessonCommentInput"
          maxlength="4000"
          rows="3"
          placeholder="Escreva um comentario para o professor..."
          style="
            width:100%;
            box-sizing:border-box;
            margin-top:12px;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
          "
        ></textarea>


        <div
          style="
            display:flex;
            gap:8px;
            align-items:center;
            flex-wrap:wrap;
            margin-top:9px;
          "
        >

          <button
            type="button"
            class="action-button"
            id="studentOwnLessonAddCommentButton"
          >
            Adicionar comentario
          </button>


          <span
            id="studentOwnLessonCommentMessage"
            style="
              font-size:13px;
            "
          ></span>

        </div>

      </div>


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:15px;
        "
      >

        <button
          type="button"
          class="secondary-button"
          id="studentOwnLessonCancellationButton"
        >
          Cancelar / adiar aula
        </button>


        <button
          type="button"
          class="secondary-button"
          id="studentOwnLessonCloseButton"
        >
          Voltar
        </button>

      </div>

    </div>

  `;


  const addCommentButton =
    document.getElementById(
      "studentOwnLessonAddCommentButton"
    );


  if (addCommentButton) {

    addCommentButton.addEventListener(
      "click",
      async () => {

        const input =
          document.getElementById(
            "studentOwnLessonCommentInput"
          );


        const message =
          document.getElementById(
            "studentOwnLessonCommentMessage"
          );


        const comment =
          input
            ? input.value.trim()
            : "";


        if (!comment) {

          if (message) {

            message.textContent =
              "Escreva um comentario antes de enviar.";

            message.style.color =
              "red";

          }


          return;
        }


        addCommentButton.disabled =
          true;

        addCommentButton.textContent =
          "Salvando...";


        const {
          error: saveError
        } =
          await supabaseClient.rpc(
            "add_my_lesson_comment_v3",
            {
              p_lesson_id:
                lesson.lesson_id,

              p_comment:
                comment
            }
          );


        addCommentButton.disabled =
          false;

        addCommentButton.textContent =
          "Adicionar comentario";


        if (saveError) {

          console.error(
            "Erro ao comentar pela agenda:",
            saveError
          );


          if (message) {

            message.textContent =
              saveError.message ||
              "Nao foi possivel adicionar o comentario.";

            message.style.color =
              "red";

          }


          return;
        }


        await openStudentAgendaOwnLesson(
          slot,
          slotDate
        );

      }
    );

  }


  const cancellationButton =
    document.getElementById(
      "studentOwnLessonCancellationButton"
    );


  if (cancellationButton) {

    cancellationButton.addEventListener(
      "click",
      () => {

        openLessonCancellation(
          slot,
          slotDate
        );

      }
    );

  }


  const closeButton =
    document.getElementById(
      "studentOwnLessonCloseButton"
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

}


// =====================================================
// CANCELAR / ADIAR AULA
// =====================================================

async function openLessonCancellation(
  slot,
  slotDate
) {

  const lessonDateDb =
    formatDateForDatabase(
      slotDate
    );


  // ===================================================
  // IDENTIFICAR A AULA
  // ===================================================

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_or_create_my_lesson_for_slot",
      {
        p_lesson_date:
          lessonDateDb,

        p_slot_start:
          normalizeTime(
            slot.start_time
          )
      }
    );


  if (error) {

    console.error(
      "Erro ao identificar aula:",
      error
    );

    alert(
      error.message ||
      "N\u00E3o foi poss\u00EDvel identificar esta aula."
    );

    return;
  }


  const lesson =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!lesson) {

    alert(
      "N\u00E3o foi poss\u00EDvel identificar esta aula."
    );

    return;
  }


  // ===================================================
  // DATA/HORA DA AULA
  // ===================================================

  const lessonDateTime =
    new Date(
      lesson.lesson_date +
      "T" +
      normalizeTime(
        lesson.start_time
      ) +
      ":00"
    );


  const now =
    new Date();


  // ===================================================
  // AULA J\u00C1 COME\u00C7OU
  // ===================================================

  if (
    lessonDateTime <= now
  ) {

    alert(
      "Essa aula j\u00E1 come\u00E7ou ou j\u00E1 ocorreu e n\u00E3o pode mais ser cancelada."
    );

    return;
  }


  // ===================================================
  // ANTECED\u00CANCIA
  // ===================================================

  await loadStudentTeacherRescheduleRules();


  const minimumHours =
    Number(
      currentStudentTeacherRescheduleRules
        .lesson_reschedule_notice_hours ||
      2
    );


  const hoursUntilLesson =
    (
      lessonDateTime.getTime()
      - now.getTime()
    )
    /
    (
      1000 *
      60 *
      60
    );


  const lateCancellation =
    hoursUntilLesson <
    minimumHours;


  // ===================================================
  // \u00C1REA DO FORMUL\u00C1RIO
  // ===================================================

  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (!area) {
    return;
  }


  const warningText =
    lateCancellation

      ? `
        <div
          style="
            margin-top:15px;
            padding:15px;
            border-radius:8px;
            background:#fff3cd;
          "
        >
          <strong>Aten\u00E7\u00E3o:</strong>
          faltam menos de ${minimumHours} horas
          para esta aula.

          <br><br>

          Se voc\u00EA cancelar agora,
          <strong>
            esta aula n\u00E3o poder\u00E1 ser reposta depois.
          </strong>
        </div>
      `

      : `
        <div
          style="
            margin-top:15px;
            padding:15px;
            border-radius:8px;
            background:#f7e9e1;
          "
        >
          Como o cancelamento est\u00E1 sendo feito
          com anteced\u00EAncia, uma reposi\u00E7\u00E3o ser\u00E1
          liberada para voc\u00EA.
        </div>
      `;


  // ===================================================
  // FORMUL\u00C1RIO
  // ===================================================

  area.innerHTML = `

    <div class="card">

      <h3>
        ${
          lateCancellation
            ? "Cancelar aula"
            : "Cancelar / adiar aula"
        }
      </h3>


      <p>
        <strong>Data:</strong>

        ${formatDate(
          new Date(
            lesson.lesson_date +
            "T12:00:00"
          )
        )}
      </p>


      <p>
        <strong>Hor\u00E1rio:</strong>

        ${normalizeTime(
          lesson.start_time
        )}

        \u00E0s

        ${normalizeTime(
          lesson.end_time
        )}
      </p>


      ${warningText}


      <div
        style="
          margin-top:20px;
        "
      >

        <label
          for="lessonCancellationMessage"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Mensagem para o professor

          <span
            style="
              font-weight:normal;
              color:#666;
            "
          >
            (opcional)
          </span>
        </label>


        <textarea
          id="lessonCancellationMessage"
          maxlength="1000"
          rows="4"
          placeholder="Ex.: Professor, surgiu um compromisso e n\u00E3o vou conseguir participar da aula..."
          style="
            width:100%;
            box-sizing:border-box;
            padding:12px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
            font-size:15px;
          "
        ></textarea>


        <div
          id="lessonCancellationCounter"
          style="
            margin-top:5px;
            text-align:right;
            font-size:12px;
            color:#666;
          "
        >
          0 / 1000
        </div>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          margin-top:20px;
          flex-wrap:wrap;
        "
      >

        <button
          type="button"
          class="action-button"
          id="confirmLessonCancellationButton"
        >
          Confirmar cancelamento
        </button>


        <button
          type="button"
          class="secondary-button"
          id="closeLessonCancellationButton"
        >
          Voltar
        </button>

      </div>


      <p
        id="lessonCancellationMessageResult"
        style="margin-top:12px;"
      ></p>

    </div>

  `;


  // ===================================================
  // CONTADOR DE CARACTERES
  // ===================================================

  const messageInput =
    document.getElementById(
      "lessonCancellationMessage"
    );


  const counter =
    document.getElementById(
      "lessonCancellationCounter"
    );


  if (
    messageInput &&
    counter
  ) {

    messageInput.addEventListener(
      "input",
      () => {

        counter.textContent =
          messageInput.value.length +
          " / 1000";

      }
    );

  }


  // ===================================================
  // CONFIRMAR
  // ===================================================

  const confirmButton =
    document.getElementById(
      "confirmLessonCancellationButton"
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      () => {

        confirmLessonCancellation(
          slot,
          lessonDateDb,
          lateCancellation
        );

      }
    );

  }


  // ===================================================
  // VOLTAR
  // ===================================================

  const closeButton =
    document.getElementById(
      "closeLessonCancellationButton"
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

}


// =====================================================
// CONFIRMAR CANCELAMENTO / ADIAMENTO
// =====================================================

async function confirmLessonCancellation(
  slot,
  lessonDateDb,
  lateCancellation
) {

  const input =
    document.getElementById(
      "lessonCancellationMessage"
    );


  const button =
    document.getElementById(
      "confirmLessonCancellationButton"
    );


  const resultMessage =
    document.getElementById(
      "lessonCancellationMessageResult"
    );


  const studentMessage =
    input
      ? input.value.trim()
      : "";


  // ===================================================
  // CONFIRMA\u00C7\u00C3O FINAL
  // ===================================================

  const confirmationMessage =
    lateCancellation

      ? (
          "Tem certeza que deseja cancelar esta aula?\n\n" +
          "Essa aula n\u00E3o poder\u00E1 ser reposta depois."
        )

      : (
          "Tem certeza que deseja cancelar esta aula?\n\n" +
          "Uma reposi\u00E7\u00E3o ser\u00E1 liberada para voc\u00EA."
        );


  const confirmed =
    window.confirm(
      confirmationMessage
    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Cancelando...";

  }


  // ===================================================
  // CANCELAR + SALVAR MENSAGEM
  // ===================================================

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "cancel_lesson_by_student_with_rules",
      {
        p_lesson_date:
          lessonDateDb,

        p_slot_start:
          normalizeTime(
            slot.start_time
          ),

        p_student_message:
          studentMessage ||
          null
      }
    );


  if (error) {

    console.error(
      "Erro ao cancelar aula:",
      error
    );


    if (resultMessage) {

      resultMessage.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel cancelar a aula.";

      resultMessage.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Confirmar cancelamento";

    }


    return;
  }


  // ===================================================
  // RESULTADO
  // ===================================================

  if (
    data ===
    "cancelled_with_makeup"
  ) {

    alert(
      "Aula cancelada com sucesso.\n\n" +
      "Uma reposi\u00E7\u00E3o foi liberada para voc\u00EA." +
      (
        studentMessage
          ? "\n\nSua mensagem foi enviada ao professor."
          : ""
      )
    );

  }


  else if (
    data ===
    "cancelled_without_makeup"
  ) {

    alert(
      "Aula cancelada.\n\n" +
      "Como o cancelamento foi feito sem a anteced\u00EAncia m\u00EDnima, " +
      "esta aula n\u00E3o poder\u00E1 ser reposta." +
      (
        studentMessage
          ? "\n\nSua mensagem foi enviada ao professor."
          : ""
      )
    );

  }


  else {

    alert(
      "Aula cancelada com sucesso." +
      (
        studentMessage
          ? "\n\nSua mensagem foi enviada ao professor."
          : ""
      )
    );

  }


  // ===================================================
  // FECHAR FORMUL\u00C1RIO
  // ===================================================

  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  // ===================================================
  // ATUALIZAR AGENDA
  // ===================================================

  await loadStudentWeeklySchedule();

}


// =====================================================
// SELECIONAR REPOSI\xc7\xc3O
// =====================================================

async function openMakeupSelection(
  slot
) {

  selectedScheduleSlot =
    slot;


  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (!area) {
    return;
  }


  const reservationDate =
    getDateForDay(
      selectedWeekStart,
      Number(
        slot.day_of_week
      )
    );


  if (
    !canBookMakeupOnDate(
      reservationDate
    )
  ) {

    alert(
      "As reposi\u00E7\u00F5es precisam ser marcadas at\u00E9 o dia anterior \u00E0 aula."
    );

    return;
  }


  const makeups =
    await getAvailableMakeups();


  const compatibleMakeups =
    getCompatibleMakeups(
      slot,
      makeups
    );


  if (
    compatibleMakeups.length === 0
  ) {

    area.innerHTML = `

      <div class="card">

        <h3>
          Nenhuma reposi\xe7\xe3o compat\xedvel
        </h3>

        <p>
          Voc\xea n\xe3o possui uma reposi\xe7\xe3o
          compat\xedvel com este hor\xe1rio.
        </p>

        <button
          type="button"
          class="secondary-button"
          id="closeMakeupButton"
        >
          Fechar
        </button>

      </div>

    `;


    document
      .getElementById(
        "closeMakeupButton"
      )
      .addEventListener(
        "click",
        closeMakeupSelection
      );


    return;
  }


  area.innerHTML = `

    <div class="card">

      <h3>
        Escolher reposi\xe7\xe3o
      </h3>

      <p>

        ${formatDay(
          slot.day_of_week
        )}

        \u2014 ${formatDate(
          reservationDate
        )}

        \xe0s

        ${normalizeTime(
          slot.start_time
        )}

      </p>


      <label>
        Reposi\xe7\xe3o:
      </label>


      <select
        id="makeupSelect"
        style="
          width:100%;
          padding:10px;
          margin-top:8px;
          border-radius:7px;
        "
      >

        <option value="">
          Selecione uma reposi\xe7\xe3o
        </option>

        ${compatibleMakeups
          .map(
            makeup => `

              <option
                value="${makeup.makeup_id || makeup.id}"
              >

                ${makeup.duration_minutes}
                minutos \u2014
                ${formatMakeupSource(
                  makeup.source
                )}

              </option>

            `
          )
          .join("")}

      </select>


      <div
        style="
          display:flex;
          gap:10px;
          margin-top:18px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="continueMakeupButton"
        >
          Continuar
        </button>

        <button
          type="button"
          class="secondary-button"
          id="cancelMakeupButton"
        >
          Cancelar
        </button>

      </div>

    </div>

  `;


  document
    .getElementById(
      "continueMakeupButton"
    )
    .addEventListener(
      "click",
      prepareMakeupReservation
    );


  document
    .getElementById(
      "cancelMakeupButton"
    )
    .addEventListener(
      "click",
      closeMakeupSelection
    );
}


// =====================================================
// REPOSI\xc7\xd5ES DISPON\xcdVEIS
// =====================================================

async function getAvailableMakeups() {

  if (!currentStudentId) {
    await loadCurrentStudentId();
  }

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_makeups"
    );


  if (error) {

    console.error(
      "Erro ao carregar reposi\xe7\xf5es:",
      error
    );

    return [];
  }


  return (
    data || []
  ).filter(
    makeup =>
      String(
        makeup.status
      ).toLowerCase() ===
      "available"
  );
}


// =====================================================
// REPOSI\xc7\xd5ES COMPAT\xcdVEIS
// =====================================================

function getCompatibleMakeups(
  slot,
  makeups
) {

  const result = [];


  for (
    const makeup of makeups
  ) {

    const duration =
      Number(
        makeup.duration_minutes
      );


    if (
      duration === 30
    ) {

      result.push(
        makeup
      );

      continue;
    }


    if (
      duration === 60
    ) {

      const nextSlot =
        findNextFreeSlot(
          slot
        );


      if (nextSlot) {

        result.push(
          makeup
        );

      }

    }

  }


  return result;
}


// =====================================================
// HOR\xc1RIO SEGUINTE
// =====================================================

function findNextFreeSlot(
  slot
) {

  const currentStart =
    timeToMinutes(
      slot.start_time
    );


  const nextTime =
    minutesToTime(
      currentStart + 30
    );


  const nextSlot =
    findScheduleSlot(
      currentStudentSchedule,
      Number(
        slot.day_of_week
      ),
      nextTime
    );


  if (!nextSlot) {
    return null;
  }


  const status =
    normalizeStudentScheduleStatus(
      nextSlot.status
    );


  if (
    status.className !==
    "available"
  ) {

    return null;

  }


  return nextSlot;
}


// =====================================================
// PREPARAR RESERVA
// =====================================================

function prepareMakeupReservation() {

  const select =
    document.getElementById(
      "makeupSelect"
    );


  if (!select) {
    return;
  }


  const makeupId =
    select.value;


  if (!makeupId) {

    alert(
      "Selecione uma reposi\xe7\xe3o."
    );

    return;
  }


  const reservationDate =
    getDateForDay(
      selectedWeekStart,
      Number(
        selectedScheduleSlot.day_of_week
      )
    );


  const makeup =
    select.options[
      select.selectedIndex
    ].textContent.trim();


  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  area.innerHTML = `

    <div class="card">

      <h3>
        Confirmar reserva
      </h3>

      <p>
        <strong>Data:</strong>
        ${formatDate(
          reservationDate
        )}
      </p>

      <p>
        <strong>Hor\xe1rio:</strong>
        ${normalizeTime(
          selectedScheduleSlot.start_time
        )}
      </p>

      <p>
        <strong>Reposi\xe7\xe3o:</strong>
        ${escapeHtml(makeup)}
      </p>

      <button
        type="button"
        class="action-button"
        id="confirmReservationButton"
      >
        Confirmar reserva
      </button>

      <button
        type="button"
        class="secondary-button"
        id="backMakeupButton"
      >
        Voltar
      </button>

      <p
        id="reservationMessage"
        style="margin-top:15px;"
      ></p>

    </div>

  `;


  document
    .getElementById(
      "confirmReservationButton"
    )
    .addEventListener(
      "click",
      () => {

        confirmRealReservation(
          makeupId,
          reservationDate,
          selectedScheduleSlot.start_time
        );

      }
    );


  document
    .getElementById(
      "backMakeupButton"
    )
    .addEventListener(
      "click",
      () => {

        openMakeupSelection(
          selectedScheduleSlot
        );

      }
    );
}


// =====================================================
// RESERVAR REPOSI\xc7\xc3O
// =====================================================

async function confirmRealReservation(
  makeupId,
  reservationDate,
  startTime
) {

  const button =
    document.getElementById(
      "confirmReservationButton"
    );


  const message =
    document.getElementById(
      "reservationMessage"
    );


  if (!button || !message) {
    return;
  }


  button.disabled = true;

  button.textContent =
    "Reservando...";


  const {
    error
  } =
    await supabaseClient.rpc(
      "reserve_makeup_with_teacher_rules",
      {
        p_makeup_id:
          makeupId,

        p_reservation_date:
          formatDateForDatabase(
            reservationDate
          ),

        p_start_time:
          normalizeTime(
            startTime
          )
      }
    );


  if (error) {

    console.error(
      "Erro na reserva:",
      error
    );


    button.disabled = false;

    button.textContent =
      "Confirmar reserva";


    message.textContent =
      error.message ||
      "N\xe3o foi poss\xedvel realizar a reserva.";

    message.style.color =
      "red";


    return;
  }


  message.innerHTML = `
    <strong>
      Reserva realizada com sucesso!
    </strong>
    <br>
    ${formatDate(
      reservationDate
    )}
    \xe0s
    ${normalizeTime(
      startTime
    )}
  `;


  message.style.color =
    "green";


  button.remove();


  await loadStudentWeeklySchedule();


  await new Promise(
    resolve =>
      setTimeout(
        resolve,
        800
      )
  );


  closeMakeupSelection();
}


// =====================================================
// FECHAR RESERVA
// =====================================================

function closeMakeupSelection() {

  selectedScheduleSlot =
    null;


  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  if (area) {

    area.innerHTML = "";

  }
}


// =====================================================
// NAVEGA\xc7\xc3O DO PROFESSOR
// =====================================================

function setTeacherPage(page) {

  const content =
    document.getElementById(
      "teacherContent"
    );


  if (!content) {
    return;
  }


  document
    .querySelectorAll(
      "[data-teacher-page]"
    )
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.teacherPage === page
      );

    });

  if (page === "tools") {
    setTeacherPage("profile");
    return;
  }


  if (page === "support") {

    content.innerHTML = `
      <div class="card">
        <h3>Suporte</h3>
        <p>Envie uma duvida aos administradores e acompanhe as respostas.</p>
        <div id="teacherSupportArea">Carregando suporte...</div>
      </div>
    `;

    loadTeacherSupportArea();
    return;
  }


  // ===================================================
  // PERFIL DO PROFESSOR
  // ===================================================

  if (page === "profile") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Perfil do professor
        </h3>


        <p>
          Configure seus dados, horario de atendimento
          e regras de remarcacao. As regras definidas aqui
          valem para todos os seus alunos.
        </p>


        <div
          id="teacherProfileFormArea"
          style="
            margin-top:18px;
          "
        >
          Carregando perfil...
        </div>

      </div>

      <div id="teacherProfileToolsV5"></div>

    `;


    loadTeacherProfilePage();

    renderTeacherToolsPageV3(
      document.getElementById("teacherProfileToolsV5")
    );

    return;
  }


  // ===================================================
  // MATERIAIS DO PROFESSOR
  // ===================================================

  if (page === "materials") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Materiais dos alunos
        </h3>


        <p>
          Cadastre links de materias, exercicios, PDFs,
          videos, sites ou outros materiais.
        </p>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
            gap:12px;
            margin-top:16px;
          "
        >

          <div>

            <label
              for="teacherMaterialStudent"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Aluno
            </label>


            <select
              id="teacherMaterialStudent"
              style="
                width:100%;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >
              <option value="">
                Selecione o aluno
              </option>
            </select>

          </div>


          <div>

            <label
              for="teacherMaterialTitle"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Titulo
            </label>


            <input
              type="text"
              id="teacherMaterialTitle"
              placeholder="Ex.: Lista de exercicios - Present Perfect"
              style="
                width:100%;
                box-sizing:border-box;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

          </div>

        </div>


        <div
          style="
            margin-top:12px;
          "
        >

          <label
            for="teacherMaterialUrl"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Link
          </label>


          <input
            type="url"
            id="teacherMaterialUrl"
            placeholder="https://..."
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

        </div>


        <div
          style="
            margin-top:12px;
          "
        >

          <label
            for="teacherMaterialDescription"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Descricao / orientacao
          </label>


          <textarea
            id="teacherMaterialDescription"
            rows="3"
            placeholder="Opcional"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
              resize:vertical;
              font-family:inherit;
            "
          ></textarea>

        </div>


        <button
          type="button"
          class="action-button"
          id="saveTeacherMaterialButton"
          style="
            margin-top:14px;
          "
        >
          Adicionar material
        </button>


        <p
          id="teacherMaterialMessage"
          style="
            margin-top:10px;
          "
        ></p>


        <div
          id="teacherMaterialsList"
          style="
            margin-top:20px;
          "
        >
          Carregando materiais...
        </div>

      </div>

    `;


    loadTeacherMaterialsPage();

    return;
  }


  // ===================================================
  // REGRAS DO PROFESSOR
  // ===================================================

  if (page === "rules") {

    content.innerHTML = `

      <div class="card">

        <h3>Regras</h3>

        <p>
          Defina as regras que ser\xe3o
          visualizadas pelos seus alunos.
        </p>

        <textarea
          id="teacherRulesInput"
          rows="12"
          placeholder="Digite aqui as regras..."
          style="
            width:100%;
            box-sizing:border-box;
            padding:15px;
            margin-top:15px;
            border:1px solid #ccc;
            border-radius:10px;
            resize:vertical;
            font-family:inherit;
            font-size:16px;
            line-height:1.5;
          "
        ></textarea>


        <div
          style="
            margin-top:16px;
            padding:14px;
            border:1px solid #ddd;
            border-radius:10px;
          "
        >

          <strong>
            Imagem das regras
          </strong>


          <p
            style="
              margin:5px 0 10px;
              color:#666;
              font-size:13px;
            "
          >
            JPG, PNG, WEBP ou GIF. Maximo de 5 MB.
          </p>


          <input
            type="file"
            id="teacherRulesImageInput"
            accept="image/jpeg,image/png,image/webp,image/gif"
          >


          <div
            id="teacherRulesImagePreview"
            style="
              margin-top:12px;
            "
          ></div>

        </div>


        <button
          type="button"
          class="action-button"
          id="saveTeacherRulesButton"
          style="margin-top:15px;"
        >
          Salvar regras
        </button>

        <p
          id="teacherRulesMessage"
          style="margin-top:15px;"
        ></p>

      </div>

    `;


    loadTeacherRules();

    return;
  }

  // ===================================================
  // ALUNOS
  // ===================================================

  if (page === "students") {

    content.innerHTML = `

      <div class="card">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h3
              style="
                margin-bottom:6px;
              "
            >
              Alunos
            </h3>

            <p
              style="
                margin:0;
              "
            >
              Consulte presencas, faltas, aulas,
              conteudos e reposicoes de cada aluno.
            </p>

          </div>


          <div
            style="
              display:flex;
              gap:10px;
              align-items:center;
              flex-wrap:wrap;
            "
          >

            <button
              type="button"
              class="secondary-button"
              id="openOrphanGuardiansButton"
            >
              Responsaveis sem aluno ativo
            </button>


            <button
              type="button"
              class="action-button"
              id="openRegisterStudentButton"
            >
              + Cadastrar aluno
            </button>


            <input
              type="search"
              id="teacherStudentSearch"
              placeholder="Buscar aluno..."
              style="
                min-width:240px;
                padding:10px 12px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

          </div>

        </div>


        <div
          id="teacherStudentRegistrationArea"
          style="
            display:none;
            margin-top:20px;
            padding:18px;
            background:#f7f7f7;
            border-radius:10px;
          "
        >

          <h4
            style="
              margin-top:0;
            "
          >
            Cadastrar aluno e acesso
          </h4>


          <p
            style="
              margin-top:0;
              color:#555;
            "
          >
            O aluno sera cadastrado no sistema e recebera
            um acesso com e-mail e senha.
          </p>


          <div
            style="
              display:grid;
              grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
              gap:14px;
            "
          >

            <div>

              <label
                for="newStudentName"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Nome do aluno
              </label>

              <input
                id="newStudentName"
                type="text"
                maxlength="200"
                autocomplete="off"
                placeholder="Nome completo"
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
                for="newStudentEmail"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                E-mail de acesso
              </label>

              <input
                id="newStudentEmail"
                type="email"
                autocomplete="off"
                placeholder="aluno@email.com"
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
              <label for="newStudentPhone" style="display:block;font-weight:bold;margin-bottom:8px;">
                Telefone
              </label>
              <input id="newStudentPhone" type="tel" autocomplete="tel" placeholder="(11) 99999-9999" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
            </div>


            <div>
              <label for="newStudentCpf" style="display:block;font-weight:bold;margin-bottom:8px;">
                CPF
              </label>
              <input id="newStudentCpf" type="text" inputmode="numeric" placeholder="000.000.000-00" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
            </div>


            <div
              style="
                grid-column:1 / -1;
                padding:14px;
                border:1px solid #e7dfd5;
                border-radius:9px;
                background:#f7e9e1;
              "
            >

              <label
                for="newStudentClassLink"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Link da aula (Meet / Zoom / Teams)
              </label>

              <input
                id="newStudentClassLink"
                type="url"
                maxlength="2000"
                autocomplete="off"
                placeholder="https://meet.google.com/..."
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <div
                style="
                  margin-top:5px;
                  color:#666;
                  font-size:12px;
                "
              >
                Opcional. O professor tera um atalho
                para este link acima da agenda.
              </div>

            </div>


            <div>

              <label
                for="newStudentPassword"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Senha inicial
              </label>

              <input
                id="newStudentPassword"
                type="password"
                minlength="6"
                autocomplete="new-password"
                placeholder="Minimo de 6 caracteres"
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
                for="newStudentPasswordConfirm"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Confirmar senha
              </label>

              <input
                id="newStudentPasswordConfirm"
                type="password"
                minlength="6"
                autocomplete="new-password"
                placeholder="Digite a senha novamente"
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
                for="newStudentBirthDate"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Data de nascimento
              </label>

              <input
                id="newStudentBirthDate"
                type="date"
                required
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

              <div
                style="
                  margin-top:5px;
                  color:#666;
                  font-size:12px;
                "
              >
                Menores de 18 anos nao veem valores financeiros
                no login de aluno.
              </div>

            </div>


            <div>

              <label
                for="newStudentDuration"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Duracao da aula
              </label>

              <select
                id="newStudentDuration"
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="60">
                  60 minutos
                </option>

                <option value="30">
                  30 minutos
                </option>
              </select>

            </div>


            <div>

              <label
                for="newStudentBillingType"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Tipo de cobranca
              </label>

              <select
                id="newStudentBillingType"
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="monthly">
                  Valor mensal
                </option>

                <option value="per_lesson">
                  Valor por aula
                </option>
              </select>

            </div>


            <div
              id="newStudentMonthlyFeeField"
            >

              <label
                for="newStudentMonthlyFee"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Valor mensal
              </label>

              <input
                id="newStudentMonthlyFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

            </div>


            <div
              id="newStudentLessonFeeField"
              style="
                display:none;
              "
            >

              <label
                for="newStudentLessonFee"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Valor por aula
              </label>

              <input
                id="newStudentLessonFee"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
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
                for="newStudentDueDay"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Dia do vencimento
              </label>

              <input
                id="newStudentDueDay"
                type="number"
                min="1"
                max="31"
                step="1"
                value="1"
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

            </div>


            <div
              style="
                display:flex;
                align-items:flex-end;
              "
            >

              <label
                style="
                  display:block;
                  padding:10px 0;
                "
              >

                <input
                  type="checkbox"
                  id="newStudentInvoiceDefault"
                >

                Normalmente precisa de nota fiscal

              </label>

            </div>

          </div>


          <div
            style="
              margin-top:20px;
              padding-top:18px;
              border-top:1px solid #ddd;
            "
          >

            <strong>
              Contrato
            </strong>


            <div
              style="
                margin-top:4px;
                color:#666;
                font-size:13px;
              "
            >
              O periodo contratual tambem sera usado
              no calculo financeiro por aula.
            </div>


            <div
              style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
                gap:12px;
                margin-top:14px;
              "
            >

              <div>

                <label
                  for="newStudentContractStartDate"
                  style="
                    display:block;
                    font-weight:bold;
                    margin-bottom:7px;
                  "
                >
                  Inicio do contrato
                </label>


                <input
                  type="date"
                  id="newStudentContractStartDate"
                  value="${formatDateForDatabase(
                    new Date()
                  )}"
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
                  for="newStudentContractEndDate"
                  style="
                    display:block;
                    font-weight:bold;
                    margin-bottom:7px;
                  "
                >
                  Termino do contrato
                </label>


                <input
                  type="date"
                  id="newStudentContractEndDate"
                  style="
                    width:100%;
                    box-sizing:border-box;
                    padding:10px;
                    border:1px solid #ccc;
                    border-radius:8px;
                  "
                >


                <div
                  style="
                    margin-top:5px;
                    color:#666;
                    font-size:12px;
                  "
                >
                  Pode ficar em branco para contrato sem data de termino.
                </div>

              </div>

            </div>


            <div
              style="
                margin-top:12px;
              "
            >

              <label
                for="newStudentContractNotes"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:7px;
                "
              >
                Observacoes contratuais
              </label>


              <textarea
                id="newStudentContractNotes"
                rows="3"
                maxlength="3000"
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                  resize:vertical;
                  font-family:inherit;
                "
              ></textarea>

            </div>

          </div>


          <div
            style="
              margin-top:20px;
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

                <strong>
                  Dias e horarios das aulas fixas
                </strong>

                <div
                  style="
                    margin-top:4px;
                    color:#666;
                    font-size:13px;
                  "
                >
                  Para 60 minutos, o sistema reserva
                  automaticamente dois blocos de 30 minutos.
                </div>

              </div>


              <button
                type="button"
                class="secondary-button"
                id="addNewStudentScheduleRowButton"
              >
                + Adicionar dia / horario
              </button>

            </div>


            <div
              id="newStudentFixedScheduleRows"
            ></div>

          </div>


          <div
            style="
              margin-top:14px;
              padding:12px;
              background:#f7e9e1;
              border-radius:8px;
              font-size:13px;
            "
          >
            A senha nao sera salva nas tabelas da Aulora.
            Ela e enviada diretamente ao Supabase Auth.
            Com a confirmacao de e-mail desativada no
            Supabase, o acesso pode ser usado imediatamente.
          </div>


          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:16px;
            "
          >

            <button
              type="button"
              class="action-button"
              id="saveNewStudentButton"
            >
              Criar aluno e acesso
            </button>


            <button
              type="button"
              class="secondary-button"
              id="cancelNewStudentButton"
            >
              Cancelar
            </button>

          </div>


          <p
            id="newStudentMessage"
            style="
              margin-top:12px;
            "
          ></p>

        </div>


        <div
          id="teacherOrphanGuardianArea"
          style="
            display:none;
            margin-top:20px;
          "
        ></div>


        <div
          id="teacherStudentList"
          style="
            margin-top:20px;
          "
        >
          Carregando alunos...
        </div>


        <div
          id="teacherStudentDetailArea"
          style="
            margin-top:20px;
          "
        ></div>

      </div>

    `;


    const openOrphanGuardiansButton =
      document.getElementById(
        "openOrphanGuardiansButton"
      );


    if (openOrphanGuardiansButton) {

      openOrphanGuardiansButton.addEventListener(
        "click",
        openTeacherOrphanGuardiansManager
      );

    }


    const openRegisterButton =
      document.getElementById(
        "openRegisterStudentButton"
      );


    if (openRegisterButton) {

      openRegisterButton.addEventListener(
        "click",
        openRegisterStudentForm
      );

    }


    const saveNewStudentButton =
      document.getElementById(
        "saveNewStudentButton"
      );


    if (saveNewStudentButton) {

      saveNewStudentButton.addEventListener(
        "click",
        saveNewStudentWithAccessV2
      );

    }


    const cancelNewStudentButton =
      document.getElementById(
        "cancelNewStudentButton"
      );


    if (cancelNewStudentButton) {

      cancelNewStudentButton.addEventListener(
        "click",
        closeRegisterStudentForm
      );

    }


    const addStudentScheduleButton =
      document.getElementById(
        "addNewStudentScheduleRowButton"
      );


    if (addStudentScheduleButton) {

      addStudentScheduleButton.addEventListener(
        "click",
        () => {

          addStudentFixedScheduleRow(
            "newStudentFixedScheduleRows"
          );

        }
      );

    }


    const billingTypeSelect =
      document.getElementById(
        "newStudentBillingType"
      );


    if (billingTypeSelect) {

      billingTypeSelect.addEventListener(
        "change",
        updateNewStudentBillingFields
      );


      updateNewStudentBillingFields();

    }


    const searchInput =
      document.getElementById(
        "teacherStudentSearch"
      );


    if (searchInput) {

      searchInput.addEventListener(
        "input",
        () => {

          renderTeacherStudentOverview(
            searchInput.value
          );

        }
      );

    }


    loadTeacherStudentOverview();

    return;
  }


  // ===================================================
  // MATERIAS / CONTEUDOS
  // ===================================================

  if (page === "subjects") {

    content.innerHTML = `

      <div class="card">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h3
              style="
                margin-bottom:6px;
              "
            >
              Materias e conteudos
            </h3>

            <p
              style="
                margin:0;
              "
            >
              Organize as materias e os conteudos
              usados nas aulas e planejamentos.
            </p>

          </div>


          <button
            type="button"
            class="action-button"
            id="openNewTeacherSubjectButton"
          >
            + Nova materia
          </button>

        </div>


        <div
          id="newTeacherSubjectArea"
          style="
            display:none;
            margin-top:18px;
            padding:15px;
            background:#f7f7f7;
            border-radius:10px;
          "
        >

          <label
            for="newTeacherSubjectName"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:8px;
            "
          >
            Nome da materia
          </label>


          <input
            id="newTeacherSubjectName"
            type="text"
            maxlength="120"
            placeholder="Ex.: Ingles"
            style="
              width:100%;
              box-sizing:border-box;
              padding:11px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >


          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:12px;
            "
          >

            <button
              type="button"
              class="action-button"
              id="saveNewTeacherSubjectButton"
            >
              Salvar materia
            </button>


            <button
              type="button"
              class="secondary-button"
              id="cancelNewTeacherSubjectButton"
            >
              Cancelar
            </button>

          </div>


          <p
            id="newTeacherSubjectMessage"
            style="
              margin-top:10px;
            "
          ></p>

        </div>


        <div
          id="teacherSubjectCatalog"
          style="
            margin-top:20px;
          "
        >
          Carregando materias...
        </div>

      </div>

    `;


    const openButton =
      document.getElementById(
        "openNewTeacherSubjectButton"
      );


    if (openButton) {

      openButton.addEventListener(
        "click",
        () => {

          const area =
            document.getElementById(
              "newTeacherSubjectArea"
            );


          if (area) {

            area.style.display =
              "block";

          }

        }
      );

    }


    const cancelButton =
      document.getElementById(
        "cancelNewTeacherSubjectButton"
      );


    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        () => {

          const area =
            document.getElementById(
              "newTeacherSubjectArea"
            );


          if (area) {

            area.style.display =
              "none";

          }

        }
      );

    }


    const saveButton =
      document.getElementById(
        "saveNewTeacherSubjectButton"
      );


    if (saveButton) {

      saveButton.addEventListener(
        "click",
        saveNewTeacherSubject
      );

    }


    loadTeacherSubjectCatalog();

    return;
  }


  // ===================================================
  // FINANCEIRO
  // ===================================================

  if (page === "financial") {

    const now =
      new Date();


    const currentMonth =
      String(
        now.getFullYear()
      )
      +
      "-"
      +
      String(
        now.getMonth() + 1
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
            gap:15px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h3
              style="
                margin-bottom:6px;
              "
            >
              Financeiro
            </h3>

            <p
              style="
                margin:0;
              "
            >
              Cadastre e acompanhe as mensalidades
              dos seus alunos.
            </p>

          </div>


          <div
            style="
              display:flex;
              gap:8px;
              flex-wrap:wrap;
            "
          >

            <button
              type="button"
              class="secondary-button"
              id="generateTeacherFinancialButton"
            >
              Gerar mensalidades do mes
            </button>


            <button
              type="button"
              class="action-button"
              id="newTeacherFinancialButton"
            >
              + Nova mensalidade
            </button>

          </div>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
            gap:12px;
            margin-top:20px;
          "
        >

          <div>

            <label
              for="teacherFinancialMonthFilter"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:8px;
              "
            >
              Mes
            </label>


            <input
              type="month"
              id="teacherFinancialMonthFilter"
              value="${currentMonth}"
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
              for="teacherFinancialStudentFilter"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:8px;
              "
            >
              Aluno
            </label>


            <select
              id="teacherFinancialStudentFilter"
              style="
                width:100%;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

              <option value="">
                Todos os alunos
              </option>

            </select>

          </div>

        </div>


        <div
          id="teacherFinancialSummary"
          style="
            margin-top:20px;
          "
        ></div>


        <div
          id="teacherFinancialGenerationStatus"
          style="
            margin-top:14px;
          "
        ></div>


        <div
          id="teacherFinancialFormArea"
          style="
            display:none;
            margin-top:20px;
          "
        ></div>


        <div
          id="teacherFinancialReportArea"
          style="
            display:none;
            margin-top:20px;
          "
        ></div>


        <div
          id="teacherFinancialList"
          style="
            margin-top:20px;
          "
        >
          Carregando financeiro...
        </div>

      </div>

    `;


    const generateButton =
      document.getElementById(
        "generateTeacherFinancialButton"
      );


    if (generateButton) {

      generateButton.addEventListener(
        "click",
        generateTeacherFinancialMonth
      );

    }


    const newButton =
      document.getElementById(
        "newTeacherFinancialButton"
      );


    if (newButton) {

      newButton.addEventListener(
        "click",
        () => {

          openTeacherFinancialForm();

        }
      );

    }


    const monthFilter =
      document.getElementById(
        "teacherFinancialMonthFilter"
      );


    if (monthFilter) {

      monthFilter.addEventListener(
        "change",
        loadTeacherFinancialRecords
      );

    }


    const studentFilter =
      document.getElementById(
        "teacherFinancialStudentFilter"
      );


    if (studentFilter) {

      studentFilter.addEventListener(
        "change",
        loadTeacherFinancialRecords
      );

    }


    loadTeacherFinancialPage();

    return;
  }


  // ===================================================
  // PRESENCA / FALTAS
  // ===================================================

  if (page === "attendance") {

    const now =
      new Date();

    const monthValue =
      String(
        now.getFullYear()
      ) +
      "-" +
      String(
        now.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    content.innerHTML = `

      <div class="card">

        <h3>
          Presenca / Faltas
        </h3>


        <p>
          Consulte os registros das aulas,
          filtre por mes ou aluno e corrija
          um registro quando necessario.
        </p>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(210px,1fr));
            gap:12px;
            margin-top:18px;
          "
        >

          <div>

            <label
              for="teacherAttendanceMonth"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:8px;
              "
            >
              Mes
            </label>

            <input
              type="month"
              id="teacherAttendanceMonth"
              value="${monthValue}"
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
              for="teacherAttendanceStudentFilter"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:8px;
              "
            >
              Aluno
            </label>

            <select
              id="teacherAttendanceStudentFilter"
              style="
                width:100%;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

              <option value="">
                Todos os alunos
              </option>

            </select>

          </div>

        </div>


        <div
          id="teacherAttendanceSummary"
          style="
            margin-top:20px;
          "
        ></div>


        <div
          id="teacherAttendanceReportList"
          style="
            margin-top:20px;
          "
        >
          Carregando registros...
        </div>


        <div
          id="teacherScheduleEditArea"
          style="
            margin-top:20px;
          "
        ></div>

      </div>

    `;


    const monthInput =
      document.getElementById(
        "teacherAttendanceMonth"
      );


    const studentFilter =
      document.getElementById(
        "teacherAttendanceStudentFilter"
      );


    if (monthInput) {

      monthInput.addEventListener(
        "change",
        loadTeacherAttendanceReport
      );

    }


    if (studentFilter) {

      studentFilter.addEventListener(
        "change",
        loadTeacherAttendanceReport
      );

    }


    loadTeacherAttendancePage();

    return;
  }


  // ===================================================
  // PLANEJAMENTO
  // ===================================================

  if (page === "planning") {

    content.innerHTML = `

      <div class="card">

        <div
          style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            gap:15px;
            flex-wrap:wrap;
          "
        >

          <div>

            <h3
              style="
                margin-bottom:6px;
              "
            >
              Planejamento
            </h3>

            <p
              style="
                margin:0;
              "
            >
              Planeje materia, conteudo e observacoes
              antes da aula.
            </p>

          </div>


          <button
            type="button"
            class="action-button"
            id="newTeacherPlanButton"
          >
            + Novo planejamento
          </button>

        </div>


        <div
          id="teacherPlanningFormArea"
          style="
            display:none;
            margin-top:20px;
            padding:18px;
            border-radius:10px;
            background:#f7f7f7;
          "
        >

          <h4
            id="teacherPlanningFormTitle"
            style="
              margin-top:0;
            "
          >
            Novo planejamento
          </h4>


          <div
            style="
              display:grid;
              gap:15px;
            "
          >

            <div>

              <label
                for="teacherPlanningStudent"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Aluno
              </label>

              <select
                id="teacherPlanningStudent"
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="">
                  Carregando alunos...
                </option>
              </select>

            </div>


            <div>

              <label
                for="teacherPlanningDate"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Data
              </label>

              <input
                id="teacherPlanningDate"
                type="date"
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
                for="teacherPlanningSubject"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Materia
              </label>

              <select
                id="teacherPlanningSubject"
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="">
                  Carregando materias...
                </option>
              </select>

            </div>


            <div>

              <label
                for="teacherPlanningContent"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Conteudo
              </label>

              <select
                id="teacherPlanningContent"
                disabled
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >
                <option value="">
                  Selecione a materia primeiro
                </option>
              </select>

            </div>


            <div>

              <label
                for="teacherPlanningNotes"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Observacoes / objetivo da aula
              </label>

              <textarea
                id="teacherPlanningNotes"
                rows="5"
                maxlength="3000"
                placeholder="Ex.: revisar Simple Past, corrigir exercicios e praticar perguntas..."
                style="
                  width:100%;
                  box-sizing:border-box;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                  resize:vertical;
                  font-family:inherit;
                "
              ></textarea>

            </div>

          </div>


          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:18px;
            "
          >

            <button
              type="button"
              class="action-button"
              id="saveTeacherPlanButton"
            >
              Salvar planejamento
            </button>

            <button
              type="button"
              class="secondary-button"
              id="cancelTeacherPlanFormButton"
            >
              Cancelar
            </button>

          </div>


          <p
            id="teacherPlanningFormMessage"
            style="
              margin-top:10px;
            "
          ></p>

        </div>


        <div
          id="teacherPlanningList"
          style="
            margin-top:22px;
          "
        >
          Carregando planejamentos...
        </div>

      </div>

    `;


    const newButton =
      document.getElementById(
        "newTeacherPlanButton"
      );


    if (newButton) {

      newButton.addEventListener(
        "click",
        () => {

          openTeacherPlanningForm();

        }
      );

    }


    const saveButton =
      document.getElementById(
        "saveTeacherPlanButton"
      );


    if (saveButton) {

      saveButton.addEventListener(
        "click",
        saveTeacherPlanning
      );

    }


    const cancelButton =
      document.getElementById(
        "cancelTeacherPlanFormButton"
      );


    if (cancelButton) {

      cancelButton.addEventListener(
        "click",
        closeTeacherPlanningForm
      );

    }


    const subjectSelect =
      document.getElementById(
        "teacherPlanningSubject"
      );


    if (subjectSelect) {

      subjectSelect.addEventListener(
        "change",
        async () => {

          await loadTeacherPlanningContents(
            subjectSelect.value
          );

        }
      );

    }


    loadTeacherPlanningPage();

    return;
  }


  // ===================================================
  // AGENDA DO PROFESSOR
  // ===================================================

  if (page === "agenda") {

    content.innerHTML = `

      <div
        id="teacherAgendaOnboardingV5"
        style="margin-bottom:20px;"
      ></div>

      <div
        id="teacherDashboardArea"
        style="
          margin-bottom:20px;
        "
      >

        <div class="card">
          Carregando resumo...
        </div>

      </div>


      <!-- ==========================================
           CANCELAMENTOS DOS ALUNOS
           ========================================== -->

      <div
        id="teacherCancellationNotices"
        style="
          margin-bottom:20px;
        "
      >
        Carregando cancelamentos...
      </div>


      <!-- ==========================================
           AGENDA SEMANAL
           ========================================== -->

      <div class="card">

        <h3>
          Agenda semanal
        </h3>


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
            id="teacherPreviousWeekButton"
          >
            \u2190 Semana anterior
          </button>


          <button
            type="button"
            class="secondary-button"
            id="teacherCurrentWeekButton"
          >
            Semana atual
          </button>


          <button
            type="button"
            class="secondary-button"
            id="teacherNextWeekButton"
          >
            Pr\u00F3xima semana \u2192
          </button>

        </div>


        <div
          id="teacherSelectedWeekLabel"
          style="
            text-align:center;
            font-weight:bold;
            margin-bottom:14px;
          "
        ></div>


        <div
          id="teacherHolidayDecisionArea"
          style="
            margin-bottom:16px;
          "
        ></div>


        <div
          id="teacherClassLinksArea"
          style="
            margin-bottom:16px;
          "
        ></div>


        <div class="schedule-wrapper">

          <table class="schedule-table">

            <thead
              id="teacherScheduleHead"
            ></thead>


            <tbody
              id="teacherScheduleBody"
            >

              <tr>

                <td colspan="8">
                  Carregando agenda...
                </td>

              </tr>

            </tbody>

          </table>

        </div>

        <div
          id="teacherScheduleEditArea"
          style="
            margin-top:20px;
          "
        ></div>

        <div
          class="schedule-legend"
          style="
            margin-top:20px;
          "
        >

          <span>
            \uD83D\uDFE2 Livre
          </span>

          <span>
            \uD83D\uDD35 Aula
          </span>

          <span>
            \uD83D\uDFE3 Reposi\u00E7\u00E3o
          </span>

          <span>
            \uD83D\uDFE1 Cancelada
          </span>

          <span>
            \u26AB Indispon\u00EDvel
          </span>

        </div>

      </div>

    `;


    // =================================================
    // SEMANA ANTERIOR
    // =================================================

    loadTeacherDashboard();

    const previousButton =
      document.getElementById(
        "teacherPreviousWeekButton"
      );


    if (previousButton) {

      previousButton.onclick =
        async () => {

          selectedTeacherWeekStart =
            addDays(
              selectedTeacherWeekStart,
              -7
            );


          await loadTeacherWeeklySchedule();

        };

    }


    // =================================================
    // SEMANA ATUAL
    // =================================================

    const currentButton =
      document.getElementById(
        "teacherCurrentWeekButton"
      );


    if (currentButton) {

      currentButton.onclick =
        async () => {

          selectedTeacherWeekStart =
            getMonday(
              new Date()
            );


          await loadTeacherWeeklySchedule();

        };

    }


    // =================================================
    // PR\u00D3XIMA SEMANA
    // =================================================

    const nextButton =
      document.getElementById(
        "teacherNextWeekButton"
      );


    if (nextButton) {

      nextButton.onclick =
        async () => {

          selectedTeacherWeekStart =
            addDays(
              selectedTeacherWeekStart,
              7
            );


          await loadTeacherWeeklySchedule();

        };

    }


    // =================================================
    // CARREGAR
    // =================================================

    loadTeacherCancellationMessages()
      .catch(error => {

        console.error(
          "Erro ao carregar cancelamentos:",
          error
        );

      });

 loadTeacherStudents()
  .catch(error => {

    console.error(
      "Erro ao carregar alunos:",
      error
    );

  });   

    loadTeacherWeeklySchedule()
      .catch(error => {

        console.error(
          "Erro ao carregar agenda do professor:",
          error
        );

      });


    return;
  }
  
  // ===================================================
  // DEMAIS P\xc1GINAS DO PROFESSOR
  // ===================================================

  const titles = {

    agenda: "Agenda",

    students: "Alunos",

    attendance:
      "Presen\xe7a / Faltas",

    subjects:
      "Mat\xe9rias",

    planning:
      "Planejamento",

    financial:
      "Financeiro"

  };


  content.innerHTML = `

    <div class="card">

      <h3>
        ${
          titles[page] ||
          "P\xe1gina"
        }
      </h3>

      <p>
        Esta \xe1rea ser\xe1 implementada
        nas pr\xf3ximas etapas.
      </p>

    </div>

  `;
}

// =====================================================
// ABA ALUNOS DO PROFESSOR
// =====================================================

let teacherStudentOverviewData = [];


// =====================================================
// EDITOR DE DIAS / HORARIOS FIXOS
// =====================================================

function getWeekdayOptions(
  selectedDay = ""
) {

  const days = [
    [1, "Segunda-feira"],
    [2, "Terca-feira"],
    [3, "Quarta-feira"],
    [4, "Quinta-feira"],
    [5, "Sexta-feira"],
    [6, "Sabado"],
    [7, "Domingo"]
  ];


  const allowedDays =
    getTeacherWorkDays();


  return days
    .filter(
      item =>
        allowedDays.includes(
          Number(
            item[0]
          )
        )
        ||
        String(
          selectedDay || ""
        ) ===
        String(
          item[0]
        )
    )
    .map(
      item => `

        <option
          value="${item[0]}"
          ${
            String(
              selectedDay || ""
            ) ===
            String(
              item[0]
            )
              ? "selected"
              : ""
          }
        >
          ${item[1]}
        </option>

      `
    )
    .join("");

}


function addStudentFixedScheduleRow(
  containerId,
  initial = {}
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  const row =
    document.createElement(
      "div"
    );

  row.className =
    "student-fixed-schedule-row";

  row.style.display =
    "grid";

  row.style.gridTemplateColumns =
    "minmax(170px,1fr) minmax(130px,1fr) auto";

  row.style.gap =
    "10px";

  row.style.alignItems =
    "end";

  row.style.marginTop =
    "10px";


  row.innerHTML = `

    <div>

      <label
        style="
          display:block;
          font-weight:bold;
          margin-bottom:6px;
        "
      >
        Dia
      </label>

      <select
        data-student-schedule-day
        style="
          width:100%;
          padding:10px;
          border:1px solid #ccc;
          border-radius:8px;
        "
      >
        <option value="">
          Selecione
        </option>

        ${getWeekdayOptions(
          initial.day_of_week
        )}
      </select>

    </div>


    <div>

      <label
        style="
          display:block;
          font-weight:bold;
          margin-bottom:6px;
        "
      >
        Horario
      </label>

      <input
        type="time"
        step="1800"
        data-student-schedule-time
        min="${normalizeTime(
          (
            currentTeacherProfileSettings &&
            currentTeacherProfileSettings.work_start_time
          )
          ||
          "00:00"
        )}"
        max="${
          normalizeTime(
            (
              currentTeacherProfileSettings &&
              currentTeacherProfileSettings.work_end_time
            )
            ||
            "23:30"
          ) === "00:00"

            ? "23:30"

            : normalizeTime(
                (
                  currentTeacherProfileSettings &&
                  currentTeacherProfileSettings.work_end_time
                )
                ||
                "23:30"
              )
        }"
        value="${escapeHtml(
          initial.start_time || ""
        )}"
        style="
          width:100%;
          box-sizing:border-box;
          padding:9px;
          border:1px solid #ccc;
          border-radius:8px;
        "
      >

    </div>


    <button
      type="button"
      class="secondary-button remove-student-schedule-row"
      style="
        border-color:#c0392b;
        color:#c0392b;
      "
    >
      Remover
    </button>

  `;


  const removeButton =
    row.querySelector(
      ".remove-student-schedule-row"
    );

  if (removeButton) {

    removeButton.addEventListener(
      "click",
      () => {
        row.remove();
      }
    );

  }

  container.appendChild(
    row
  );

}


function resetStudentFixedScheduleEditor(
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    "";

  addStudentFixedScheduleRow(
    containerId
  );

}


function collectStudentFixedSchedule(
  containerId
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) {

    return {
      schedule: [],
      error:
        "Area de horarios nao encontrada."
    };

  }


  const rows =
    Array.from(
      container.querySelectorAll(
        ".student-fixed-schedule-row"
      )
    );


  if (rows.length === 0) {

    return {
      schedule: [],
      error:
        "Adicione pelo menos um dia e horario."
    };

  }


  const schedule =
    [];


  for (const row of rows) {

    const daySelect =
      row.querySelector(
        "[data-student-schedule-day]"
      );

    const timeInput =
      row.querySelector(
        "[data-student-schedule-time]"
      );

    const day =
      Number(
        daySelect
          ? daySelect.value
          : 0
      );

    const time =
      timeInput
        ? timeInput.value
        : "";


    if (
      day < 1 ||
      day > 7
    ) {

      return {
        schedule: [],
        error:
          "Selecione o dia de todas as aulas."
      };

    }


    if (!time) {

      return {
        schedule: [],
        error:
          "Escolha o horario de todas as aulas."
      };

    }


    if (
      !isTeacherWorkDayNumber(
        day
      )
    ) {

      return {
        schedule: [],
        error:
          "O dia escolhido nao faz parte dos dias de atendimento configurados no Perfil do professor."
      };

    }


    const parts =
      time.split(":");

    const minute =
      Number(
        parts[1] || 0
      );


    if (
      minute !== 0 &&
      minute !== 30
    ) {

      return {
        schedule: [],
        error:
          "Os horarios precisam comecar em :00 ou :30."
      };

    }


    const durationSelect =
      document.getElementById(
        "newStudentDuration"
      );


    const duration =
      durationSelect
        ? Number(
            durationSelect.value
          )
        : 30;


    const proposedEnd =
      (
        timeToMinutes(
          time
        )
        +
        (
          duration ===
            60
            ? 60
            : 30
        )
      );


    if (
      currentTeacherProfileSettings
      &&
      (
        timeToMinutes(
          time
        )
        <
        timeToMinutes(
          currentTeacherProfileSettings.work_start_time
        )
        ||
        proposedEnd >
        timeToEndBoundaryMinutes(
          currentTeacherProfileSettings.work_end_time
        )
      )
    ) {

      return {
        schedule: [],
        error:
          "Este horario fica fora do periodo de atendimento configurado no Perfil do professor."
      };

    }


    schedule.push({
      day_of_week:
        day,
      start_time:
        time
    });

  }


  return {
    schedule,
    error:
      null
  };

}


// =====================================================
// CADASTRAR ALUNO + ACESSO
// =====================================================

function openRegisterStudentForm() {

  const area =
    document.getElementById(
      "teacherStudentRegistrationArea"
    );


  if (!area) {
    return;
  }


  area.style.display =
    "block";


  const nameInput =
    document.getElementById(
      "newStudentName"
    );


  if (nameInput) {

    nameInput.focus();

  }


  const scheduleContainer =
    document.getElementById(
      "newStudentFixedScheduleRows"
    );


  if (
    scheduleContainer &&
    scheduleContainer.children.length === 0
  ) {

    resetStudentFixedScheduleEditor(
      "newStudentFixedScheduleRows"
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// FECHAR CADASTRO
// =====================================================

function closeRegisterStudentForm() {

  const area =
    document.getElementById(
      "teacherStudentRegistrationArea"
    );


  if (area) {

    area.style.display =
      "none";

  }


  const message =
    document.getElementById(
      "newStudentMessage"
    );


  if (message) {

    message.textContent =
      "";

  }

}


// =====================================================
// CLIENTE DE AUTH SEPARADO
//
// IMPORTANTE:
// esse cliente NAO persiste sessao.
// Assim, criar o login do aluno nao desloga o professor.
// =====================================================

function createStudentAccessAuthClient() {

  if (
    !window.supabase ||
    typeof window.supabase.createClient !==
      "function"
  ) {

    throw new Error(
      "Biblioteca do Supabase nao encontrada."
    );

  }


  const url =
    supabaseClient.supabaseUrl;


  const key =
    supabaseClient.supabaseKey;


  if (
    !url ||
    !key
  ) {

    throw new Error(
      "Nao foi possivel acessar a configuracao do Supabase."
    );

  }


  return window.supabase.createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,

        detectSessionInUrl:
          false
      }
    }
  );

}


// =====================================================
// CAMPOS DE COBRANCA NO CADASTRO
// =====================================================

function updateNewStudentBillingFields() {

  const typeSelect =
    document.getElementById(
      "newStudentBillingType"
    );


  const monthlyField =
    document.getElementById(
      "newStudentMonthlyFeeField"
    );


  const lessonField =
    document.getElementById(
      "newStudentLessonFeeField"
    );


  if (
    !typeSelect ||
    !monthlyField ||
    !lessonField
  ) {
    return;
  }


  const perLesson =
    typeSelect.value ===
      "per_lesson";


  monthlyField.style.display =
    perLesson
      ? "none"
      : "block";


  lessonField.style.display =
    perLesson
      ? "block"
      : "none";

}


// =====================================================
// SALVAR CONTRATO LOGO APOS O CADASTRO DO ALUNO
// =====================================================

async function saveStudentContractAfterRegistration(
  studentId,
  contractStartDate,
  contractEndDate,
  contractNotes
) {

  if (!studentId) {

    return {
      error: {
        message:
          "O cadastro do aluno nao retornou o ID necessario para salvar o contrato."
      }
    };

  }


  return await supabaseClient.rpc(
    "save_teacher_student_contract",
    {

      p_student_id:
        studentId,

      p_contract_start_date:
        contractStartDate,

      p_contract_end_date:
        contractEndDate,

      p_contract_notes:
        contractNotes

    }
  );

}


// =====================================================
// SALVAR LINK DA AULA APOS CADASTRO
// =====================================================

async function saveStudentClassLinkAfterRegistration(
  studentId,
  classLink
) {

  if (!studentId) {

    return {
      error: {
        message:
          "O cadastro do aluno nao retornou o ID necessario para salvar o link da aula."
      }
    };

  }


  return await supabaseClient.rpc(
    "save_teacher_student_class_link",
    {
      p_student_id:
        studentId,

      p_class_link:
        classLink
    }
  );

}


// =====================================================
// FINALIZAR PROFILE + STUDENT
// =====================================================

async function finishStudentRegistration(
  authUserId,
  name,
  email,
  duration,
  schedule,
  billingType,
  monthlyFee,
  lessonFee,
  dueDay,
  invoiceRequired,
  birthDate
) {

  return await supabaseClient.rpc(
    "register_student_from_auth",
    {

      p_auth_user_id:
        authUserId,

      p_name:
        name,

      p_email:
        email,

      p_class_duration_minutes:
        duration,

      p_schedule:
        Array.isArray(
          schedule
        )
          ? schedule
          : [],

      p_billing_type:
        billingType,

      p_monthly_fee:
        monthlyFee,

      p_lesson_fee:
        lessonFee,

      p_payment_due_day:
        dueDay,

      p_invoice_required_default:
        invoiceRequired,

      p_birth_date:
        birthDate

    }
  );

}


// =====================================================
// RECUPERAR UMA TENTATIVA PARCIAL
// =====================================================

async function recoverExistingStudentAccess(
  name,
  email,
  duration,
  schedule,
  billingType,
  monthlyFee,
  lessonFee,
  dueDay,
  invoiceRequired,
  birthDate
) {

  return await supabaseClient.rpc(
    "recover_student_from_auth_email",
    {

      p_name:
        name,

      p_email:
        email,

      p_class_duration_minutes:
        duration,

      p_schedule:
        Array.isArray(
          schedule
        )
          ? schedule
          : [],

      p_billing_type:
        billingType,

      p_monthly_fee:
        monthlyFee,

      p_lesson_fee:
        lessonFee,

      p_payment_due_day:
        dueDay,

      p_invoice_required_default:
        invoiceRequired,

      p_birth_date:
        birthDate

    }
  );

}


// =====================================================
// SALVAR NOVO ALUNO
// =====================================================

async function saveNewStudentWithAccess() {

  const nameInput =
    document.getElementById(
      "newStudentName"
    );


  const emailInput =
    document.getElementById(
      "newStudentEmail"
    );


  const classLinkInput =
    document.getElementById(
      "newStudentClassLink"
    );


  const passwordInput =
    document.getElementById(
      "newStudentPassword"
    );


  const confirmInput =
    document.getElementById(
      "newStudentPasswordConfirm"
    );


  const durationSelect =
    document.getElementById(
      "newStudentDuration"
    );


  const birthDateInput =
    document.getElementById(
      "newStudentBirthDate"
    );


  const contractStartInput =
    document.getElementById(
      "newStudentContractStartDate"
    );


  const contractEndInput =
    document.getElementById(
      "newStudentContractEndDate"
    );


  const contractNotesInput =
    document.getElementById(
      "newStudentContractNotes"
    );


  const billingTypeSelect =
    document.getElementById(
      "newStudentBillingType"
    );


  const monthlyFeeInput =
    document.getElementById(
      "newStudentMonthlyFee"
    );


  const lessonFeeInput =
    document.getElementById(
      "newStudentLessonFee"
    );


  const dueDayInput =
    document.getElementById(
      "newStudentDueDay"
    );


  const invoiceInput =
    document.getElementById(
      "newStudentInvoiceDefault"
    );


  const button =
    document.getElementById(
      "saveNewStudentButton"
    );


  const message =
    document.getElementById(
      "newStudentMessage"
    );


  if (
    !nameInput ||
    !emailInput ||
    !classLinkInput ||
    !passwordInput ||
    !confirmInput ||
    !durationSelect ||
    !birthDateInput ||
    !contractStartInput ||
    !contractEndInput ||
    !contractNotesInput ||
    !billingTypeSelect ||
    !monthlyFeeInput ||
    !lessonFeeInput ||
    !dueDayInput
  ) {
    return;
  }


  const name =
    nameInput.value.trim();


  const email =
    emailInput.value
      .trim()
      .toLowerCase();


  const classLink =
    classLinkInput.value.trim() ||
    null;


  const password =
    passwordInput.value;


  const confirmPassword =
    confirmInput.value;


  const duration =
    Number(
      durationSelect.value
    );


  const birthDate =
    birthDateInput.value;


  const contractStartDate =
    contractStartInput.value;


  const contractEndDate =
    contractEndInput.value ||
    null;


  const contractNotes =
    contractNotesInput.value
      .trim() ||
    null;


  const billingType =
    billingTypeSelect.value;


  const monthlyFee =
    monthlyFeeInput.value ===
      ""
      ? null
      : Number(
          monthlyFeeInput.value
        );


  const lessonFee =
    lessonFeeInput.value ===
      ""
      ? null
      : Number(
          lessonFeeInput.value
        );


  const dueDay =
    Number(
      dueDayInput.value
    );


  const invoiceRequired =
    Boolean(
      invoiceInput &&
      invoiceInput.checked
    );


  const scheduleResult =
    collectStudentFixedSchedule(
      "newStudentFixedScheduleRows"
    );


  const schedule =
    scheduleResult.schedule;


  function showError(
    text
  ) {

    if (message) {

      message.textContent =
        text;

      message.style.color =
        "red";

    }

  }


  if (!name) {

    showError(
      "Digite o nome do aluno."
    );

    return;
  }


  if (
    !email ||
    !email.includes("@")
  ) {

    showError(
      "Digite um e-mail valido."
    );

    return;
  }


  if (
    classLink &&
    !/^https?:\/\//i.test(
      classLink
    )
  ) {

    showError(
      "O link da aula precisa comecar com http:// ou https://."
    );

    return;
  }


  if (
    password.length < 6
  ) {

    showError(
      "A senha precisa ter pelo menos 6 caracteres."
    );

    return;
  }


  if (
    password !==
    confirmPassword
  ) {

    showError(
      "As senhas nao coincidem."
    );

    return;
  }


  if (
    duration !== 30 &&
    duration !== 60
  ) {

    showError(
      "Selecione uma duracao valida."
    );

    return;
  }


  if (!birthDate) {

    showError(
      "Informe a data de nascimento do aluno."
    );

    return;
  }


  const birthDateObject =
    new Date(
      birthDate +
      "T12:00:00"
    );


  if (
    Number.isNaN(
      birthDateObject.getTime()
    )
    ||
    birthDateObject >
      new Date()
  ) {

    showError(
      "Informe uma data de nascimento valida."
    );

    return;
  }


  if (!contractStartDate) {

    showError(
      "Informe a data de inicio do contrato."
    );

    return;
  }


  if (
    contractEndDate &&
    contractEndDate <
      contractStartDate
  ) {

    showError(
      "A data de termino do contrato nao pode ser anterior ao inicio."
    );

    return;
  }


  if (
    billingType !== "monthly" &&
    billingType !== "per_lesson"
  ) {

    showError(
      "Selecione o tipo de cobranca."
    );

    return;
  }


  if (
    billingType === "monthly"
    &&
    (
      monthlyFee === null
      ||
      Number.isNaN(
        monthlyFee
      )
      ||
      monthlyFee < 0
    )
  ) {

    showError(
      "Digite o valor mensal do aluno."
    );

    return;
  }


  if (
    billingType === "per_lesson"
    &&
    (
      lessonFee === null
      ||
      Number.isNaN(
        lessonFee
      )
      ||
      lessonFee < 0
    )
  ) {

    showError(
      "Digite o valor por aula do aluno."
    );

    return;
  }


  if (
    Number.isNaN(
      dueDay
    )
    ||
    dueDay < 1
    ||
    dueDay > 31
  ) {

    showError(
      "O dia de vencimento deve estar entre 1 e 31."
    );

    return;
  }


  if (
    scheduleResult.error
  ) {

    showError(
      scheduleResult.error
    );

    return;
  }


  const {
    data: capacityData,
    error: capacityError
  } =
    await supabaseClient.rpc(
      "get_my_teacher_student_capacity_v2"
    );


  if (capacityError) {

    showError(
      capacityError.message ||
      "Nao foi possivel verificar o limite de alunos."
    );

    return;
  }


  const capacity =
    (
      Array.isArray(
        capacityData
      )
        ? capacityData[0]
        : capacityData
    )
    || {};


  if (
    capacity.can_add_student ===
      false
  ) {

    showError(
      "O limite de "
      +
      Number(
        capacity.max_registered_students || 0
      )
      +
      " alunos cadastrados definido pelo ADM foi atingido."
    );

    return;
  }


  const confirmed =
    window.confirm(

      "Criar o aluno \"" +
      name +
      "\" e o acesso " +
      email +
      "?"

    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Criando acesso...";

  }


  if (message) {

    message.textContent =
      "Criando usuario de acesso...";

    message.style.color =
      "#555";

  }


  let authClient;


  try {

    authClient =
      createStudentAccessAuthClient();

  }

  catch (
    error
  ) {

    showError(
      error.message ||
      "Nao foi possivel iniciar o cadastro."
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar aluno e acesso";

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
          name:
            name,

          role:
            "student"
        }

      }

    });


  if (authError) {

    console.error(
      "Erro ao criar acesso do aluno:",
      authError
    );


    const authErrorText =
      String(
        authError.message || ""
      ).toLowerCase();


    const looksLikeExistingUser =
      authErrorText.includes(
        "already registered"
      ) ||
      authErrorText.includes(
        "already exists"
      ) ||
      authErrorText.includes(
        "user already"
      );


    if (looksLikeExistingUser) {

      if (message) {

        message.textContent =
          "Este acesso ja existe no Auth. Tentando concluir o cadastro do aluno...";

        message.style.color =
          "#555";

      }


      const {
        data: recoveredStudentId,
        error: recoveryError
      } =
        await recoverExistingStudentAccess(
          name,
          email,
          duration,
          schedule,
          billingType,
          monthlyFee,
          lessonFee,
          dueDay,
          invoiceRequired,
          birthDate
        );


      if (!recoveryError) {

        const {
          error: contractError
        } =
          await saveStudentContractAfterRegistration(
            recoveredStudentId,
            contractStartDate,
            contractEndDate,
            contractNotes
          );


        if (contractError) {

          console.error(
            "Aluno recuperado, mas o contrato falhou:",
            contractError
          );


          showError(
            "O aluno foi cadastrado, mas nao foi possivel salvar o contrato: "
            +
            (
              contractError.message ||
              "erro desconhecido"
            )
          );


          if (button) {

            button.disabled =
              false;

            button.textContent =
              "Criar aluno e acesso";

          }


          return;
        }


        const {
          error: classLinkError
        } =
          await saveStudentClassLinkAfterRegistration(
            recoveredStudentId,
            classLink
          );


        if (classLinkError) {

          showError(
            "O aluno foi cadastrado, mas nao foi possivel salvar o link da aula: "
            +
            (
              classLinkError.message ||
              "erro desconhecido"
            )
          );


          if (button) {

            button.disabled =
              false;

            button.textContent =
              "Criar aluno e acesso";

          }


          return;
        }


        await completeStudentRegistrationUi(
          nameInput,
          emailInput,
          passwordInput,
          confirmInput,
          durationSelect,
          button,
          message,
          email,
          false
        );


        return;
      }


      console.error(
        "Erro ao recuperar acesso existente:",
        recoveryError
      );


      showError(
        recoveryError.message ||
        "Este e-mail ja possui um acesso cadastrado."
      );

    }

    else {

      showError(
        authError.message ||
        "Nao foi possivel criar o acesso do aluno."
      );

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar aluno e acesso";

    }


    return;
  }


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
        "Criar aluno e acesso";

    }


    return;
  }


  // Em configuracoes que ocultam a existencia
  // de usuarios ja cadastrados, Supabase pode
  // retornar identities vazio. Neste caso, tentamos
  // concluir um cadastro parcial anterior.
  if (
    Array.isArray(
      authUser.identities
    ) &&
    authUser.identities.length ===
      0
  ) {

    if (message) {

      message.textContent =
        "Este acesso ja existe no Auth. Tentando concluir o cadastro do aluno...";

      message.style.color =
        "#555";

    }


    const {
      data: recoveredStudentId,
      error: recoveryError
    } =
      await recoverExistingStudentAccess(
          name,
          email,
          duration,
          schedule,
          billingType,
          monthlyFee,
          lessonFee,
          dueDay,
          invoiceRequired,
          birthDate
        );


    if (recoveryError) {

      console.error(
        "Erro ao recuperar acesso existente:",
        recoveryError
      );


      showError(
        recoveryError.message ||
        "Este e-mail ja possui um acesso cadastrado."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar aluno e acesso";

      }


      return;
    }


    const {
      error: contractError
    } =
      await saveStudentContractAfterRegistration(
        recoveredStudentId,
        contractStartDate,
        contractEndDate,
        contractNotes
      );


    if (contractError) {

      console.error(
        "Aluno recuperado, mas o contrato falhou:",
        contractError
      );


      showError(
        "O aluno foi cadastrado, mas nao foi possivel salvar o contrato: "
        +
        (
          contractError.message ||
          "erro desconhecido"
        )
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar aluno e acesso";

      }


      return;
    }


    const {
      error: classLinkError
    } =
      await saveStudentClassLinkAfterRegistration(
        recoveredStudentId,
        classLink
      );


    if (classLinkError) {

      showError(
        "O aluno foi cadastrado, mas nao foi possivel salvar o link da aula: "
        +
        (
          classLinkError.message ||
          "erro desconhecido"
        )
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar aluno e acesso";

      }


      return;
    }


    await completeStudentRegistrationUi(
      nameInput,
      emailInput,
      passwordInput,
      confirmInput,
      durationSelect,
      button,
      message,
      email,
      false
    );


    return;
  }


  if (message) {

    message.textContent =
      "Acesso criado. Finalizando cadastro do aluno...";

  }


  const {
    data: newStudentId,
    error: studentError
  } =
    await finishStudentRegistration(
      authUser.id,
      name,
      email,
      duration,
      schedule,
      billingType,
      monthlyFee,
      lessonFee,
      dueDay,
      invoiceRequired,
      birthDate
    );


  if (studentError) {

    console.error(
      "Erro ao vincular aluno ao acesso:",
      studentError
    );


    showError(
      "O acesso foi criado no Supabase, mas o cadastro do aluno falhou: " +
      (
        studentError.message ||
        "erro desconhecido"
      )
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar aluno e acesso";

    }


    return;
  }


  const {
    error: contractError
  } =
    await saveStudentContractAfterRegistration(
      newStudentId,
      contractStartDate,
      contractEndDate,
      contractNotes
    );


  if (contractError) {

    console.error(
      "Aluno criado, mas o contrato falhou:",
      contractError
    );


    showError(
      "O aluno e o acesso foram criados, mas nao foi possivel salvar o contrato: "
      +
      (
        contractError.message ||
        "erro desconhecido"
      )
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar aluno e acesso";

    }


    return;
  }


  const {
    error: classLinkError
  } =
    await saveStudentClassLinkAfterRegistration(
      newStudentId,
      classLink
    );


  if (classLinkError) {

    showError(
      "O aluno foi criado, mas nao foi possivel salvar o link da aula: "
      +
      (
        classLinkError.message ||
        "erro desconhecido"
      )
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar aluno e acesso";

    }


    return;
  }


  await completeStudentRegistrationUi(
    nameInput,
    emailInput,
    passwordInput,
    confirmInput,
    durationSelect,
    button,
    message,
    email,
    Boolean(
      authData.session
    )
  );

}


// =====================================================
// FINALIZAR INTERFACE APOS CADASTRO
// =====================================================

async function completeStudentRegistrationUi(
  nameInput,
  emailInput,
  passwordInput,
  confirmInput,
  durationSelect,
  button,
  message,
  email,
  hasSession
) {

  nameInput.value =
    "";

  emailInput.value =
    "";


  const classLinkInput =
    document.getElementById(
      "newStudentClassLink"
    );


  if (classLinkInput) {

    classLinkInput.value =
      "";

  }


  passwordInput.value =
    "";

  confirmInput.value =
    "";

  durationSelect.value =
    "60";


  const birthDateInput =
    document.getElementById(
      "newStudentBirthDate"
    );


  if (birthDateInput) {

    birthDateInput.value =
      "";

  }


  const contractStartInput =
    document.getElementById(
      "newStudentContractStartDate"
    );


  const contractEndInput =
    document.getElementById(
      "newStudentContractEndDate"
    );


  const contractNotesInput =
    document.getElementById(
      "newStudentContractNotes"
    );


  if (contractStartInput) {

    contractStartInput.value =
      formatDateForDatabase(
        new Date()
      );

  }


  if (contractEndInput) {

    contractEndInput.value =
      "";

  }


  if (contractNotesInput) {

    contractNotesInput.value =
      "";

  }


  const billingTypeSelect =
    document.getElementById(
      "newStudentBillingType"
    );


  const monthlyFeeInput =
    document.getElementById(
      "newStudentMonthlyFee"
    );


  const lessonFeeInput =
    document.getElementById(
      "newStudentLessonFee"
    );


  const dueDayInput =
    document.getElementById(
      "newStudentDueDay"
    );


  const invoiceInput =
    document.getElementById(
      "newStudentInvoiceDefault"
    );


  if (billingTypeSelect) {
    billingTypeSelect.value =
      "monthly";
  }


  if (monthlyFeeInput) {
    monthlyFeeInput.value =
      "";
  }


  if (lessonFeeInput) {
    lessonFeeInput.value =
      "";
  }


  if (dueDayInput) {
    dueDayInput.value =
      "1";
  }


  if (invoiceInput) {
    invoiceInput.checked =
      false;
  }


  updateNewStudentBillingFields();


  resetStudentFixedScheduleEditor(
    "newStudentFixedScheduleRows"
  );


  if (message) {

    message.innerHTML = `

      <strong>
        Aluno, acesso, contrato e horarios cadastrados com sucesso.
      </strong>

      <br>

      E-mail:
      ${escapeHtml(
        email
      )}

      <br>

      O acesso ja pode ser usado para login.

    `;

    message.style.color =
      "green";

  }


  await loadTeacherStudentOverview();


  currentTeacherStudents =
    [];


  await loadTeacherStudents();


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Criar aluno e acesso";

  }

}


// =====================================================
// CARREGAR RESUMO DOS ALUNOS
// =====================================================

async function loadTeacherStudentOverview() {

  const container =
    document.getElementById(
      "teacherStudentList"
    );


  if (!container) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_student_overview"
    );


  if (error) {

    console.error(
      "Erro ao carregar alunos:",
      error
    );


    container.innerHTML = `

      <p>
        Nao foi possivel carregar os alunos.
      </p>

    `;


    return;
  }


  teacherStudentOverviewData =
    (data || [])
      .filter(
        student =>
          student.active !==
            false
      );


  renderTeacherStudentOverview();

}


// =====================================================
// RENDERIZAR LISTA DOS ALUNOS
// =====================================================

function renderTeacherStudentOverview(
  searchText = ""
) {

  const container =
    document.getElementById(
      "teacherStudentList"
    );


  if (!container) {
    return;
  }


  const normalizedSearch =
    String(
      searchText || ""
    )
      .trim()
      .toLowerCase();


  const students =
    teacherStudentOverviewData.filter(
      student => {

        if (!normalizedSearch) {
          return true;
        }


        return String(
          student.student_name || ""
        )
          .toLowerCase()
          .includes(
            normalizedSearch
          );

      }
    );


  if (students.length === 0) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        Nenhum aluno encontrado.
      </div>

    `;


    return;
  }


  container.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
        gap:14px;
      "
    >

      ${students
        .map(
          renderTeacherStudentOverviewCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".open-teacher-student-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          openTeacherStudentDetail(
            button.dataset.studentId
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".delete-teacher-student-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTeacherStudent(
            button.dataset.studentId,
            button.dataset.studentName
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".toggle-teacher-student-pause-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const currentlyPaused =
            button.dataset.paused ===
              "true";


          if (currentlyPaused) {

            const keepReserved =
              button.dataset.keepReserved ===
                "true";


            if (keepReserved) {

              resumeTeacherStudentKeepingSchedule(
                button.dataset.studentId,
                button.dataset.studentName
              );

            }

            else {

              openTeacherStudentResumeOptions(
                button.dataset.studentId,
                button.dataset.studentName
              );

            }

          }

          else {

            openTeacherStudentPauseOptions(
              button.dataset.studentId,
              button.dataset.studentName
            );

          }

        }
      );

    });

}


// =====================================================
// CARD DO ALUNO
// =====================================================

function renderTeacherStudentOverviewCard(
  student
) {

  return `

    <div
      style="
        border:1px solid #ddd;
        border-radius:12px;
        padding:18px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:12px;
        "
      >

        <div>

          <strong
            style="
              font-size:19px;
            "
          >
            ${escapeHtml(
              student.student_name
            )}
          </strong>


          <div
            style="
              margin-top:5px;
              color:#666;
            "
          >
            Aula de
            ${Number(
              student.class_duration_minutes || 0
            )}
            min
          </div>

        </div>


        <span
          style="
            font-weight:bold;
            color:${
              student.classes_paused
                ? "#856404"
                : "#246b37"
            };
          "
        >
          ${
            student.classes_paused
              ? "Aulas pausadas"
              : "Ativo"
          }
        </span>

      </div>


      ${
        Number(
          student.unread_comments || 0
        ) > 0

          ? `

            <div
              style="
                margin-top:12px;
                padding:9px 11px;
                border-radius:8px;
                background:#fff3cd;
                color:#7a5d00;
                font-weight:bold;
              "
            >
              ${Number(
                student.unread_comments || 0
              )}
              comentario(s) novo(s) do aluno
            </div>

          `

          : ""
      }


      ${
        student.student_is_minor ===
          true
        &&
        Number(
          student.guardian_count || 0
        ) === 0

          ? `

            <div
              style="
                margin-top:12px;
                padding:10px 12px;
                border-radius:8px;
                background:#fdecea;
                color:#8a1f17;
                font-weight:bold;
              "
            >
              Menor de 18 anos sem responsavel vinculado.

              <div
                style="
                  margin-top:4px;
                  font-size:12px;
                  font-weight:normal;
                "
              >
                O aluno nao ve os valores financeiros.
                Cadastre um responsavel em "Ver aluno".
              </div>
            </div>

          `

          : ""
      }


      <div
        style="
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:8px;
          margin-top:15px;
        "
      >

        <div>
          <strong>
            ${Number(
              student.present_count || 0
            )}
          </strong>
          presentes
        </div>

        <div>
          <strong>
            ${Number(
              student.absent_count || 0
            )}
          </strong>
          faltas sem justificativa
        </div>

        <div>
          <strong>
            ${Number(
              student.justified_absence_count || 0
            )}
          </strong>
          faltas justificadas
        </div>

        <div>
          <strong>
            ${Number(
              student.available_makeups || 0
            )}
          </strong>
          reposicoes disponiveis
        </div>

      </div>


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <button
          type="button"
          class="action-button open-teacher-student-button"
          data-student-id="${student.student_id}"
        >
          Ver aluno
        </button>


        <button
          type="button"
          class="secondary-button toggle-teacher-student-pause-button"
          data-student-id="${student.student_id}"
          data-student-name="${escapeHtml(
            student.student_name
          )}"
          data-paused="${student.classes_paused
            ? "true"
            : "false"}"
          data-keep-reserved="${
            student.pause_keep_slot_reserved !== false
              ? "true"
              : "false"
          }"
          style="
            border-color:#856404;
            color:#856404;
          "
        >
          ${
            student.classes_paused
              ? "Ativar aulas"
              : "Desativar aulas"
          }
        </button>


        <button
          type="button"
          class="secondary-button delete-teacher-student-button"
          data-student-id="${student.student_id}"
          data-student-name="${escapeHtml(
            student.student_name
          )}"
          style="
            border-color:#c0392b;
            color:#c0392b;
          "
        >
          Excluir aluno
        </button>

      </div>

    </div>

  `;

}


// =====================================================
// ATIVAR AULAS MANTENDO O HORARIO QUE FICOU RESERVADO
// =====================================================

async function resumeTeacherStudentKeepingSchedule(
  studentId,
  studentName
) {

  const confirmed =
    window.confirm(

      "Ativar novamente as aulas de \"" +
      String(
        studentName || ""
      ) +
      "\"?\n\n" +

      "Como o horario ficou reservado durante a pausa, " +
      "o aluno voltara automaticamente para os mesmos dias e horarios."

    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "resume_teacher_student_after_pause",
      {

        p_student_id:
          studentId,

        p_schedule:
          null

      }
    );


  if (error) {

    console.error(
      "Erro ao ativar aluno mantendo horario:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel ativar as aulas."
    );


    return;
  }


  currentTeacherStudents =
    [];


  await loadTeacherStudents();

  await loadTeacherStudentOverview();


  const detailArea =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (detailArea) {

    detailArea.innerHTML =
      "";

  }


  alert(
    "Aulas ativadas. O horario anterior foi restaurado."
  );

}


// =====================================================
// ATIVAR AULAS COM NOVOS DIAS / HORARIOS
// =====================================================

function openTeacherStudentResumeOptions(
  studentId,
  studentName
) {

  const area =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (!area) {
    return;
  }


  const student =
    teacherStudentOverviewData.find(
      item =>
        String(
          item.student_id
        ) ===
        String(
          studentId
        )
    );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #246b37;
      "
    >

      <h3>
        Ativar aulas
      </h3>


      <p>
        <strong>Aluno:</strong>

        ${escapeHtml(
          studentName ||
          "Aluno"
        )}
      </p>


      <div
        style="
          padding:14px;
          background:#fff3cd;
          border-radius:8px;
          margin-top:15px;
        "
      >

        <strong>
          Escolha a nova agenda fixa.
        </strong>

        <p
          style="
            margin-bottom:0;
          "
        >
          O horario que o aluno tinha antes da pausa
          nao sera restaurado automaticamente.
          Para ativar as aulas e obrigatorio escolher
          novamente os dias e horarios.
        </p>

      </div>


      <p
        style="
          margin-top:16px;
        "
      >
        Duracao da aula:
        <strong>
          ${Number(
            student
              ? student.class_duration_minutes
              : 0
          )}
          minutos
        </strong>
      </p>


      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
          margin-top:18px;
        "
      >

        <strong>
          Novos dias e horarios
        </strong>


        <button
          type="button"
          class="secondary-button"
          id="addResumeStudentScheduleRowButton"
        >
          + Adicionar dia / horario
        </button>

      </div>


      <div
        id="resumeStudentFixedScheduleRows"
      ></div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="confirmResumeStudentButton"
        >
          Ativar com nova agenda
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelResumeStudentButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="resumeStudentMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  resetStudentFixedScheduleEditor(
    "resumeStudentFixedScheduleRows"
  );


  const addButton =
    document.getElementById(
      "addResumeStudentScheduleRowButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      () => {

        addStudentFixedScheduleRow(
          "resumeStudentFixedScheduleRows"
        );

      }
    );

  }


  const confirmButton =
    document.getElementById(
      "confirmResumeStudentButton"
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      () => {

        resumeTeacherStudentWithNewSchedule(
          studentId,
          studentName
        );

      }
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelResumeStudentButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


async function resumeTeacherStudentWithNewSchedule(
  studentId,
  studentName
) {

  const message =
    document.getElementById(
      "resumeStudentMessage"
    );


  const button =
    document.getElementById(
      "confirmResumeStudentButton"
    );


  const result =
    collectStudentFixedSchedule(
      "resumeStudentFixedScheduleRows"
    );


  if (result.error) {

    if (message) {

      message.textContent =
        result.error;

      message.style.color =
        "red";

    }

    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Ativando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "resume_teacher_student_after_pause",
      {

        p_student_id:
          studentId,

        p_schedule:
          result.schedule

      }
    );


  if (error) {

    console.error(
      "Erro ao ativar aluno com nova agenda:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel ativar as aulas.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Ativar com nova agenda";

    }

    return;
  }


  currentTeacherStudents =
    [];


  await loadTeacherStudents();

  await loadTeacherStudentOverview();


  const detailArea =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (detailArea) {

    detailArea.innerHTML =
      "";

  }


  alert(
    "Aulas de \"" +
    String(
      studentName || ""
    ) +
    "\" ativadas com a nova agenda."
  );

}


// =====================================================
// ESCOLHER COMO FICA O HORARIO DURANTE A PAUSA
// =====================================================

function openTeacherStudentPauseOptions(
  studentId,
  studentName
) {

  const area =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (!area) {
    return;
  }


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #856404;
      "
    >

      <h3>
        Desativar aulas temporariamente
      </h3>


      <p>
        <strong>Aluno:</strong>

        ${escapeHtml(
          studentName ||
          "Aluno"
        )}
      </p>


      <div
        style="
          padding:14px;
          border-radius:8px;
          background:#f7e9e1;
          margin-top:15px;
        "
      >

        <strong>
          O que continua funcionando durante a pausa
        </strong>

        <p
          style="
            margin-bottom:0;
          "
        >
          O login do aluno continua ativo.
          Ele continua podendo entrar na Aulora,
          ver suas reposicoes e marcar reposicoes normalmente.
          Somente as aulas fixas ficam pausadas.
        </p>

      </div>


      <div
        style="
          margin-top:20px;
        "
      >

        <strong>
          O que fazer com o horario fixo durante a pausa?
        </strong>


        <label
          style="
            display:block;
            margin-top:12px;
            padding:12px;
            border:1px solid #ddd;
            border-radius:8px;
            cursor:pointer;
          "
        >

          <input
            type="radio"
            name="studentPauseSlotOption"
            value="reserved"
            checked
          >

          <strong>
            Manter o horario reservado
          </strong>

          <div
            style="
              margin-top:5px;
              color:#666;
              font-size:13px;
            "
          >
            O horario nao podera ser usado por outro aluno
            nem para outra reposicao durante a pausa.
          </div>

        </label>


        <label
          style="
            display:block;
            margin-top:10px;
            padding:12px;
            border:1px solid #ddd;
            border-radius:8px;
            cursor:pointer;
          "
        >

          <input
            type="radio"
            name="studentPauseSlotOption"
            value="released"
          >

          <strong>
            Liberar o horario durante a pausa
          </strong>

          <div
            style="
              margin-top:5px;
              color:#666;
              font-size:13px;
            "
          >
            O horario ficara livre somente durante o periodo
            da pausa e podera receber reposicoes.
            Ao ativar as aulas novamente, o professor
            devera escolher novos dias e horarios.
            O horario antigo nao volta automaticamente.
          </div>

        </label>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="confirmStudentPauseButton"
        >
          Confirmar pausa
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelStudentPauseOptionsButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="studentPauseOptionsMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const confirmButton =
    document.getElementById(
      "confirmStudentPauseButton"
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      () => {

        const selected =
          document.querySelector(
            'input[name="studentPauseSlotOption"]:checked'
          );


        const keepSlotReserved =
          !selected
          ||
          selected.value ===
            "reserved";


        toggleTeacherStudentPause(
          studentId,
          studentName,
          false,
          keepSlotReserved
        );

      }
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelStudentPauseOptionsButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// PAUSAR / RETOMAR AULAS DO ALUNO
// =====================================================

async function toggleTeacherStudentPause(
  studentId,
  studentName,
  currentlyPaused,
  keepSlotReserved = true
) {

  const newPaused =
    !currentlyPaused;


  if (!newPaused) {

    openTeacherStudentResumeOptions(
      studentId,
      studentName
    );

    return;

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "set_teacher_student_paused",
      {

        p_student_id:
          studentId,

        p_paused:
          newPaused,

        p_keep_slot_reserved:
          keepSlotReserved

      }
    );


  if (error) {

    console.error(
      "Erro ao alterar pausa do aluno:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel alterar o status das aulas."
    );


    return;
  }


  currentTeacherStudents =
    [];


  await loadTeacherStudents();

  await loadTeacherStudentOverview();


  const detailArea =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (detailArea) {

    detailArea.innerHTML =
      "";

  }


  alert(
    newPaused

      ? (
          keepSlotReserved
            ? "Aulas pausadas. O horario fixo continuara reservado."
            : "Aulas pausadas. O horario ficara livre durante a pausa."
        )

      : "Aulas retomadas com sucesso."
  );

}


// =====================================================
// EXCLUIR ALUNO
// =====================================================

async function deleteTeacherStudent(
  studentId,
  studentName
) {

  const confirmed =
    window.confirm(

      "Excluir o aluno \"" +
      String(
        studentName || ""
      ) +
      "\"?\n\n" +

      "O aluno sumira da lista, o acesso a Aulora sera bloqueado " +
      "e os horarios futuros dele serao liberados.\n\n" +

      "O historico das aulas passadas sera preservado."

    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_student",
      {
        p_student_id:
          studentId
      }
    );


  if (error) {

    console.error(
      "Erro ao excluir aluno:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel excluir o aluno."
    );


    return;
  }


  const detailArea =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (detailArea) {

    detailArea.innerHTML =
      "";

  }


  currentTeacherStudents =
    [];


  await loadTeacherStudents();

  await loadTeacherStudentOverview();


  alert(
    "Aluno excluido com sucesso."
  );

}


// =====================================================
// SALVAR LINK DO ALUNO EM "VER ALUNO"
// =====================================================

async function saveTeacherStudentClassLink(
  studentId
) {

  const input =
    document.getElementById(
      "teacherStudentClassLinkInput"
    );


  const message =
    document.getElementById(
      "teacherStudentClassLinkMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherStudentClassLinkButton"
    );


  if (!input) {
    return;
  }


  const value =
    input.value.trim() ||
    null;


  if (
    value &&
    !/^https?:\/\//i.test(
      value
    )
  ) {

    if (message) {

      message.textContent =
        "O link precisa comecar com http:// ou https://.";

      message.style.color =
        "red";

    }


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
      "save_teacher_student_class_link",
      {
        p_student_id:
          studentId,

        p_class_link:
          value
      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar link";

  }


  if (error) {

    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o link.";

      message.style.color =
        "red";

    }


    return;
  }


  if (message) {

    message.textContent =
      "Link salvo com sucesso.";

    message.style.color =
      "green";

  }


  await loadTeacherClassLinksForAgenda();

}


// =====================================================
// DETALHE DO ALUNO
// =====================================================

async function openTeacherStudentDetail(
  studentId
) {

  const area =
    document.getElementById(
      "teacherStudentDetailArea"
    );


  if (!area) {
    return;
  }


  const student =
    teacherStudentOverviewData.find(
      item =>
        String(
          item.student_id
        ) ===
        String(
          studentId
        )
    );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >

      <h3>
        ${escapeHtml(
          student
            ? student.student_name
            : "Aluno"
        )}
      </h3>

      <p>
        Carregando historico...
      </p>

    </div>

  `;


  const [
    contractResult,
    contractHistoryResult,
    scheduleResult,
    financialSettingsResult,
    historyResult,
    makeupResult,
    commentsResult,
    guardiansResult,
    classLinkResult,
    personalResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_teacher_student_contract",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_contract_history",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_fixed_schedule",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_financial_settings",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_lesson_history",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_makeups",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_lesson_comments",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_guardians",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_class_link",
        {
          p_student_id:
            studentId
        }
      ),

      supabaseClient.rpc(
        "get_teacher_student_personal_data_v2",
        {
          p_student_id:
            studentId
        }
      )

    ]);


  if (
    contractResult.error ||
    contractHistoryResult.error ||
    scheduleResult.error ||
    financialSettingsResult.error ||
    historyResult.error ||
    makeupResult.error ||
    commentsResult.error ||
    guardiansResult.error ||
    classLinkResult.error ||
    personalResult.error
  ) {

    console.error(
      "Erro ao carregar detalhes do aluno:",
      contractResult.error ||
      contractHistoryResult.error ||
      scheduleResult.error ||
      financialSettingsResult.error ||
      historyResult.error ||
      makeupResult.error ||
      commentsResult.error ||
      guardiansResult.error ||
      classLinkResult.error ||
      personalResult.error
    );


    area.innerHTML = `

      <div class="card">

        <p>
          Nao foi possivel carregar os detalhes do aluno.
        </p>

      </div>

    `;


    return;
  }


  const contract =
    (
      Array.isArray(
        contractResult.data
      )
        ? contractResult.data[0]
        : contractResult.data
    )
    || {};


  const contractHistory =
    contractHistoryResult.data || [];


  const fixedSchedule =
    scheduleResult.data || [];


  const financialSettings =
    (
      Array.isArray(
        financialSettingsResult.data
      )
        ? financialSettingsResult.data[0]
        : financialSettingsResult.data
    )
    || {};


  const history =
    historyResult.data || [];


  const makeups =
    makeupResult.data || [];


  const studentComments =
    commentsResult.data || [];


  const guardians =
    guardiansResult.data || [];


  const classLink =
    (
      Array.isArray(
        classLinkResult.data
      )
        ? classLinkResult.data[0]
        : classLinkResult.data
    )
    || {};

  const personalData =
    (
      Array.isArray(personalResult.data)
        ? personalResult.data[0]
        : personalResult.data
    ) || {};


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
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

          <h3
            style="
              margin-bottom:5px;
            "
          >
            ${escapeHtml(
              student
                ? student.student_name
                : "Aluno"
            )}
          </h3>


          <p
            style="
              margin:0;
            "
          >
            Duracao da aula:
            <strong>
              ${Number(
                student
                  ? student.class_duration_minutes
                  : 0
              )}
              minutos
            </strong>
          </p>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="closeTeacherStudentDetailButton"
        >
          Fechar
        </button>

      </div>


      <div style="margin-top:24px;padding:16px;border:1px solid #e7dfd5;border-radius:10px;background:#ffffff;">
        <h4 style="margin-top:0;">Dados pessoais</h4>
        <div class="erp-form-grid">
          <div><label>Nome</label><input id="teacherStudentPersonalName" value="${escapeHtml(personalData.student_name || "")}"></div>
          <div><label>E-mail</label><input id="teacherStudentPersonalEmail" type="email" value="${escapeHtml(personalData.student_email || "")}" data-original-email="${escapeHtml(personalData.student_email || "")}" data-profile-id="${personalData.profile_id || ""}"></div>
          <div><label>Telefone</label><input id="teacherStudentPersonalPhone" value="${escapeHtml(personalData.phone || "")}"></div>
          <div><label>CPF</label><input id="teacherStudentPersonalCpf" value="${escapeHtml(personalData.cpf || "")}"></div>
        </div>
        <button type="button" class="secondary-button" id="saveTeacherStudentPersonalButton" style="margin-top:12px;">Salvar dados pessoais</button>
        <p id="teacherStudentPersonalMessage"></p>
      </div>


      <div
        style="
          margin-top:24px;
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
          background:#ffffff;
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
              Contrato
            </h4>


            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              Registre o periodo contratual deste aluno.
              O termino do contrato nao desativa as aulas automaticamente.
            </p>

          </div>


          <strong
            style="
              padding:6px 10px;
              border-radius:999px;
              background:${
                contract.contract_status ===
                  "expired"
                  ? "#fdecea"
                  : (
                      contract.contract_status ===
                        "expiring"
                        ? "#fff3cd"
                        : "#eef8f0"
                    )
              };
            "
          >
            ${
              contract.contract_status ===
                "expired"
                ? "Contrato vencido"
                : (
                    contract.contract_status ===
                      "expiring"
                      ? "Vence em breve"
                      : (
                          contract.contract_status ===
                            "open"
                            ? "Sem data de termino"
                            : "Contrato ativo"
                        )
                  )
            }
          </strong>

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
            gap:12px;
            margin-top:15px;
          "
        >

          <div>

            <label
              for="teacherStudentContractStartDate"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Inicio do contrato
            </label>


            <input
              type="date"
              id="teacherStudentContractStartDate"
              value="${escapeHtml(
                contract.contract_start_date || ""
              )}"
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
              for="teacherStudentContractEndDate"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Termino do contrato
            </label>


            <input
              type="date"
              id="teacherStudentContractEndDate"
              value="${escapeHtml(
                contract.contract_end_date || ""
              )}"
              style="
                width:100%;
                box-sizing:border-box;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >


            <div
              style="
                margin-top:5px;
                color:#666;
                font-size:12px;
              "
            >
              Deixe em branco se o contrato nao tiver data de termino.
            </div>

          </div>

        </div>


        <div
          style="
            margin-top:14px;
          "
        >

          <label
            for="teacherStudentContractNotes"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Observacoes contratuais
          </label>


          <textarea
            id="teacherStudentContractNotes"
            rows="3"
            maxlength="3000"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
              resize:vertical;
              font-family:inherit;
            "
          >${escapeHtml(
            contract.contract_notes || ""
          )}</textarea>

        </div>


        <div
          style="
            display:flex;
            gap:9px;
            flex-wrap:wrap;
            margin-top:14px;
          "
        >

          <button
            type="button"
            class="secondary-button"
            id="saveTeacherStudentContractButton"
          >
            Salvar alteracoes
          </button>


          <button
            type="button"
            class="action-button"
            id="renewTeacherStudentContractButton"
          >
            Renovar contrato
          </button>

        </div>


        <p
          id="teacherStudentContractMessage"
          style="
            margin-top:10px;
          "
        ></p>


        <details
          style="
            margin-top:16px;
            border-top:1px solid #e5e5e5;
            padding-top:14px;
          "
        >

          <summary
            style="
              cursor:pointer;
              font-weight:bold;
            "
          >
            Historico de contratos
            (${contractHistory.length})
          </summary>


          <div
            style="
              display:grid;
              gap:9px;
              margin-top:12px;
            "
          >

            ${
              contractHistory.length === 0

                ? `

                  <div
                    style="
                      padding:12px;
                      border-radius:8px;
                      background:#fffaf3;
                    "
                  >
                    Ainda nao existem contratos anteriores.
                  </div>

                `

                : contractHistory
                    .map(
                      renderTeacherStudentContractHistoryRow
                    )
                    .join("")
            }

          </div>

        </details>

      </div>


      <div
        style="
          margin-top:24px;
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
          background:#f7e9e1;
        "
      >

        <h4
          style="
            margin:0;
          "
        >
          Link da aula
        </h4>


        <p
          style="
            margin:5px 0 12px;
            color:#666;
            font-size:13px;
          "
        >
          Voce pode cadastrar ou alterar o link permanente
          deste aluno a qualquer momento.
        </p>


        <div
          style="
            display:flex;
            gap:8px;
            align-items:center;
            flex-wrap:wrap;
          "
        >

          <input
            type="url"
            id="teacherStudentClassLinkInput"
            maxlength="2000"
            value="${escapeHtml(
              classLink.class_link || ""
            )}"
            placeholder="https://meet.google.com/..."
            style="
              flex:1;
              min-width:230px;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >


          ${
            classLink.class_link

              ? `

                <a
                  href="${safeHrefV3(
                    classLink.class_link
                  )}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="secondary-button"
                  style="
                    text-decoration:none;
                  "
                >
                  Abrir aula
                </a>

              `

              : ""
          }


          <button
            type="button"
            class="action-button"
            id="saveTeacherStudentClassLinkButton"
          >
            Salvar link
          </button>

        </div>


        <p
          id="teacherStudentClassLinkMessage"
          style="
            margin:9px 0 0;
            font-size:13px;
          "
        ></p>

      </div>


      <div
        style="
          margin-top:24px;
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
          background:#fffaf3;
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
              Dias e horarios das aulas fixas
            </h4>

            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              Esta e a agenda fixa atual deste aluno.
            </p>

          </div>


          <button
            type="button"
            class="secondary-button"
            id="editTeacherStudentScheduleButton"
          >
            Modificar dias / horarios
          </button>

        </div>


        <div
          style="
            display:grid;
            gap:8px;
            margin-top:14px;
          "
        >

          ${
            fixedSchedule.length === 0

              ? `

                <div
                  style="
                    padding:12px;
                    background:#ffffff;
                    border-radius:8px;
                  "
                >
                  Nenhum horario fixo cadastrado.
                </div>

              `

              : fixedSchedule
                  .map(
                    item => `

                      <div
                        style="
                          padding:12px;
                          background:#ffffff;
                          border:1px solid #e5e5e5;
                          border-radius:8px;
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
                  .join("")
          }

        </div>


        <div
          id="teacherStudentScheduleEditArea"
          style="
            margin-top:15px;
          "
        ></div>

      </div>


      <div
        style="
          margin-top:20px;
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
          background:#ffffff;
        "
      >

        <h4
          style="
            margin-top:0;
          "
        >
          Configuracao financeira
        </h4>


        <div
          style="
            margin-bottom:14px;
            padding:12px;
            border-radius:8px;
            background:${
              financialSettings.financial_values_hidden
                ? "#fff3cd"
                : "#eef8f0"
            };
          "
        >

          ${
            !financialSettings.birth_date

              ? `

                <strong>
                  Data de nascimento pendente.
                </strong>

                <div
                  style="
                    margin-top:5px;
                  "
                >
                  Por seguranca, enquanto a idade nao estiver cadastrada,
                  os valores ficam ocultos no login do aluno.
                </div>

              `

              : financialSettings.student_is_minor

                ? `

                  <strong>
                    Aluno menor de 18 anos.
                  </strong>

                  <div
                    style="
                      margin-top:5px;
                    "
                  >
                    Os valores financeiros ficam visiveis somente
                    no acesso do responsavel.
                  </div>

                `

                : `

                  <strong>
                    Aluno maior de idade.
                  </strong>

                  <div
                    style="
                      margin-top:5px;
                    "
                  >
                    O proprio aluno pode consultar os valores financeiros.
                  </div>

                `
          }

        </div>


        <div
          style="
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:12px;
          "
        >

          <div>

            <label
              for="teacherStudentBirthDate"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Data de nascimento
            </label>


            <input
              type="date"
              id="teacherStudentBirthDate"
              value="${escapeHtml(
                financialSettings.birth_date || ""
              )}"
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
              for="teacherStudentBillingType"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Tipo de cobranca
            </label>


            <select
              id="teacherStudentBillingType"
              style="
                width:100%;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

              <option
                value="monthly"
                ${
                  (
                    financialSettings.billing_type ||
                    "monthly"
                  ) ===
                  "monthly"
                    ? "selected"
                    : ""
                }
              >
                Valor mensal
              </option>


              <option
                value="per_lesson"
                ${
                  financialSettings.billing_type ===
                  "per_lesson"
                    ? "selected"
                    : ""
                }
              >
                Valor por aula
              </option>

            </select>

          </div>


          <div
            id="teacherStudentMonthlyFeeField"
          >

            <label
              for="teacherStudentMonthlyFee"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Valor mensal
            </label>


            <input
              type="number"
              id="teacherStudentMonthlyFee"
              min="0"
              step="0.01"
              value="${
                financialSettings.monthly_fee != null
                  ? Number(
                      financialSettings.monthly_fee
                    ).toFixed(
                      2
                    )
                  : ""
              }"
              placeholder="0,00"
              style="
                width:100%;
                box-sizing:border-box;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

          </div>


          <div
            id="teacherStudentLessonFeeField"
          >

            <label
              for="teacherStudentLessonFee"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Valor por aula
            </label>


            <input
              type="number"
              id="teacherStudentLessonFee"
              min="0"
              step="0.01"
              value="${
                financialSettings.lesson_fee != null
                  ? Number(
                      financialSettings.lesson_fee
                    ).toFixed(
                      2
                    )
                  : ""
              }"
              placeholder="0,00"
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
              for="teacherStudentDueDay"
              style="
                display:block;
                font-weight:bold;
                margin-bottom:7px;
              "
            >
              Dia do vencimento
            </label>


            <input
              type="number"
              id="teacherStudentDueDay"
              min="1"
              max="31"
              step="1"
              value="${Number(
                financialSettings.payment_due_day || 1
              )}"
              style="
                width:100%;
                box-sizing:border-box;
                padding:10px;
                border:1px solid #ccc;
                border-radius:8px;
              "
            >

          </div>

        </div>


        <label
          style="
            display:block;
            margin-top:14px;
          "
        >

          <input
            type="checkbox"
            id="teacherStudentInvoiceDefault"
            ${
              financialSettings.invoice_required_default
                ? "checked"
                : ""
            }
          >

          Normalmente precisa de nota fiscal

        </label>


        <button
          type="button"
          class="secondary-button"
          id="saveTeacherStudentFinancialSettingsButton"
          style="
            margin-top:14px;
          "
        >
          Salvar configuracao financeira
        </button>


        <p
          id="teacherStudentFinancialSettingsMessage"
          style="
            margin-top:10px;
          "
        ></p>

      </div>


      <div
        style="
          margin-top:20px;
          padding:16px;
          border:1px solid #e7dfd5;
          border-radius:10px;
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

          <div>

            <h4
              style="
                margin:0;
              "
            >
              Acesso de responsavel
            </h4>


            <p
              style="
                margin:5px 0 0;
                color:#666;
                font-size:13px;
              "
            >
              O responsavel possui login proprio e acesso somente para consulta.
            </p>


            ${
              financialSettings.student_is_minor
              &&
              guardians.length === 0

                ? `

                  <div
                    style="
                      margin-top:10px;
                      padding:10px;
                      border-radius:8px;
                      background:#fdecea;
                      color:#8a1f17;
                      font-weight:bold;
                    "
                  >
                    Este aluno e menor de 18 anos e ainda nao possui
                    responsavel vinculado.
                  </div>

                `

                : ""
            }

          </div>


          <button
            type="button"
            class="secondary-button"
            id="addTeacherStudentGuardianButton"
          >
            + Cadastrar / vincular responsavel
          </button>

        </div>


        <div
          id="teacherStudentGuardianFormArea"
          style="
            margin-top:14px;
          "
        ></div>


        <div
          style="
            display:grid;
            gap:8px;
            margin-top:14px;
          "
        >

          ${
            guardians.length === 0

              ? `

                <div
                  style="
                    padding:12px;
                    background:#fffaf3;
                    border-radius:8px;
                  "
                >
                  Nenhum responsavel vinculado.
                </div>

              `

              : guardians
                  .map(
                    guardian => `

                      <div
                        style="
                          display:flex;
                          justify-content:space-between;
                          align-items:center;
                          gap:10px;
                          flex-wrap:wrap;
                          padding:12px;
                          border:1px solid #e5e5e5;
                          border-radius:8px;
                        "
                      >

                        <div>

                          <strong>
                            ${escapeHtml(
                              guardian.guardian_name
                            )}
                          </strong>


                          <div
                            style="
                              margin-top:3px;
                              color:#666;
                            "
                          >
                            ${escapeHtml(
                              guardian.guardian_email
                            )}
                          </div>

                        </div>


                        <button
                          type="button"
                          class="secondary-button unlink-teacher-student-guardian-button"
                          data-guardian-profile-id="${guardian.guardian_profile_id}"
                          data-guardian-name="${escapeHtml(
                            guardian.guardian_name
                          )}"
                          style="
                            border-color:#c0392b;
                            color:#c0392b;
                          "
                        >
                          Remover vinculo
                        </button>

                      </div>

                    `
                  )
                  .join("")
          }

        </div>

      </div>


      <h4
        style="
          margin-top:28px;
        "
      >
        Reposicoes
      </h4>


      ${
        makeups.length === 0

          ? `

            <p>
              Nenhuma reposicao registrada.
            </p>

          `

          : `

            <div
              style="
                display:grid;
                gap:9px;
              "
            >

              ${makeups
                .map(
                  renderTeacherStudentMakeupRow
                )
                .join("")}

            </div>

          `
      }


      <h4
        style="
          margin-top:28px;
        "
      >
        Historico de aulas
      </h4>


      ${
        history.length === 0

          ? `

            <p>
              Nenhuma aula registrada.
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
                  record => {

                    const comments =
                      studentComments.filter(
                        comment =>
                          String(
                            comment.lesson_date
                          ) ===
                          String(
                            record.lesson_date
                          )
                          &&
                          normalizeTime(
                            comment.start_time
                          ) ===
                          normalizeTime(
                            record.start_time
                          )
                      );


                    return renderTeacherStudentHistoryRow(
                      record,
                      comments
                    );

                  }
                )
                .join("")}

            </div>

          `
      }

    </div>

  `;


  const saveContractButton =
    document.getElementById(
      "saveTeacherStudentContractButton"
    );


  if (saveContractButton) {

    saveContractButton.addEventListener(
      "click",
      () => {

        saveTeacherStudentContract(
          studentId
        );

      }
    );

  }


  const renewContractButton =
    document.getElementById(
      "renewTeacherStudentContractButton"
    );


  if (renewContractButton) {

    renewContractButton.addEventListener(
      "click",
      () => {

        renewTeacherStudentContract(
          studentId
        );

      }
    );

  }


  const editScheduleButton =
    document.getElementById(
      "editTeacherStudentScheduleButton"
    );


  if (editScheduleButton) {

    editScheduleButton.addEventListener(
      "click",
      () => {

        openTeacherStudentScheduleEditor(
          studentId,
          student
            ? student.student_name
            : "Aluno",
          fixedSchedule
        );

      }
    );

  }


  const studentBillingTypeSelect =
    document.getElementById(
      "teacherStudentBillingType"
    );


  if (studentBillingTypeSelect) {

    studentBillingTypeSelect.addEventListener(
      "change",
      updateTeacherStudentFinancialSettingsVisibility
    );


    updateTeacherStudentFinancialSettingsVisibility();

  }


  const saveFinancialSettingsButton =
    document.getElementById(
      "saveTeacherStudentFinancialSettingsButton"
    );


  if (saveFinancialSettingsButton) {

    saveFinancialSettingsButton.addEventListener(
      "click",
      () => {

        saveTeacherStudentFinancialSettings(
          studentId
        );

      }
    );

  }


  const addGuardianButton =
    document.getElementById(
      "addTeacherStudentGuardianButton"
    );


  if (addGuardianButton) {

    addGuardianButton.addEventListener(
      "click",
      () => {

        openTeacherStudentGuardianForm(
          studentId,
          student
            ? student.student_name
            : "Aluno"
        );

      }
    );

  }


  document
    .querySelectorAll(
      ".unlink-teacher-student-guardian-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          unlinkTeacherStudentGuardian(
            studentId,
            button.dataset.guardianProfileId,
            button.dataset.guardianName
          );

        }
      );

    });


  const classLinkSaveButton =
    document.getElementById(
      "saveTeacherStudentClassLinkButton"
    );


  if (classLinkSaveButton) {

    classLinkSaveButton.addEventListener(
      "click",
      () => {

        saveTeacherStudentClassLink(
          studentId
        );

      }
    );

  }


  const savePersonalButton =
    document.getElementById(
      "saveTeacherStudentPersonalButton"
    );

  if (savePersonalButton) {
    savePersonalButton.addEventListener(
      "click",
      () => saveTeacherStudentPersonalDataV2(
        studentId
      )
    );
  }


  const closeButton =
    document.getElementById(
      "closeTeacherStudentDetailButton"
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
    behavior: "smooth",
    block: "start"
  });


  if (
    studentComments.some(
      comment =>
        !comment.teacher_seen_at
    )
  ) {

    const {
      error: seenError
    } =
      await supabaseClient.rpc(
        "mark_teacher_student_comments_seen",
        {
          p_student_id:
            studentId
        }
      );


    if (seenError) {

      console.warn(
        "Nao foi possivel marcar os comentarios como vistos:",
        seenError
      );

    }

    else {

      if (student) {

        student.unread_comments =
          0;

      }


      renderTeacherStudentOverview();

    }

  }

}


// =====================================================
// RESPONSAVEIS SEM ALUNO ATIVO
// =====================================================

async function openTeacherOrphanGuardiansManager() {

  const area =
    document.getElementById(
      "teacherOrphanGuardianArea"
    );


  if (!area) {
    return;
  }


  if (
    area.style.display ===
      "block"
  ) {

    area.style.display =
      "none";

    area.innerHTML =
      "";

    return;
  }


  area.style.display =
    "block";


  await loadTeacherOrphanGuardians();


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// CARREGAR RESPONSAVEIS SEM ALUNO ATIVO
// =====================================================

async function loadTeacherOrphanGuardians() {

  const area =
    document.getElementById(
      "teacherOrphanGuardianArea"
    );


  if (!area) {
    return [];
  }


  area.style.display =
    "block";


  area.innerHTML = `

    <div
      style="
        padding:18px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#fffaf3;
      "
    >
      Carregando responsaveis sem aluno ativo...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_orphan_guardians"
    );


  if (error) {

    console.error(
      "Erro ao carregar responsaveis sem aluno ativo:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:18px;
          border:1px solid #d9534f;
          border-radius:10px;
          background:#ffffff;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar os responsaveis."
        )}
      </div>

    `;


    return [];
  }


  const guardians =
    data || [];


  area.innerHTML = `

    <div
      style="
        padding:18px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#ffffff;
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
            Responsaveis sem aluno ativo
          </h4>


          <p
            style="
              margin:6px 0 0;
              color:#666;
            "
          >
            Somente responsaveis que nao estao ligados a
            nenhum aluno ativo podem ter o login excluido.
          </p>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="closeOrphanGuardiansButton"
        >
          Fechar
        </button>

      </div>


      <div
        style="
          display:grid;
          gap:10px;
          margin-top:16px;
        "
      >

        ${
          guardians.length ===
            0

            ? `

              <div
                style="
                  padding:14px;
                  border-radius:8px;
                  background:#fffaf3;
                "
              >
                Nao existe nenhum responsavel disponivel para exclusao.
              </div>

            `

            : guardians
                .map(
                  guardian => `

                    <div
                      style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:12px;
                        flex-wrap:wrap;
                        padding:13px;
                        border:1px solid #e5e5e5;
                        border-radius:8px;
                      "
                    >

                      <div>

                        <strong>
                          ${escapeHtml(
                            guardian.guardian_name
                          )}
                        </strong>


                        <div
                          style="
                            margin-top:4px;
                            color:#666;
                          "
                        >
                          ${escapeHtml(
                            guardian.guardian_email
                          )}
                        </div>


                        ${
                          Number(
                            guardian.linked_inactive_students || 0
                          ) > 0

                            ? `

                              <div
                                style="
                                  margin-top:4px;
                                  font-size:12px;
                                  color:#777;
                                "
                              >
                                Possui apenas vinculo(s) historico(s)
                                com aluno(s) inativo(s).
                              </div>

                            `

                            : ""
                        }

                      </div>


                      <button
                        type="button"
                        class="secondary-button delete-orphan-guardian-button"
                        data-guardian-profile-id="${guardian.guardian_profile_id}"
                        data-guardian-name="${escapeHtml(
                          guardian.guardian_name
                        )}"
                        style="
                          border-color:#c0392b;
                          color:#c0392b;
                        "
                      >
                        Excluir responsavel e login
                      </button>

                    </div>

                  `
                )
                .join("")
        }

      </div>

    </div>

  `;


  document
    .querySelectorAll(
      ".delete-orphan-guardian-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTeacherOrphanGuardian(
            button.dataset.guardianProfileId,
            button.dataset.guardianName,
            true
          );

        }
      );

    });


  const closeButton =
    document.getElementById(
      "closeOrphanGuardiansButton"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        area.style.display =
          "none";

        area.innerHTML =
          "";

      }
    );

  }


  return guardians;

}


// =====================================================
// EXCLUIR RESPONSAVEL E LOGIN
// =====================================================

async function deleteTeacherOrphanGuardian(
  guardianProfileId,
  guardianName,
  askConfirmation = true
) {

  if (askConfirmation) {

    const confirmed =
      window.confirm(

        "Excluir definitivamente o responsavel \"" +
        String(
          guardianName || ""
        ) +
        "\"?\n\n" +

        "Isso apagara tambem o login deste responsavel no Supabase Auth.\n\n" +

        "A exclusao so sera permitida se ele nao estiver ligado a nenhum aluno ativo."

      );


    if (!confirmed) {
      return false;
    }

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_orphan_guardian",
      {

        p_guardian_profile_id:
          guardianProfileId

      }
    );


  if (error) {

    console.error(
      "Erro ao excluir responsavel:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel excluir o responsavel."
    );


    return false;
  }


  const managerArea =
    document.getElementById(
      "teacherOrphanGuardianArea"
    );


  if (
    managerArea &&
    managerArea.style.display ===
      "block"
  ) {

    await loadTeacherOrphanGuardians();

  }


  return true;

}


// =====================================================
// FORMULARIO DE RESPONSAVEL
// =====================================================

function openTeacherStudentGuardianForm(
  studentId,
  studentName
) {

  const area =
    document.getElementById(
      "teacherStudentGuardianFormArea"
    );


  if (!area) {
    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:15px;
        border:1px solid #ddd;
        border-radius:8px;
        background:#fffaf3;
      "
    >

      <strong>
        Responsavel por
        ${escapeHtml(
          studentName || "Aluno"
        )}
      </strong>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:12px;
          margin-top:14px;
        "
      >

        <div>

          <label
            for="newGuardianName"
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
            id="newGuardianName"
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
            for="newGuardianEmail"
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
            id="newGuardianEmail"
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
            for="newGuardianPassword"
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
            id="newGuardianPassword"
            autocomplete="new-password"
            minlength="6"
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
            for="newGuardianPasswordConfirm"
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
            id="newGuardianPasswordConfirm"
            autocomplete="new-password"
            minlength="6"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

        </div>

      </div>


      <p
        style="
          margin-top:12px;
          color:#666;
          font-size:13px;
        "
      >
        Se este e-mail ja for responsavel por outro aluno,
        o sistema apenas vincula o mesmo acesso.
      </p>


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
          id="saveTeacherStudentGuardianButton"
        >
          Criar / vincular acesso
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelTeacherStudentGuardianButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="teacherStudentGuardianMessage"
        style="
          margin-top:10px;
        "
      ></p>

    </div>

  `;


  const saveButton =
    document.getElementById(
      "saveTeacherStudentGuardianButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        saveTeacherStudentGuardian(
          studentId
        );

      }
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelTeacherStudentGuardianButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }

}


// =====================================================
// FINALIZAR VINCULO DO RESPONSAVEL
// =====================================================

async function finishGuardianRegistration(
  authUserId,
  studentId,
  name,
  email
) {

  return await supabaseClient.rpc(
    "register_guardian_from_auth",
    {

      p_auth_user_id:
        authUserId,

      p_student_id:
        studentId,

      p_name:
        name,

      p_email:
        email

    }
  );

}


// =====================================================
// RECUPERAR RESPONSAVEL EXISTENTE
// =====================================================

async function recoverExistingGuardianAccess(
  studentId,
  name,
  email
) {

  return await supabaseClient.rpc(
    "recover_guardian_from_auth_email",
    {

      p_student_id:
        studentId,

      p_name:
        name,

      p_email:
        email

    }
  );

}


// =====================================================
// CRIAR / VINCULAR RESPONSAVEL
// =====================================================

async function saveTeacherStudentGuardian(
  studentId
) {

  const nameInput =
    document.getElementById(
      "newGuardianName"
    );


  const emailInput =
    document.getElementById(
      "newGuardianEmail"
    );


  const passwordInput =
    document.getElementById(
      "newGuardianPassword"
    );


  const confirmInput =
    document.getElementById(
      "newGuardianPasswordConfirm"
    );


  const button =
    document.getElementById(
      "saveTeacherStudentGuardianButton"
    );


  const message =
    document.getElementById(
      "teacherStudentGuardianMessage"
    );


  if (
    !nameInput ||
    !emailInput ||
    !passwordInput ||
    !confirmInput
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


  const confirmPassword =
    confirmInput.value;


  function showError(
    text
  ) {

    if (message) {

      message.textContent =
        text;

      message.style.color =
        "red";

    }

  }


  if (!name) {

    showError(
      "Digite o nome do responsavel."
    );

    return;
  }


  if (!email) {

    showError(
      "Digite o e-mail do responsavel."
    );

    return;
  }


  if (
    password.length < 6
  ) {

    showError(
      "A senha deve ter pelo menos 6 caracteres."
    );

    return;
  }


  if (
    password !==
      confirmPassword
  ) {

    showError(
      "As senhas nao conferem."
    );

    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Criando acesso...";

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
        "Criar / vincular acesso";

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
            "guardian"

        }

      }

    });


  async function tryRecovery() {

    const {
      error
    } =
      await recoverExistingGuardianAccess(
        studentId,
        name,
        email
      );


    return error;

  }


  if (authError) {

    const authErrorText =
      String(
        authError.message || ""
      ).toLowerCase();


    const existing =
      authErrorText.includes(
        "already registered"
      )
      ||
      authErrorText.includes(
        "already exists"
      )
      ||
      authErrorText.includes(
        "user already"
      );


    if (!existing) {

      showError(
        authError.message ||
        "Nao foi possivel criar o acesso."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar / vincular acesso";

      }


      return;
    }


    const recoveryError =
      await tryRecovery();


    if (recoveryError) {

      showError(
        recoveryError.message ||
        "Este e-mail ja possui outro tipo de acesso."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar / vincular acesso";

      }


      return;
    }


    await openTeacherStudentDetail(
      studentId
    );


    alert(
      "Responsavel existente vinculado ao aluno."
    );


    return;
  }


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
        "Criar / vincular acesso";

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

    const recoveryError =
      await tryRecovery();


    if (recoveryError) {

      showError(
        recoveryError.message ||
        "Este e-mail ja possui outro tipo de acesso."
      );


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Criar / vincular acesso";

      }


      return;
    }


    await openTeacherStudentDetail(
      studentId
    );


    alert(
      "Responsavel existente vinculado ao aluno."
    );


    return;
  }


  const {
    error: guardianError
  } =
    await finishGuardianRegistration(
      authUser.id,
      studentId,
      name,
      email
    );


  if (guardianError) {

    console.error(
      "Erro ao vincular responsavel:",
      guardianError
    );


    showError(
      "O acesso foi criado, mas o vinculo falhou: "
      +
      (
        guardianError.message ||
        "erro desconhecido"
      )
    );


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Criar / vincular acesso";

    }


    return;
  }


  await openTeacherStudentDetail(
    studentId
  );


  alert(
    "Acesso do responsavel criado e vinculado."
  );

}


// =====================================================
// REMOVER VINCULO DO RESPONSAVEL
// =====================================================

async function unlinkTeacherStudentGuardian(
  studentId,
  guardianProfileId,
  guardianName
) {

  const confirmed =
    window.confirm(

      "Remover o vinculo de \"" +
      String(
        guardianName || ""
      ) +
      "\" com este aluno?\n\n" +

      "O login do responsavel nao sera apagado, pois ele pode estar vinculado a outro aluno."

    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "unlink_teacher_guardian_from_student",
      {

        p_student_id:
          studentId,

        p_guardian_profile_id:
          guardianProfileId

      }
    );


  if (error) {

    console.error(
      "Erro ao remover vinculo de responsavel:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel remover o vinculo."
    );


    return;
  }


  const {
    data: orphanData,
    error: orphanError
  } =
    await supabaseClient.rpc(
      "get_teacher_orphan_guardians"
    );


  let deletedGuardian =
    false;


  if (!orphanError) {

    const orphan =
      (orphanData || [])
        .find(
          item =>
            String(
              item.guardian_profile_id
            ) ===
            String(
              guardianProfileId
            )
        );


    if (orphan) {

      const deleteNow =
        window.confirm(

          "O vinculo foi removido e este responsavel nao esta mais ligado a nenhum aluno ativo.\n\n" +

          "Deseja excluir tambem o responsavel e o login dele?"

        );


      if (deleteNow) {

        deletedGuardian =
          await deleteTeacherOrphanGuardian(
            guardianProfileId,
            guardianName,
            false
          );

      }

    }

  }


  await openTeacherStudentDetail(
    studentId
  );


  if (deletedGuardian) {

    alert(
      "Responsavel e login excluidos com sucesso."
    );

  }

}


// =====================================================
// HISTORICO DE CONTRATOS
// =====================================================

function renderTeacherStudentContractHistoryRow(
  item
) {

  const startDate =
    item.contract_start_date
      ? formatDate(
          new Date(
            item.contract_start_date +
            "T12:00:00"
          )
        )
      : "Nao informado";


  const endDate =
    item.contract_end_date
      ? formatDate(
          new Date(
            item.contract_end_date +
            "T12:00:00"
          )
        )
      : "Sem data de termino";


  return `

    <div
      style="
        padding:12px;
        border:1px solid #e5e5e5;
        border-radius:8px;
        background:#ffffff;
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
          ${startDate}
          ate
          ${endDate}
        </strong>


        <span
          style="
            color:#666;
            font-size:12px;
          "
        >
          ${
            item.archived_reason ===
              "renewed"
              ? "Renovado"
              : "Alterado"
          }
        </span>

      </div>


      ${
        item.contract_notes

          ? `

            <div
              style="
                margin-top:7px;
                white-space:pre-wrap;
              "
            >
              ${escapeHtml(
                item.contract_notes
              )}
            </div>

          `

          : ""
      }


      ${
        item.archived_at

          ? `

            <div
              style="
                margin-top:7px;
                color:#777;
                font-size:12px;
              "
            >
              Arquivado em
              ${escapeHtml(
                formatDateTime(
                  item.archived_at
                )
              )}
            </div>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// RENOVAR CONTRATO DO ALUNO
// =====================================================

async function renewTeacherStudentContract(
  studentId
) {

  const startInput =
    document.getElementById(
      "teacherStudentContractStartDate"
    );


  const endInput =
    document.getElementById(
      "teacherStudentContractEndDate"
    );


  const notesInput =
    document.getElementById(
      "teacherStudentContractNotes"
    );


  const message =
    document.getElementById(
      "teacherStudentContractMessage"
    );


  const button =
    document.getElementById(
      "renewTeacherStudentContractButton"
    );


  const startDate =
    startInput
      ? startInput.value
      : "";


  const endDate =
    endInput &&
    endInput.value
      ? endInput.value
      : null;


  if (!startDate) {

    if (message) {

      message.textContent =
        "Informe a data de inicio do novo contrato.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    endDate &&
    endDate <
      startDate
  ) {

    if (message) {

      message.textContent =
        "A data de termino nao pode ser anterior ao inicio.";

      message.style.color =
        "red";

    }


    return;
  }


  const confirmed =
    window.confirm(

      "Renovar o contrato deste aluno?\n\n" +

      "O contrato atual sera preservado no historico e estas datas passarao a ser o novo contrato ativo."

    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Renovando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "renew_teacher_student_contract",
      {

        p_student_id:
          studentId,

        p_contract_start_date:
          startDate,

        p_contract_end_date:
          endDate,

        p_contract_notes:
          notesInput
            ? notesInput.value.trim() || null
            : null

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Renovar contrato";

  }


  if (error) {

    console.error(
      "Erro ao renovar contrato:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel renovar o contrato.";

      message.style.color =
        "red";

    }


    return;
  }


  await openTeacherStudentDetail(
    studentId
  );


  await loadTeacherDashboard();


  alert(
    "Contrato renovado. O contrato anterior foi preservado no historico."
  );

}


// =====================================================
// SALVAR CONTRATO DO ALUNO
// =====================================================

async function saveTeacherStudentContract(
  studentId
) {

  const startInput =
    document.getElementById(
      "teacherStudentContractStartDate"
    );


  const endInput =
    document.getElementById(
      "teacherStudentContractEndDate"
    );


  const notesInput =
    document.getElementById(
      "teacherStudentContractNotes"
    );


  const message =
    document.getElementById(
      "teacherStudentContractMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherStudentContractButton"
    );


  const startDate =
    startInput
      ? startInput.value
      : "";


  const endDate =
    endInput &&
    endInput.value
      ? endInput.value
      : null;


  if (!startDate) {

    if (message) {

      message.textContent =
        "Informe a data de inicio do contrato.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    endDate &&
    endDate <
      startDate
  ) {

    if (message) {

      message.textContent =
        "A data de termino nao pode ser anterior ao inicio.";

      message.style.color =
        "red";

    }


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
      "save_teacher_student_contract",
      {

        p_student_id:
          studentId,

        p_contract_start_date:
          startDate,

        p_contract_end_date:
          endDate,

        p_contract_notes:
          notesInput
            ? notesInput.value.trim() || null
            : null

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar contrato";

  }


  if (error) {

    console.error(
      "Erro ao salvar contrato:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o contrato.";

      message.style.color =
        "red";

    }


    return;
  }


  await openTeacherStudentDetail(
    studentId
  );


  await loadTeacherDashboard();


  alert(
    "Contrato atualizado com sucesso."
  );

}


// =====================================================
// CAMPOS DA CONFIGURACAO FINANCEIRA DO ALUNO
// =====================================================

function updateTeacherStudentFinancialSettingsVisibility() {

  const typeSelect =
    document.getElementById(
      "teacherStudentBillingType"
    );


  const monthlyField =
    document.getElementById(
      "teacherStudentMonthlyFeeField"
    );


  const lessonField =
    document.getElementById(
      "teacherStudentLessonFeeField"
    );


  if (
    !typeSelect ||
    !monthlyField ||
    !lessonField
  ) {
    return;
  }


  const perLesson =
    typeSelect.value ===
      "per_lesson";


  monthlyField.style.display =
    perLesson
      ? "none"
      : "block";


  lessonField.style.display =
    perLesson
      ? "block"
      : "none";

}


// =====================================================
// SALVAR CONFIGURACAO FINANCEIRA DO ALUNO
// =====================================================

async function saveTeacherStudentFinancialSettings(
  studentId
) {

  const birthDateInput =
    document.getElementById(
      "teacherStudentBirthDate"
    );


  const typeSelect =
    document.getElementById(
      "teacherStudentBillingType"
    );


  const monthlyFeeInput =
    document.getElementById(
      "teacherStudentMonthlyFee"
    );


  const lessonFeeInput =
    document.getElementById(
      "teacherStudentLessonFee"
    );


  const dueDayInput =
    document.getElementById(
      "teacherStudentDueDay"
    );


  const invoiceInput =
    document.getElementById(
      "teacherStudentInvoiceDefault"
    );


  const message =
    document.getElementById(
      "teacherStudentFinancialSettingsMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherStudentFinancialSettingsButton"
    );


  const birthDate =
    birthDateInput
      ? birthDateInput.value
      : "";


  const billingType =
    typeSelect
      ? typeSelect.value
      : "monthly";


  const monthlyFee =
    monthlyFeeInput &&
    monthlyFeeInput.value !==
      ""
      ? Number(
          monthlyFeeInput.value
        )
      : null;


  const lessonFee =
    lessonFeeInput &&
    lessonFeeInput.value !==
      ""
      ? Number(
          lessonFeeInput.value
        )
      : null;


  const dueDay =
    dueDayInput
      ? Number(
          dueDayInput.value
        )
      : NaN;


  if (!birthDate) {

    if (message) {

      message.textContent =
        "Informe a data de nascimento do aluno.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    new Date(
      birthDate +
      "T12:00:00"
    ) >
    new Date()
  ) {

    if (message) {

      message.textContent =
        "A data de nascimento nao pode estar no futuro.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    billingType ===
      "monthly"
    &&
    (
      monthlyFee === null
      ||
      Number.isNaN(
        monthlyFee
      )
      ||
      monthlyFee < 0
    )
  ) {

    if (message) {

      message.textContent =
        "Digite um valor mensal valido.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    billingType ===
      "per_lesson"
    &&
    (
      lessonFee === null
      ||
      Number.isNaN(
        lessonFee
      )
      ||
      lessonFee < 0
    )
  ) {

    if (message) {

      message.textContent =
        "Digite um valor por aula valido.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    Number.isNaN(
      dueDay
    )
    ||
    dueDay < 1
    ||
    dueDay > 31
  ) {

    if (message) {

      message.textContent =
        "O dia de vencimento deve estar entre 1 e 31.";

      message.style.color =
        "red";

    }


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
      "save_teacher_student_financial_settings",
      {

        p_student_id:
          studentId,

        p_billing_type:
          billingType,

        p_monthly_fee:
          monthlyFee,

        p_lesson_fee:
          lessonFee,

        p_payment_due_day:
          dueDay,

        p_invoice_required_default:
          Boolean(
            invoiceInput &&
            invoiceInput.checked
          ),

        p_birth_date:
          birthDate

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar configuracao financeira";

  }


  if (error) {

    console.error(
      "Erro ao salvar configuracao financeira:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar.";

      message.style.color =
        "red";

    }


    return;
  }


  if (message) {

    message.textContent =
      billingType ===
        "per_lesson"
        ? "Cobranca por aula salva."
        : "Cobranca mensal salva.";

    message.style.color =
      "green";

  }


  await openTeacherStudentDetail(
    studentId
  );

}


// =====================================================
// EDITAR AGENDA FIXA PELO "VER ALUNO"
// =====================================================

function openTeacherStudentScheduleEditor(
  studentId,
  studentName,
  fixedSchedule
) {

  const area =
    document.getElementById(
      "teacherStudentScheduleEditArea"
    );


  if (!area) {
    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:15px;
        background:#ffffff;
        border:1px solid #ddd;
        border-radius:8px;
      "
    >

      <strong>
        Modificar agenda fixa de
        ${escapeHtml(
          studentName || "Aluno"
        )}
      </strong>


      <p
        style="
          margin-top:7px;
          color:#666;
          font-size:13px;
        "
      >
        A alteracao passa a valer a partir de hoje.
        As semanas anteriores continuam preservadas.
      </p>


      <div
        style="
          display:flex;
          justify-content:flex-end;
          margin-top:12px;
        "
      >

        <button
          type="button"
          class="secondary-button"
          id="addTeacherStudentScheduleRowButton"
        >
          + Adicionar dia / horario
        </button>

      </div>


      <div
        id="teacherStudentFixedScheduleRows"
      ></div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="saveTeacherStudentScheduleButton"
        >
          Salvar horarios
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelTeacherStudentScheduleButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="teacherStudentScheduleMessage"
        style="
          margin-top:10px;
        "
      ></p>

    </div>

  `;


  const rowsContainer =
    document.getElementById(
      "teacherStudentFixedScheduleRows"
    );


  if (rowsContainer) {

    rowsContainer.innerHTML =
      "";


    if (
      Array.isArray(
        fixedSchedule
      ) &&
      fixedSchedule.length > 0
    ) {

      fixedSchedule.forEach(
        item => {

          addStudentFixedScheduleRow(
            "teacherStudentFixedScheduleRows",
            {
              day_of_week:
                item.day_of_week,

              start_time:
                normalizeTime(
                  item.start_time
                )
            }
          );

        }
      );

    }

    else {

      addStudentFixedScheduleRow(
        "teacherStudentFixedScheduleRows"
      );

    }

  }


  const addButton =
    document.getElementById(
      "addTeacherStudentScheduleRowButton"
    );


  if (addButton) {

    addButton.addEventListener(
      "click",
      () => {

        addStudentFixedScheduleRow(
          "teacherStudentFixedScheduleRows"
        );

      }
    );

  }


  const saveButton =
    document.getElementById(
      "saveTeacherStudentScheduleButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        saveTeacherStudentFixedSchedule(
          studentId
        );

      }
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelTeacherStudentScheduleButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }

}


// =====================================================
// SALVAR AGENDA FIXA DO ALUNO
// =====================================================

async function saveTeacherStudentFixedSchedule(
  studentId
) {

  const result =
    collectStudentFixedSchedule(
      "teacherStudentFixedScheduleRows"
    );


  const message =
    document.getElementById(
      "teacherStudentScheduleMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherStudentScheduleButton"
    );


  if (result.error) {

    if (message) {

      message.textContent =
        result.error;

      message.style.color =
        "red";

    }


    return;
  }


  const confirmed =
    window.confirm(

      "Salvar os novos dias e horarios deste aluno?\n\n" +
      "A alteracao passa a valer a partir de hoje e o passado sera preservado."

    );


  if (!confirmed) {
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
      "replace_teacher_student_weekly_schedule",
      {

        p_student_id:
          studentId,

        p_schedule:
          result.schedule

      }
    );


  if (error) {

    console.error(
      "Erro ao alterar horarios do aluno:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar os horarios.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar horarios";

    }


    return;
  }


  currentTeacherStudents =
    [];


  await loadTeacherStudents();

  await loadTeacherStudentOverview();

  await openTeacherStudentDetail(
    studentId
  );


  alert(
    "Horarios do aluno atualizados com sucesso."
  );

}


// =====================================================
// REPOSICAO DO ALUNO
// =====================================================

function renderTeacherStudentMakeupRow(
  makeup
) {

  let status =
    String(
      makeup.status || ""
    );


  switch (
    status.toLowerCase()
  ) {

    case "available":
      status =
        "Disponivel";
      break;

    case "reserved":
      status =
        "Reservada";
      break;

    case "completed":
      status =
        "Realizada";
      break;

    case "expired":
      status =
        "Expirada";
      break;

    case "lost":
      status =
        "Perdida";
      break;

  }


  let sourceLesson =
    "";


  if (
    makeup.source_lesson_date
  ) {

    sourceLesson = `

      <div
        style="
          margin-top:4px;
          color:#666;
        "
      >
        Aula de origem:
        ${formatDate(
          new Date(
            makeup.source_lesson_date +
            "T12:00:00"
          )
        )}
        -
        ${normalizeTime(
          makeup.source_lesson_start_time
        )}
      </div>

    `;

  }


  let reservation =
    "";


  if (
    makeup.reservation_id
  ) {

    reservation = `

      <div
        style="
          margin-top:4px;
          color:#a9573a;
        "
      >
        Agendada para
        ${formatDate(
          new Date(
            makeup.reservation_date +
            "T12:00:00"
          )
        )}
        -
        ${normalizeTime(
          makeup.reservation_start_time
        )}
      </div>

    `;

  }


  return `

    <div
      style="
        padding:12px;
        border:1px solid #e1e1e1;
        border-radius:8px;
      "
    >

      <strong>
        ${Number(
          makeup.duration_minutes || 0
        )}
        min
      </strong>

      -
      ${escapeHtml(
        formatMakeupSource(
          makeup.source
        )
      )}

      -
      ${escapeHtml(
        status
      )}

      ${sourceLesson}

      ${reservation}

    </div>

  `;

}


// =====================================================
// AULA DO HISTORICO INDIVIDUAL
// =====================================================

function renderTeacherStudentHistoryRow(
  record,
  comments = []
) {

  const attendance =
    record.attendance_status
      ? formatTeacherAttendanceShort(
          record.attendance_status
        )
      : (
          record.lesson_status ===
          "cancelled"
            ? "Aula cancelada"
            : "Sem registro"
        );


  return `

    <div
      style="
        padding:14px;
        border:1px solid #e1e1e1;
        border-radius:8px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:12px;
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
        </strong>


        <strong>
          ${escapeHtml(
            attendance
          )}
        </strong>

      </div>


      <div
        style="
          margin-top:7px;
          color:#555;
        "
      >
        ${escapeHtml(
          record.subject_name ||
          "Materia nao informada"
        )}
        -
        ${escapeHtml(
          record.content_title ||
          "Conteudo nao informado"
        )}
      </div>


      ${
        record.teacher_notes

          ? `

            <div
              style="
                margin-top:7px;
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


      ${
        comments.length > 0

          ? `

            <div
              style="
                margin-top:12px;
                padding-top:12px;
                border-top:1px solid #e5e5e5;
              "
            >

              <strong>
                Comentarios do aluno
              </strong>


              <div
                style="
                  display:grid;
                  gap:8px;
                  margin-top:8px;
                "
              >

                ${comments
                  .map(
                    comment => `

                      <div
                        style="
                          padding:10px;
                          border-radius:8px;
                          background:${
                            comment.teacher_seen_at
                              ? "#f7f7f7"
                              : "#fff3cd"
                          };
                        "
                      >

                        <div
                          style="
                            display:flex;
                            justify-content:space-between;
                            gap:8px;
                            flex-wrap:wrap;
                            font-size:12px;
                            color:#666;
                          "
                        >

                          <span>
                            ${escapeHtml(
                              formatDateTime(
                                comment.created_at
                              )
                            )}
                          </span>


                          ${
                            !comment.teacher_seen_at

                              ? `

                                <strong
                                  style="
                                    color:#7a5d00;
                                  "
                                >
                                  Novo
                                </strong>

                              `

                              : ""
                          }

                        </div>


                        <div
                          style="
                            margin-top:5px;
                            white-space:pre-wrap;
                          "
                        >
                          ${escapeHtml(
                            comment.comment
                          )}
                        </div>

                      </div>

                    `
                  )
                  .join("")}

              </div>

            </div>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// FINANCEIRO DO PROFESSOR
// =====================================================

async function loadTeacherFinancialPage() {

  const {
    data: financialStudentData,
    error: financialStudentError
  } =
    await supabaseClient.rpc(
      "get_teacher_financial_students"
    );


  if (financialStudentError) {

    console.error(
      "Erro ao carregar alunos do financeiro:",
      financialStudentError
    );


    currentTeacherFinancialStudents =
      [];

  }

  else {

    currentTeacherFinancialStudents =
      financialStudentData || [];

  }


  const studentFilter =
    document.getElementById(
      "teacherFinancialStudentFilter"
    );


  if (studentFilter) {

    studentFilter.innerHTML = `

      <option value="">
        Todos os alunos
      </option>

      ${currentTeacherFinancialStudents
        .map(
          student => `

            <option
              value="${student.student_id}"
            >
              ${escapeHtml(
                student.student_name
              )}
              ${
                student.classes_paused
                  ? " - aulas pausadas"
                  : ""
              }
            </option>

          `
        )
        .join("")}

    `;

  }


  await loadTeacherFinancialRecords();

}


// =====================================================
// MES / ANO DO FILTRO
// =====================================================

function getTeacherFinancialMonthParts() {

  const input =
    document.getElementById(
      "teacherFinancialMonthFilter"
    );


  const value =
    input
      ? input.value
      : "";


  const parts =
    String(
      value || ""
    ).split("-");


  let year =
    Number(
      parts[0]
    );


  let month =
    Number(
      parts[1]
    );


  if (
    !year ||
    month < 1 ||
    month > 12
  ) {

    const now =
      new Date();


    year =
      now.getFullYear();

    month =
      now.getMonth() + 1;

  }


  return {
    year,
    month
  };

}


// =====================================================
// GERAR MENSALIDADES AUTOMATICAMENTE
// =====================================================

async function generateTeacherFinancialMonth() {

  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


  const confirmed =
    window.confirm(

      "Gerar as mensalidades de " +
      formatMonth(
        month
      ) +
      "/" +
      year +
      "?\n\n" +

      "O sistema criara apenas os lancamentos que ainda nao existem, " +
      "usando o valor e o dia de vencimento configurados em cada aluno."

    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "generateTeacherFinancialButton"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Gerando...";

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "generate_teacher_monthly_financial",
      {

        p_year:
          year,

        p_month:
          month

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Gerar mensalidades do mes";

  }


  if (error) {

    console.error(
      "Erro ao gerar mensalidades:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel gerar as mensalidades."
    );


    return;
  }


  await loadTeacherFinancialRecords();


  alert(
    String(
      Number(
        data || 0
      )
    )
    +
    " mensalidade(s) criada(s)."
  );

}


// =====================================================
// CARREGAR LANCAMENTOS
// =====================================================

async function loadTeacherFinancialRecords() {

  const list =
    document.getElementById(
      "teacherFinancialList"
    );


  if (!list) {
    return;
  }


  list.innerHTML =
    "Carregando financeiro...";


  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


  const studentFilter =
    document.getElementById(
      "teacherFinancialStudentFilter"
    );


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_financial_records",
      {

        p_year:
          year,

        p_month:
          month,

        p_student_id:
          studentFilter &&
          studentFilter.value
            ? studentFilter.value
            : null

      }
    );


  if (error) {

    console.error(
      "Erro ao carregar financeiro:",
      error
    );


    list.innerHTML = `

      <p>
        Nao foi possivel carregar o financeiro.
      </p>

    `;


    return;
  }


  currentTeacherFinancialRecords =
    data || [];


  renderTeacherFinancialSummary();

  renderTeacherFinancialRecords();

  await loadTeacherFinancialGenerationStatus();

}


// =====================================================
// STATUS DE GERACAO DO FINANCEIRO DO MES
// =====================================================

async function loadTeacherFinancialGenerationStatus() {

  const area =
    document.getElementById(
      "teacherFinancialGenerationStatus"
    );


  if (!area) {
    return;
  }


  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


  const [
    statusResult,
    missingResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_teacher_financial_generation_status",
        {
          p_year:
            year,

          p_month:
            month
        }
      ),

      supabaseClient.rpc(
        "get_teacher_missing_financial_students",
        {
          p_year:
            year,

          p_month:
            month
        }
      )

    ]);


  if (
    statusResult.error ||
    missingResult.error
  ) {

    console.error(
      "Erro ao carregar status de geracao financeira:",
      statusResult.error ||
      missingResult.error
    );


    area.innerHTML = `

      <div
        style="
          padding:12px;
          border-radius:8px;
          background:#fff3cd;
        "
      >
        Nao foi possivel conferir se existem mensalidades
        pendentes de geracao.
      </div>

    `;


    return;
  }


  const status =
    (
      Array.isArray(
        statusResult.data
      )
        ? statusResult.data[0]
        : statusResult.data
    )
    || {};


  const missing =
    missingResult.data || [];


  if (
    Number(
      status.missing_records || 0
    ) === 0
  ) {

    area.innerHTML = `

      <div
        style="
          padding:12px 14px;
          border-radius:9px;
          background:#eef8f0;
        "
      >
        <strong>
          Financeiro do mes completo.
        </strong>

        <div
          style="
            margin-top:4px;
            font-size:13px;
            color:#555;
          "
        >
          ${Number(
            status.generated_records || 0
          )}
          de
          ${Number(
            status.eligible_students || 0
          )}
          aluno(s) elegivel(is) ja possuem lancamento.
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
        background:#fff3cd;
      "
    >

      <strong>
        ${Number(
          status.missing_records || 0
        )}
        aluno(s) ainda sem lancamento neste mes.
      </strong>


      <div
        style="
          margin-top:8px;
          display:grid;
          gap:6px;
        "
      >

        ${missing
          .map(
            item => `

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:10px;
                  flex-wrap:wrap;
                  padding:8px 10px;
                  background:#ffffff;
                  border-radius:7px;
                "
              >

                <span>
                  ${escapeHtml(
                    item.student_name
                  )}
                </span>


                <span>
                  ${
                    item.billing_type ===
                      "per_lesson"
                      ? "Por aula"
                      : "Mensal"
                  }
                </span>

              </div>

            `
          )
          .join("")}

      </div>


      <div
        style="
          margin-top:10px;
          font-size:13px;
          color:#555;
        "
      >
        Use "Gerar mensalidades do mes" para criar somente
        os lancamentos que ainda estao faltando.
      </div>

    </div>

  `;

}


// =====================================================
// RESUMO DO MES
// =====================================================

function renderTeacherFinancialSummary() {

  const container =
    document.getElementById(
      "teacherFinancialSummary"
    );


  if (!container) {
    return;
  }


  let total =
    0;

  let paid =
    0;

  let pending =
    0;

  let overdue =
    0;


  currentTeacherFinancialRecords.forEach(
    item => {

      const amount =
        Number(
          item.amount || 0
        );


      total +=
        amount;


      const status =
        String(
          item.payment_status || ""
        ).toLowerCase();


      if (
        status === "paid"
      ) {

        paid +=
          amount;

      }

      else if (
        status === "overdue"
      ) {

        overdue +=
          amount;

      }

      else {

        pending +=
          amount;

      }

    }
  );


  container.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:10px;
      "
    >

      ${renderTeacherFinancialStat(
        "Total do mes",
        total
      )}

      ${renderTeacherFinancialStat(
        "Pago",
        paid
      )}

      ${renderTeacherFinancialStat(
        "Pendente",
        pending
      )}

      ${renderTeacherFinancialStat(
        "Atrasado",
        overdue
      )}

    </div>

  `;

}


function renderTeacherFinancialStat(
  label,
  amount
) {

  return `

    <div
      style="
        padding:14px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#ffffff;
      "
    >

      <div
        style="
          font-size:13px;
          color:#666;
        "
      >
        ${escapeHtml(
          label
        )}
      </div>


      <div
        style="
          font-size:22px;
          font-weight:bold;
          margin-top:5px;
        "
      >
        ${formatCurrency(
          amount
        )}
      </div>

    </div>

  `;

}


// =====================================================
// LISTA FINANCEIRA
// =====================================================

function renderTeacherFinancialRecords() {

  const container =
    document.getElementById(
      "teacherFinancialList"
    );


  if (!container) {
    return;
  }


  if (
    currentTeacherFinancialRecords.length === 0
  ) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        Nenhuma mensalidade cadastrada neste mes.
      </div>

    `;


    return;
  }


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:12px;
      "
    >

      ${currentTeacherFinancialRecords
        .map(
          renderTeacherFinancialRecordCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".teacher-financial-report-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const item =
            currentTeacherFinancialRecords.find(
              record =>
                String(
                  record.financial_id
                ) ===
                String(
                  button.dataset.financialId
                )
            );


          if (item) {

            openTeacherMonthlyFinancialReport(
              item
            );

          }

        }
      );

    });


  document
    .querySelectorAll(
      ".edit-teacher-financial-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const item =
            currentTeacherFinancialRecords.find(
              record =>
                String(
                  record.financial_id
                ) ===
                String(
                  button.dataset.financialId
                )
            );


          if (item) {

            openTeacherFinancialForm(
              item
            );

          }

        }
      );

    });


  document
    .querySelectorAll(
      ".delete-teacher-financial-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTeacherFinancialRecord(
            button.dataset.financialId,
            button.dataset.studentName
          );

        }
      );

    });

}


// =====================================================
// CARD FINANCEIRO DO PROFESSOR
// =====================================================

function renderTeacherFinancialRecordCard(
  item
) {

  const dueDate =
    item.due_date
      ? formatDate(
          new Date(
            item.due_date +
            "T12:00:00"
          )
        )
      : "Nao informado";


  const paidDate =
    item.paid_at
      ? formatDate(
          new Date(
            item.paid_at
          )
        )
      : "";


  return `

    <div
      style="
        padding:17px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#ffffff;
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

          <strong
            style="
              font-size:18px;
            "
          >
            ${escapeHtml(
              item.student_name
            )}
          </strong>


          <div
            style="
              margin-top:5px;
              font-size:22px;
              font-weight:bold;
            "
          >
            ${formatCurrency(
              item.amount
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
                    font-size:13px;
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

              : `

                <div
                  style="
                    margin-top:5px;
                    color:#555;
                    font-size:13px;
                  "
                >
                  Cobranca mensal
                </div>

              `
          }

        </div>


        <strong>
          ${formatPaymentStatus(
            item.payment_status
          )}
        </strong>

      </div>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
          gap:8px;
          margin-top:13px;
        "
      >

        <div>
          <strong>Vencimento:</strong>
          ${dueDate}
        </div>


        ${
          paidDate

            ? `

              <div>
                <strong>Pagamento:</strong>
                ${paidDate}
              </div>

            `

            : ""
        }


        ${
          Number(
            item.discount || 0
          ) > 0

            ? `

              <div>
                <strong>Desconto:</strong>
                ${formatCurrency(
                  item.discount
                )}
              </div>

            `

            : ""
        }


        <div>
          <strong>NF:</strong>

          ${
            item.invoice_required
              ? (
                  item.invoice_issued
                    ? "Emitida"
                    : "Necessaria / pendente"
                )
              : "Nao necessaria"
          }
        </div>

      </div>


      ${
        item.notes

          ? `

            <p
              style="
                margin-top:12px;
                white-space:pre-wrap;
              "
            >
              <strong>Observacoes:</strong>
              ${escapeHtml(
                item.notes
              )}
            </p>

          `

          : ""
      }


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
          class="secondary-button teacher-financial-report-button"
          data-financial-id="${item.financial_id}"
        >
          Ver relatorio
        </button>


        <button
          type="button"
          class="secondary-button edit-teacher-financial-button"
          data-financial-id="${item.financial_id}"
        >
          Editar
        </button>


        <button
          type="button"
          class="secondary-button delete-teacher-financial-button"
          data-financial-id="${item.financial_id}"
          data-student-name="${escapeHtml(
            item.student_name
          )}"
          style="
            border-color:#c0392b;
            color:#c0392b;
          "
        >
          Excluir
        </button>

      </div>

    </div>

  `;

}


// =====================================================
// RELATORIO FINANCEIRO MENSAL DO ALUNO - PROFESSOR
// =====================================================

async function openTeacherMonthlyFinancialReport(
  item
) {

  const area =
    document.getElementById(
      "teacherFinancialReportArea"
    );


  if (!area) {
    return;
  }


  area.style.display =
    "block";


  area.innerHTML = `

    <div
      style="
        padding:18px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#fffaf3;
      "
    >
      Carregando relatorio...
    </div>

  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_student_monthly_financial_report",
      {

        p_student_id:
          item.student_id,

        p_year:
          Number(
            item.year
          ),

        p_month:
          Number(
            item.month
          )

      }
    );


  if (error) {

    console.error(
      "Erro ao carregar relatorio financeiro:",
      error
    );


    area.innerHTML = `

      <div
        style="
          padding:18px;
          border:1px solid #d9534f;
          border-radius:10px;
          background:#fff;
        "
      >
        ${escapeHtml(
          error.message ||
          "Nao foi possivel carregar o relatorio."
        )}
      </div>

    `;


    return;
  }


  const lessons =
    data || [];


  const dueDate =
    item.due_date
      ? formatDate(
          new Date(
            item.due_date +
            "T12:00:00"
          )
        )
      : "Nao informado";


  area.innerHTML = `

    <div
      style="
        padding:20px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <div>

          <h3
            style="
              margin:0;
            "
          >
            Relatorio financeiro
          </h3>

          <p
            style="
              margin:6px 0 0;
            "
          >
            <strong>
              ${escapeHtml(
                item.student_name
              )}
            </strong>

            -
            ${escapeHtml(
              formatMonth(
                item.month
              )
            )}/${item.year}
          </p>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="closeTeacherFinancialReportButton"
        >
          Fechar
        </button>

      </div>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
          gap:10px;
          margin-top:18px;
        "
      >

        <div
          style="
            padding:12px;
            background:#fffaf3;
            border-radius:8px;
          "
        >
          <div
            style="
              font-size:13px;
              color:#666;
            "
          >
            Valor
          </div>

          <strong>
            ${formatCurrency(
              item.amount
            )}
          </strong>
        </div>


        <div
          style="
            padding:12px;
            background:#fffaf3;
            border-radius:8px;
          "
        >
          <div
            style="
              font-size:13px;
              color:#666;
            "
          >
            Vencimento
          </div>

          <strong>
            ${dueDate}
          </strong>
        </div>


        <div
          style="
            padding:12px;
            background:#fffaf3;
            border-radius:8px;
          "
        >
          <div
            style="
              font-size:13px;
              color:#666;
            "
          >
            Status
          </div>

          <strong>
            ${formatPaymentStatus(
              item.payment_status
            )}
          </strong>
        </div>


        <div
          style="
            padding:12px;
            background:#fffaf3;
            border-radius:8px;
          "
        >
          <div
            style="
              font-size:13px;
              color:#666;
            "
          >
            Aulas regulares no mes
          </div>

          <strong>
            ${lessons.length}
          </strong>
        </div>

      </div>


      ${
        item.billing_type ===
          "per_lesson"

          ? `

            <div
              style="
                margin-top:14px;
                padding:12px;
                border-radius:8px;
                background:#eef8f0;
              "
            >
              <strong>
                Calculo:
              </strong>

              ${Number(
                item.lesson_count || lessons.length
              )}
              aula(s)

              x

              ${formatCurrency(
                item.lesson_unit_value || 0
              )}

              =

              <strong>
                ${formatCurrency(
                  item.amount
                )}
              </strong>
            </div>

          `

          : `

            <div
              style="
                margin-top:14px;
                padding:12px;
                border-radius:8px;
                background:#eef8f0;
              "
            >
              <strong>
                Cobranca mensal fixa.
              </strong>

              As aulas abaixo mostram a agenda regular
              considerada naquele mes.
            </div>

          `
      }


      <h4
        style="
          margin:22px 0 10px;
        "
      >
        Aulas do mes
      </h4>


      <div
        style="
          display:grid;
          gap:9px;
        "
      >

        ${
          lessons.length === 0

            ? `

              <div
                style="
                  padding:15px;
                  border:1px solid #ddd;
                  border-radius:8px;
                "
              >
                Nenhuma aula regular encontrada neste mes.
              </div>

            `

            : lessons
                .map(
                  renderMonthlyFinancialLessonRow
                )
                .join("")
        }

      </div>


      <p
        style="
          margin-top:16px;
          color:#666;
          font-size:13px;
        "
      >
        Reposicoes nao sao cobradas novamente e nao entram
        como novas aulas neste relatorio.
      </p>

    </div>

  `;


  const closeButton =
    document.getElementById(
      "closeTeacherFinancialReportButton"
    );


  if (closeButton) {

    closeButton.addEventListener(
      "click",
      () => {

        area.style.display =
          "none";

        area.innerHTML =
          "";

      }
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// LINHA DE AULA DO RELATORIO FINANCEIRO
// =====================================================

function renderMonthlyFinancialLessonRow(
  lesson
) {

  let status =
    "Agendada";


  if (
    lesson.lesson_status ===
      "cancelled"
  ) {

    status =
      "Cancelada";

  }

  else if (
    lesson.attendance_status ===
      "present"
  ) {

    status =
      "Presente";

  }

  else if (
    lesson.attendance_status ===
      "absent"
  ) {

    status =
      "Falta sem justificativa";

  }

  else if (
    lesson.attendance_status ===
      "justified_absence"
  ) {

    status =
      "Falta justificada";

  }

  else if (
    lesson.attendance_status ===
      "makeup"
  ) {

    status =
      "Reposicao realizada";

  }


  const subjectText =
    [
      lesson.subject_name,
      lesson.content_title
    ]
      .filter(Boolean)
      .join(" - ");


  return `

    <div
      style="
        padding:13px;
        border:1px solid #e1e1e1;
        border-radius:8px;
        background:#ffffff;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:12px;
          flex-wrap:wrap;
        "
      >

        <strong>
          ${formatDate(
            new Date(
              lesson.lesson_date +
              "T12:00:00"
            )
          )}

          -

          ${normalizeTime(
            lesson.start_time
          )}

          as

          ${normalizeTime(
            lesson.end_time
          )}
        </strong>


        <strong>
          ${escapeHtml(
            status
          )}
        </strong>

      </div>


      ${
        subjectText

          ? `

            <div
              style="
                margin-top:6px;
                color:#555;
              "
            >
              ${escapeHtml(
                subjectText
              )}
            </div>

          `

          : ""
      }


      ${
        lesson.teacher_notes

          ? `

            <div
              style="
                margin-top:6px;
                white-space:pre-wrap;
              "
            >
              ${escapeHtml(
                lesson.teacher_notes
              )}
            </div>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// FORMULARIO FINANCEIRO
// =====================================================

function openTeacherFinancialForm(
  item = null
) {

  const area =
    document.getElementById(
      "teacherFinancialFormArea"
    );


  if (!area) {
    return;
  }


  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


  editingTeacherFinancialId =
    item
      ? item.financial_id
      : null;


  const selectedStudentId =
    item
      ? item.student_id
      : "";


  const selectedStatus =
    item
      ? item.payment_status
      : "pending";


  const dueDate =
    item &&
    item.due_date
      ? item.due_date
      : (
          String(year)
          +
          "-"
          +
          String(month).padStart(
            2,
            "0"
          )
          +
          "-01"
        );


  const paidDate =
    item &&
    item.paid_at
      ? String(
          item.paid_at
        ).slice(
          0,
          10
        )
      : "";


  area.style.display =
    "block";


  area.innerHTML = `

    <div
      style="
        padding:18px;
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
        ${
          item
            ? "Editar mensalidade"
            : "Nova mensalidade"
        }
      </h4>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:14px;
        "
      >

        <div>

          <label
            for="teacherFinancialStudent"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Aluno
          </label>


          <select
            id="teacherFinancialStudent"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            <option value="">
              Selecione
            </option>

            ${currentTeacherFinancialStudents
              .map(
                student => `

                  <option
                    value="${student.student_id}"
                    ${
                      String(
                        student.student_id
                      ) ===
                      String(
                        selectedStudentId
                      )
                        ? "selected"
                        : ""
                    }
                  >
                    ${escapeHtml(
                      student.student_name
                    )}
                    ${
                      student.classes_paused
                        ? " - aulas pausadas"
                        : ""
                    }
                  </option>

                `
              )
              .join("")}

          </select>

        </div>


        <div>

          <label
            for="teacherFinancialAmount"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Valor da mensalidade
          </label>


          <input
            type="number"
            id="teacherFinancialAmount"
            min="0"
            step="0.01"
            value="${
              item
                ? Number(
                    item.amount || 0
                  ).toFixed(
                    2
                  )
                : ""
            }"
            placeholder="0,00"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >


          <button
            type="button"
            class="secondary-button"
            id="calculateTeacherFinancialAmountButton"
            style="
              margin-top:8px;
            "
          >
            Calcular valor automatico
          </button>


          <div
            id="teacherFinancialCalculationInfo"
            style="
              margin-top:7px;
              font-size:13px;
              color:#555;
            "
          ></div>

        </div>


        <div>

          <label
            for="teacherFinancialDueDate"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Vencimento
          </label>


          <input
            type="date"
            id="teacherFinancialDueDate"
            value="${dueDate}"
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
            for="teacherFinancialStatus"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Status
          </label>


          <select
            id="teacherFinancialStatus"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            <option
              value="pending"
              ${
                selectedStatus ===
                "pending"
                  ? "selected"
                  : ""
              }
            >
              Pendente
            </option>

            <option
              value="paid"
              ${
                selectedStatus ===
                "paid"
                  ? "selected"
                  : ""
              }
            >
              Pago
            </option>

            <option
              value="overdue"
              ${
                selectedStatus ===
                "overdue"
                  ? "selected"
                  : ""
              }
            >
              Atrasado
            </option>

          </select>

        </div>


        <div>

          <label
            for="teacherFinancialPaidDate"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Data do pagamento
          </label>


          <input
            type="date"
            id="teacherFinancialPaidDate"
            value="${paidDate}"
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
            for="teacherFinancialDiscount"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Desconto
          </label>


          <input
            type="number"
            id="teacherFinancialDiscount"
            min="0"
            step="0.01"
            value="${
              item
                ? Number(
                    item.discount || 0
                  ).toFixed(
                    2
                  )
                : "0.00"
            }"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

        </div>

      </div>


      <div
        style="
          display:flex;
          gap:18px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <label>

          <input
            type="checkbox"
            id="teacherFinancialInvoiceRequired"
            ${
              item &&
              item.invoice_required
                ? "checked"
                : ""
            }
          >

          Precisa de nota fiscal

        </label>


        <label>

          <input
            type="checkbox"
            id="teacherFinancialInvoiceIssued"
            ${
              item &&
              item.invoice_issued
                ? "checked"
                : ""
            }
          >

          Nota fiscal emitida

        </label>

      </div>


      <div
        style="
          margin-top:16px;
        "
      >

        <label
          for="teacherFinancialNotes"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:7px;
          "
        >
          Observacoes
        </label>


        <textarea
          id="teacherFinancialNotes"
          rows="4"
          maxlength="2000"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
          "
        >${escapeHtml(
          item
            ? item.notes || ""
            : ""
        )}</textarea>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="saveTeacherFinancialButton"
        >
          Salvar mensalidade
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelTeacherFinancialButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="teacherFinancialMessage"
        style="
          margin-top:10px;
        "
      ></p>

    </div>

  `;


  const statusSelect =
    document.getElementById(
      "teacherFinancialStatus"
    );


  const paidInput =
    document.getElementById(
      "teacherFinancialPaidDate"
    );


  function updatePaidDateState() {

    if (
      !statusSelect ||
      !paidInput
    ) {
      return;
    }


    paidInput.disabled =
      statusSelect.value !==
        "paid";


    if (
      statusSelect.value ===
        "paid"
      &&
      !paidInput.value
    ) {

      paidInput.value =
        formatDateForDatabase(
          new Date()
        );

    }


    if (
      statusSelect.value !==
        "paid"
    ) {

      paidInput.value =
        "";

    }

  }


  updatePaidDateState();


  if (statusSelect) {

    statusSelect.addEventListener(
      "change",
      updatePaidDateState
    );

  }


  const calculateButton =
    document.getElementById(
      "calculateTeacherFinancialAmountButton"
    );


  if (calculateButton) {

    calculateButton.addEventListener(
      "click",
      calculateTeacherFinancialAmount
    );

  }


  const saveButton =
    document.getElementById(
      "saveTeacherFinancialButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveTeacherFinancialRecord
    );

  }


  const cancelButton =
    document.getElementById(
      "cancelTeacherFinancialButton"
    );


  if (cancelButton) {

    cancelButton.addEventListener(
      "click",
      closeTeacherFinancialForm
    );

  }


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// CALCULAR VALOR AUTOMATICO DO MES
// =====================================================

async function calculateTeacherFinancialAmount() {

  const studentSelect =
    document.getElementById(
      "teacherFinancialStudent"
    );


  const amountInput =
    document.getElementById(
      "teacherFinancialAmount"
    );


  const info =
    document.getElementById(
      "teacherFinancialCalculationInfo"
    );


  const button =
    document.getElementById(
      "calculateTeacherFinancialAmountButton"
    );


  const studentId =
    studentSelect
      ? studentSelect.value
      : "";


  if (!studentId) {

    if (info) {

      info.textContent =
        "Selecione o aluno primeiro.";

      info.style.color =
        "red";

    }


    return;
  }


  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Calculando...";

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "calculate_teacher_student_monthly_financial",
      {

        p_student_id:
          studentId,

        p_year:
          year,

        p_month:
          month

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Calcular valor automatico";

  }


  if (error) {

    console.error(
      "Erro ao calcular financeiro:",
      error
    );


    if (info) {

      info.textContent =
        error.message ||
        "Nao foi possivel calcular.";

      info.style.color =
        "red";

    }


    return;
  }


  const result =
    Array.isArray(
      data
    )
      ? data[0]
      : data;


  if (!result) {

    if (info) {

      info.textContent =
        "Nenhum calculo retornado.";

      info.style.color =
        "red";

    }


    return;
  }


  if (amountInput) {

    amountInput.value =
      Number(
        result.calculated_amount || 0
      ).toFixed(
        2
      );

  }


  if (info) {

    if (
      result.billing_type ===
        "per_lesson"
    ) {

      info.innerHTML = `

        <strong>
          ${Number(
            result.lesson_count || 0
          )}
          aula(s)
        </strong>

        x

        <strong>
          ${formatCurrency(
            result.unit_value
          )}
        </strong>

        =

        <strong>
          ${formatCurrency(
            result.calculated_amount
          )}
        </strong>

        <br>

        <span>
          Reposicoes nao sao cobradas novamente.
        </span>

      `;

    }

    else {

      info.innerHTML = `

        Valor mensal configurado:
        <strong>
          ${formatCurrency(
            result.calculated_amount
          )}
        </strong>

      `;

    }


    info.style.color =
      "#246b37";

  }

}


// =====================================================
// FECHAR FORMULARIO
// =====================================================

function closeTeacherFinancialForm() {

  editingTeacherFinancialId =
    null;


  const area =
    document.getElementById(
      "teacherFinancialFormArea"
    );


  if (area) {

    area.style.display =
      "none";

    area.innerHTML =
      "";

  }

}


// =====================================================
// SALVAR FINANCEIRO
// =====================================================

async function saveTeacherFinancialRecord() {

  const studentSelect =
    document.getElementById(
      "teacherFinancialStudent"
    );


  const amountInput =
    document.getElementById(
      "teacherFinancialAmount"
    );


  const dueInput =
    document.getElementById(
      "teacherFinancialDueDate"
    );


  const statusSelect =
    document.getElementById(
      "teacherFinancialStatus"
    );


  const paidInput =
    document.getElementById(
      "teacherFinancialPaidDate"
    );


  const discountInput =
    document.getElementById(
      "teacherFinancialDiscount"
    );


  const invoiceRequired =
    document.getElementById(
      "teacherFinancialInvoiceRequired"
    );


  const invoiceIssued =
    document.getElementById(
      "teacherFinancialInvoiceIssued"
    );


  const notes =
    document.getElementById(
      "teacherFinancialNotes"
    );


  const message =
    document.getElementById(
      "teacherFinancialMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherFinancialButton"
    );


  const studentId =
    studentSelect
      ? studentSelect.value
      : "";


  const amount =
    amountInput
      ? Number(
          amountInput.value
        )
      : NaN;


  const discount =
    discountInput
      ? Number(
          discountInput.value || 0
        )
      : 0;


  if (!studentId) {

    if (message) {

      message.textContent =
        "Selecione o aluno.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    Number.isNaN(
      amount
    )
    ||
    amount < 0
  ) {

    if (message) {

      message.textContent =
        "Digite um valor valido.";

      message.style.color =
        "red";

    }


    return;
  }


  const {
    year,
    month
  } =
    getTeacherFinancialMonthParts();


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
      "save_teacher_monthly_financial",
      {

        p_financial_id:
          editingTeacherFinancialId,

        p_student_id:
          studentId,

        p_year:
          year,

        p_month:
          month,

        p_amount:
          amount,

        p_payment_status:
          statusSelect
            ? statusSelect.value
            : "pending",

        p_due_date:
          dueInput &&
          dueInput.value
            ? dueInput.value
            : null,

        p_paid_date:
          paidInput &&
          paidInput.value
            ? paidInput.value
            : null,

        p_discount:
          discount,

        p_invoice_required:
          Boolean(
            invoiceRequired &&
            invoiceRequired.checked
          ),

        p_invoice_issued:
          Boolean(
            invoiceIssued &&
            invoiceIssued.checked
          ),

        p_notes:
          notes
            ? notes.value.trim() || null
            : null

      }
    );


  if (error) {

    console.error(
      "Erro ao salvar mensalidade:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar a mensalidade.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar mensalidade";

    }


    return;
  }


  closeTeacherFinancialForm();

  await loadTeacherFinancialRecords();

}


// =====================================================
// EXCLUIR LANCAMENTO
// =====================================================

async function deleteTeacherFinancialRecord(
  financialId,
  studentName
) {

  const confirmed =
    window.confirm(

      "Excluir a mensalidade de \"" +
      String(
        studentName || ""
      ) +
      "\" deste mes?"

    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_monthly_financial",
      {
        p_financial_id:
          financialId
      }
    );


  if (error) {

    console.error(
      "Erro ao excluir mensalidade:",
      error
    );


    alert(
      error.message ||
      "Nao foi possivel excluir a mensalidade."
    );


    return;
  }


  await loadTeacherFinancialRecords();

}


// =====================================================
// RELATORIO DE PRESENCA / FALTAS
// =====================================================



async function loadTeacherAttendancePage() {

  if (
    currentTeacherStudents.length === 0
  ) {

    await loadTeacherStudents();

  }


  const studentFilter =
    document.getElementById(
      "teacherAttendanceStudentFilter"
    );


  if (studentFilter) {

    studentFilter.innerHTML = `

      <option value="">
        Todos os alunos
      </option>

      ${currentTeacherStudents
        .map(
          student => `

            <option
              value="${student.student_id}"
            >
              ${escapeHtml(
                student.student_name
              )}
            </option>

          `
        )
        .join("")}

    `;

  }


  await loadTeacherAttendanceReport();

}


// =====================================================
// INTERVALO DO MES
// =====================================================

function getTeacherAttendanceMonthRange(
  monthValue
) {

  const parts =
    String(
      monthValue || ""
    ).split("-");


  const year =
    Number(
      parts[0]
    );


  const month =
    Number(
      parts[1]
    );


  if (
    !year ||
    !month
  ) {

    const now =
      new Date();


    return {

      from:
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
          12
        ),

      to:
        new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          12
        )

    };

  }


  return {

    from:
      new Date(
        year,
        month - 1,
        1,
        12
      ),

    to:
      new Date(
        year,
        month,
        0,
        12
      )

  };

}


// =====================================================
// CARREGAR RELATORIO
// =====================================================

async function loadTeacherAttendanceReport() {

  const list =
    document.getElementById(
      "teacherAttendanceReportList"
    );


  const summary =
    document.getElementById(
      "teacherAttendanceSummary"
    );


  const monthInput =
    document.getElementById(
      "teacherAttendanceMonth"
    );


  const studentFilter =
    document.getElementById(
      "teacherAttendanceStudentFilter"
    );


  if (
    !list ||
    !monthInput
  ) {
    return;
  }


  list.innerHTML =
    "Carregando registros...";


  const range =
    getTeacherAttendanceMonthRange(
      monthInput.value
    );


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_attendance_report",
      {

        p_from_date:
          formatDateForDatabase(
            range.from
          ),

        p_to_date:
          formatDateForDatabase(
            range.to
          ),

        p_student_id:
          studentFilter &&
          studentFilter.value
            ? studentFilter.value
            : null

      }
    );


  if (error) {

    console.error(
      "Erro ao carregar relatorio de presenca:",
      error
    );


    list.innerHTML = `

      <p>
        Nao foi possivel carregar os registros.
      </p>

    `;


    if (summary) {

      summary.innerHTML =
        "";

    }


    return;
  }


  const records =
    data || [];


  renderTeacherAttendanceSummary(
    records
  );


  renderTeacherAttendanceReport(
    records
  );

}


// =====================================================
// RESUMO
// =====================================================

function renderTeacherAttendanceSummary(
  records
) {

  const container =
    document.getElementById(
      "teacherAttendanceSummary"
    );


  if (!container) {
    return;
  }


  const counters = {

    present: 0,
    absent: 0,
    justified_absence: 0,
    makeup: 0,
    cancelled: 0

  };


  records.forEach(
    record => {

      const attendance =
        String(
          record.attendance_status ||
          ""
        ).toLowerCase();


      if (
        attendance &&
        Object.prototype.hasOwnProperty.call(
          counters,
          attendance
        )
      ) {

        counters[
          attendance
        ] += 1;

      }


      else if (
        record.lesson_status ===
        "cancelled"
      ) {

        counters.cancelled +=
          1;

      }

    }
  );


  container.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
        gap:10px;
      "
    >

      ${renderTeacherAttendanceStatCard(
        "Presentes",
        counters.present
      )}

      ${renderTeacherAttendanceStatCard(
        "Faltas sem justificativa",
        counters.absent
      )}

      ${renderTeacherAttendanceStatCard(
        "Faltas justificadas",
        counters.justified_absence
      )}

      ${renderTeacherAttendanceStatCard(
        "Reposicoes realizadas",
        counters.makeup
      )}

      ${renderTeacherAttendanceStatCard(
        "Canceladas",
        counters.cancelled
      )}

    </div>

  `;

}


// =====================================================
// CARD DE CONTAGEM
// =====================================================

function renderTeacherAttendanceStatCard(
  label,
  value
) {

  return `

    <div
      style="
        padding:14px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#ffffff;
      "
    >

      <div
        style="
          font-size:13px;
          color:#666;
        "
      >
        ${escapeHtml(
          label
        )}
      </div>


      <div
        style="
          font-size:25px;
          font-weight:bold;
          margin-top:5px;
        "
      >
        ${Number(
          value || 0
        )}
      </div>

    </div>

  `;

}


// =====================================================
// LISTA DE REGISTROS
// =====================================================

function renderTeacherAttendanceReport(
  records
) {

  const container =
    document.getElementById(
      "teacherAttendanceReportList"
    );


  if (!container) {
    return;
  }


  if (
    records.length === 0
  ) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        Nenhum registro encontrado neste periodo.
      </div>

    `;


    return;
  }


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:12px;
      "
    >

      ${records
        .map(
          renderTeacherAttendanceReportCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".edit-attendance-report-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const date =
            new Date(
              button.dataset.lessonDate +
              "T12:00:00"
            );


          openTeacherAttendanceManager(
            date,
            {
              start_time:
                button.dataset.startTime
            }
          );

        }
      );

    });

}


// =====================================================
// CARD DO REGISTRO
// =====================================================

function renderTeacherAttendanceReportCard(
  record
) {

  const status =
    record.attendance_status
      ? formatTeacherAttendanceShort(
          record.attendance_status
        )
      : (
          record.lesson_status ===
          "cancelled"
            ? "Aula cancelada"
            : "Sem registro de presenca"
        );


  return `

    <div
      style="
        padding:16px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#ffffff;
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

          <strong
            style="
              font-size:17px;
            "
          >
            ${escapeHtml(
              record.student_name
            )}
          </strong>

          <div
            style="
              margin-top:5px;
              color:#555;
            "
          >
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
          </div>

        </div>


        <strong>
          ${escapeHtml(
            status
          )}
        </strong>

      </div>


      <div
        style="
          margin-top:12px;
        "
      >

        <p>
          <strong>Materia:</strong>
          ${escapeHtml(
            record.subject_name ||
            "Nao informada"
          )}
        </p>

        <p>
          <strong>Conteudo:</strong>
          ${escapeHtml(
            record.content_title ||
            "Nao informado"
          )}
        </p>

        ${
          record.attendance_notes

            ? `

              <p>
                <strong>
                  Observacao de presenca:
                </strong>
                ${escapeHtml(
                  record.attendance_notes
                )}
              </p>

            `

            : ""
        }

        ${
          record.teacher_notes

            ? `

              <p>
                <strong>
                  Observacoes da aula:
                </strong>
                ${escapeHtml(
                  record.teacher_notes
                )}
              </p>

            `

            : ""
        }

      </div>


      ${
        record.lesson_status !==
        "cancelled"

          ? `

            <button
              type="button"
              class="secondary-button edit-attendance-report-button"
              data-lesson-date="${record.lesson_date}"
              data-start-time="${normalizeTime(
                record.start_time
              )}"
              style="
                margin-top:10px;
              "
            >
              Editar registro
            </button>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// PLANEJAMENTO DO PROFESSOR
// =====================================================

async function loadTeacherPlanningPage() {

  if (
    currentTeacherStudents.length === 0
  ) {

    await loadTeacherStudents();

  }


  const subjects =
    await getTeacherSubjectsForRecord();


  const studentSelect =
    document.getElementById(
      "teacherPlanningStudent"
    );


  if (studentSelect) {

    studentSelect.innerHTML = `

      <option value="">
        Selecione um aluno
      </option>

      ${currentTeacherStudents
        .map(
          student => `

            <option
              value="${student.student_id}"
            >
              ${escapeHtml(
                student.student_name
              )}
            </option>

          `
        )
        .join("")}

    `;

  }


  const subjectSelect =
    document.getElementById(
      "teacherPlanningSubject"
    );


  if (subjectSelect) {

    subjectSelect.innerHTML = `

      <option value="">
        Selecione uma materia
      </option>

      ${subjects
        .map(
          subject => `

            <option
              value="${subject.subject_id}"
            >
              ${escapeHtml(
                subject.subject_name
              )}
            </option>

          `
        )
        .join("")}

    `;

  }


  const today =
    new Date();


  const fromDate =
    addDays(
      today,
      -30
    );


  const toDate =
    addDays(
      today,
      120
    );


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_lesson_plans",
      {
        p_from_date:
          formatDateForDatabase(
            fromDate
          ),

        p_to_date:
          formatDateForDatabase(
            toDate
          )
      }
    );


  const container =
    document.getElementById(
      "teacherPlanningList"
    );


  if (error) {

    console.error(
      "Erro ao carregar planejamentos:",
      error
    );


    if (container) {

      container.innerHTML = `

        <p>
          Nao foi possivel carregar os planejamentos.
        </p>

      `;

    }


    return;
  }


  currentTeacherPlans =
    data || [];


  renderTeacherPlanningList();

}


// =====================================================
// LISTA DE PLANEJAMENTOS
// =====================================================

function renderTeacherPlanningList() {

  const container =
    document.getElementById(
      "teacherPlanningList"
    );


  if (!container) {
    return;
  }


  if (
    currentTeacherPlans.length === 0
  ) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        Nenhum planejamento encontrado.
      </div>

    `;


    return;
  }


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:14px;
      "
    >

      ${currentTeacherPlans
        .map(
          renderTeacherPlanCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".edit-teacher-plan-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          editTeacherPlan(
            button.dataset.planId
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".cancel-teacher-plan-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          cancelTeacherPlan(
            button.dataset.planId
          );

        }
      );

    });

}


// =====================================================
// CARD DE PLANEJAMENTO
// =====================================================

function renderTeacherPlanCard(
  plan
) {

  const status =
    String(
      plan.status || ""
    ).toLowerCase();


  let statusLabel =
    plan.status || "";


  let background =
    "#ffffff";


  if (
    status === "planned"
  ) {

    statusLabel =
      "Planejado";

    background =
      "#f7e9e1";

  }

  else if (
    status === "completed"
  ) {

    statusLabel =
      "Concluido";

    background =
      "#e8f5e9";

  }

  else if (
    status === "cancelled"
  ) {

    statusLabel =
      "Cancelado";

    background =
      "#f2f2f2";

  }


  return `

    <div
      style="
        padding:18px;
        border:1px solid #ddd;
        border-radius:10px;
        background:${background};
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
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
              plan.student_name
            )}
          </strong>

          <p
            style="
              margin:6px 0 0;
            "
          >
            ${formatDate(
              new Date(
                plan.planned_date +
                "T12:00:00"
              )
            )}
          </p>

        </div>


        <strong>
          ${escapeHtml(
            statusLabel
          )}
        </strong>

      </div>


      <div
        style="
          margin-top:14px;
        "
      >

        <p>
          <strong>Materia:</strong>
          ${escapeHtml(
            plan.subject_name ||
            "Nao informada"
          )}
        </p>

        <p>
          <strong>Conteudo:</strong>
          ${escapeHtml(
            plan.content_title ||
            "Nao informado"
          )}
        </p>

        <p>
          <strong>Observacoes:</strong>
          ${escapeHtml(
            plan.notes ||
            "Nenhuma observacao."
          )}
        </p>

      </div>


      ${
        status === "planned"

          ? `

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
                class="secondary-button edit-teacher-plan-button"
                data-plan-id="${plan.plan_id}"
              >
                Editar
              </button>

              <button
                type="button"
                class="secondary-button cancel-teacher-plan-button"
                data-plan-id="${plan.plan_id}"
                style="
                  border-color:#c0392b;
                  color:#c0392b;
                "
              >
                Excluir planejamento
              </button>

            </div>

          `

          : ""
      }

    </div>

  `;

}


// =====================================================
// ABRIR FORMULARIO
// =====================================================

async function openTeacherPlanningForm(
  plan = null
) {

  const area =
    document.getElementById(
      "teacherPlanningFormArea"
    );


  if (!area) {
    return;
  }


  editingTeacherPlanId =
    plan
      ? plan.plan_id
      : null;


  area.style.display =
    "block";


  const title =
    document.getElementById(
      "teacherPlanningFormTitle"
    );


  if (title) {

    title.textContent =
      plan
        ? "Editar planejamento"
        : "Novo planejamento";

  }


  const studentSelect =
    document.getElementById(
      "teacherPlanningStudent"
    );


  const dateInput =
    document.getElementById(
      "teacherPlanningDate"
    );


  const subjectSelect =
    document.getElementById(
      "teacherPlanningSubject"
    );


  const notes =
    document.getElementById(
      "teacherPlanningNotes"
    );


  if (studentSelect) {

    studentSelect.value =
      plan
        ? plan.student_id
        : "";

  }


  if (dateInput) {

    dateInput.value =
      plan
        ? plan.planned_date
        : formatDateForDatabase(
            new Date()
          );

  }


  if (subjectSelect) {

    subjectSelect.value =
      plan &&
      plan.subject_id
        ? plan.subject_id
        : "";

  }


  if (notes) {

    notes.value =
      plan
        ? plan.notes || ""
        : "";

  }


  await loadTeacherPlanningContents(
    plan &&
    plan.subject_id
      ? plan.subject_id
      : "",
    plan
      ? plan.content_id
      : null
  );


  area.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


// =====================================================
// CONTEUDOS DO FORMULARIO
// =====================================================

async function loadTeacherPlanningContents(
  subjectId,
  selectedContentId = null
) {

  const select =
    document.getElementById(
      "teacherPlanningContent"
    );


  if (!select) {
    return;
  }


  if (!subjectId) {

    select.disabled =
      true;

    select.innerHTML = `

      <option value="">
        Selecione a materia primeiro
      </option>

    `;


    return;
  }


  select.disabled =
    true;

  select.innerHTML = `

    <option value="">
      Carregando...
    </option>

  `;


  const contents =
    await getTeacherContentsForRecord(
      subjectId
    );


  select.innerHTML = `

    <option value="">
      Nao informado
    </option>

    ${contents
      .map(
        item => `

          <option
            value="${item.content_id}"
            ${
              String(
                item.content_id
              ) ===
              String(
                selectedContentId || ""
              )
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              item.content_title
            )}
          </option>

        `
      )
      .join("")}

  `;


  select.disabled =
    false;

}


// =====================================================
// FECHAR FORMULARIO
// =====================================================

function closeTeacherPlanningForm() {

  editingTeacherPlanId =
    null;


  const area =
    document.getElementById(
      "teacherPlanningFormArea"
    );


  if (area) {

    area.style.display =
      "none";

  }


  const message =
    document.getElementById(
      "teacherPlanningFormMessage"
    );


  if (message) {

    message.textContent =
      "";

  }

}


// =====================================================
// EDITAR PLANEJAMENTO
// =====================================================

function editTeacherPlan(
  planId
) {

  const plan =
    currentTeacherPlans.find(
      item =>
        String(
          item.plan_id
        ) ===
        String(
          planId
        )
    );


  if (!plan) {
    return;
  }


  openTeacherPlanningForm(
    plan
  );

}


// =====================================================
// SALVAR PLANEJAMENTO
// =====================================================

async function saveTeacherPlanning() {

  const studentSelect =
    document.getElementById(
      "teacherPlanningStudent"
    );


  const dateInput =
    document.getElementById(
      "teacherPlanningDate"
    );


  const subjectSelect =
    document.getElementById(
      "teacherPlanningSubject"
    );


  const contentSelect =
    document.getElementById(
      "teacherPlanningContent"
    );


  const notes =
    document.getElementById(
      "teacherPlanningNotes"
    );


  const message =
    document.getElementById(
      "teacherPlanningFormMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherPlanButton"
    );


  const studentId =
    studentSelect
      ? studentSelect.value
      : "";


  const plannedDate =
    dateInput
      ? dateInput.value
      : "";


  const subjectId =
    subjectSelect
      ? subjectSelect.value || null
      : null;


  const contentId =
    contentSelect
      ? contentSelect.value || null
      : null;


  if (!studentId) {

    if (message) {

      message.textContent =
        "Selecione um aluno.";

      message.style.color =
        "red";

    }

    return;
  }


  if (!plannedDate) {

    if (message) {

      message.textContent =
        "Escolha a data do planejamento.";

      message.style.color =
        "red";

    }

    return;
  }


  if (!subjectId) {

    if (message) {

      message.textContent =
        "Selecione a materia.";

      message.style.color =
        "red";

    }

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
      "save_teacher_lesson_plan",
      {
        p_plan_id:
          editingTeacherPlanId,

        p_student_id:
          studentId,

        p_planned_date:
          plannedDate,

        p_subject_id:
          subjectId,

        p_content_id:
          contentId,

        p_notes:
          notes
            ? notes.value.trim() || null
            : null
      }
    );


  if (error) {

    console.error(
      "Erro ao salvar planejamento:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o planejamento.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar planejamento";

    }


    return;
  }


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar planejamento";

  }


  closeTeacherPlanningForm();

  await loadTeacherPlanningPage();

}


// =====================================================
// CANCELAR PLANEJAMENTO
// =====================================================

async function cancelTeacherPlan(
  planId
) {

  const confirmed =
    window.confirm(
      "Excluir este planejamento?\n\n" +
      "Ele sera removido da lista."
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_lesson_plan",
      {
        p_plan_id:
          planId
      }
    );


  if (error) {

    console.error(
      "Erro ao excluir planejamento:",
      error
    );

    alert(
      error.message ||
      "Nao foi possivel excluir o planejamento."
    );

    return;
  }


  await loadTeacherPlanningPage();

}


// =====================================================
// CATALOGO DE MATERIAS DO PROFESSOR
// =====================================================

async function loadTeacherSubjectCatalog() {

  const container =
    document.getElementById(
      "teacherSubjectCatalog"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "Carregando materias...";


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_subject_catalog"
    );


  if (error) {

    console.error(
      "Erro ao carregar materias:",
      error
    );


    container.innerHTML = `

      <p>
        Nao foi possivel carregar as materias.
      </p>

    `;


    return;
  }


  const subjects =
    data || [];


  if (subjects.length === 0) {

    container.innerHTML = `

      <div
        style="
          padding:20px;
          text-align:center;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >
        Nenhuma materia cadastrada.
      </div>

    `;


    return;
  }


  const cards = [];


  for (
    const subject of subjects
  ) {

    const {
      data: contents,
      error: contentError
    } =
      await supabaseClient.rpc(
        "get_teacher_content_catalog",
        {
          p_subject_id:
            subject.subject_id
        }
      );


    if (contentError) {

      console.error(
        "Erro ao carregar conteudos:",
        contentError
      );

    }


    cards.push(
      renderTeacherSubjectCard(
        subject,
        contents || []
      )
    );

  }


  container.innerHTML =
    cards.join("");


  document
    .querySelectorAll(
      ".teacher-subject-delete-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTeacherSubject(
            button.dataset.subjectId,
            button.dataset.subjectName
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".open-new-teacher-content-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const area =
            document.getElementById(
              "new-content-" +
              button.dataset.subjectId
            );


          if (area) {

            area.style.display =
              "block";

          }

        }
      );

    });


  document
    .querySelectorAll(
      ".cancel-new-teacher-content-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const area =
            document.getElementById(
              "new-content-" +
              button.dataset.subjectId
            );


          if (area) {

            area.style.display =
              "none";

          }

        }
      );

    });


  document
    .querySelectorAll(
      ".save-new-teacher-content-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          saveNewTeacherContent(
            button.dataset.subjectId
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".teacher-content-toggle-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setTeacherContentActive(
            button.dataset.contentId,
            button.dataset.active ===
              "true"
          );

        }
      );

    });

}


// =====================================================
// CARD DE MATERIA
// =====================================================

function renderTeacherSubjectCard(
  subject,
  contents
) {

  const isActive =
    subject.active === true;


  return `

    <div
      style="
        border:1px solid #ddd;
        border-radius:12px;
        padding:18px;
        margin-bottom:16px;
        background:${isActive
          ? "#ffffff"
          : "#f2f2f2"};
        opacity:${isActive
          ? "1"
          : "0.75"};
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        "
      >

        <div>

          <h4
            style="
              margin:0;
              font-size:20px;
            "
          >
            ${escapeHtml(
              subject.subject_name
            )}
          </h4>


          <small>
            ${
              isActive
                ? "Materia ativa"
                : "Materia desativada"
            }
            -
            ${Number(
              subject.content_count || 0
            )}
            conteudo(s)
          </small>

        </div>


        <div
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
          "
        >

          ${
            isActive

              ? `

                <button
                  type="button"
                  class="secondary-button open-new-teacher-content-button"
                  data-subject-id="${subject.subject_id}"
                >
                  + Conteudo
                </button>

              `

              : ""
          }


          <button
            type="button"
            class="secondary-button teacher-subject-delete-button"
            data-subject-id="${subject.subject_id}"
            data-subject-name="${escapeHtml(
              subject.subject_name
            )}"
            style="
              border-color:#c0392b;
              color:#c0392b;
            "
          >
            Excluir materia
          </button>

        </div>

      </div>


      <div
        id="new-content-${subject.subject_id}"
        style="
          display:none;
          margin-top:15px;
          padding:15px;
          border-radius:8px;
          background:#f7e9e1;
        "
      >

        <label
          for="new-content-title-${subject.subject_id}"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Novo conteudo de
          ${escapeHtml(
            subject.subject_name
          )}
        </label>


        <input
          type="text"
          id="new-content-title-${subject.subject_id}"
          maxlength="200"
          placeholder="Ex.: Simple Past"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >


        <div
          style="
            display:flex;
            gap:8px;
            flex-wrap:wrap;
            margin-top:10px;
          "
        >

          <button
            type="button"
            class="action-button save-new-teacher-content-button"
            data-subject-id="${subject.subject_id}"
          >
            Salvar conteudo
          </button>


          <button
            type="button"
            class="secondary-button cancel-new-teacher-content-button"
            data-subject-id="${subject.subject_id}"
          >
            Cancelar
          </button>

        </div>


        <p
          id="new-content-message-${subject.subject_id}"
          style="
            margin-top:8px;
          "
        ></p>

      </div>


      <div
        style="
          margin-top:16px;
        "
      >

        <strong>
          Conteudos
        </strong>


        ${
          contents.length === 0

            ? `

              <p
                style="
                  color:#666;
                "
              >
                Nenhum conteudo cadastrado.
              </p>

            `

            : `

              <div
                style="
                  display:grid;
                  gap:8px;
                  margin-top:10px;
                "
              >

                ${contents
                  .map(
                    content => {

                      const contentActive =
                        content.active ===
                        true;


                      return `

                        <div
                          style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:10px;
                            padding:10px 12px;
                            border:1px solid #e2e2e2;
                            border-radius:8px;
                            background:${contentActive
                              ? "#ffffff"
                              : "#eeeeee"};
                          "
                        >

                          <span
                            style="
                              ${
                                contentActive
                                  ? ""
                                  : "text-decoration:line-through;color:#777;"
                              }
                            "
                          >
                            ${escapeHtml(
                              content.content_title
                            )}
                          </span>


                          <button
                            type="button"
                            class="secondary-button teacher-content-toggle-button"
                            data-content-id="${content.content_id}"
                            data-active="${contentActive
                              ? "false"
                              : "true"}"
                          >
                            ${
                              contentActive
                                ? "Desativar"
                                : "Reativar"
                            }
                          </button>

                        </div>

                      `;

                    }
                  )
                  .join("")}

              </div>

            `
        }

      </div>

    </div>

  `;

}


// =====================================================
// NOVA MATERIA
// =====================================================

async function saveNewTeacherSubject() {

  const input =
    document.getElementById(
      "newTeacherSubjectName"
    );


  const button =
    document.getElementById(
      "saveNewTeacherSubjectButton"
    );


  const message =
    document.getElementById(
      "newTeacherSubjectMessage"
    );


  if (!input) {
    return;
  }


  const name =
    input.value.trim();


  if (!name) {

    if (message) {

      message.textContent =
        "Digite o nome da materia.";

      message.style.color =
        "red";

    }

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
      "save_teacher_subject",
      {
        p_name:
          name
      }
    );


  if (error) {

    console.error(
      "Erro ao salvar materia:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar a materia.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar materia";

    }


    return;
  }


  input.value =
    "";


  const area =
    document.getElementById(
      "newTeacherSubjectArea"
    );


  if (area) {

    area.style.display =
      "none";

  }


  await loadTeacherSubjectCatalog();

}


// =====================================================
// ATIVAR / DESATIVAR MATERIA
// =====================================================

async function deleteTeacherSubject(
  subjectId,
  subjectName
) {

  const confirmed =
    window.confirm(

      "Excluir a materia \"" +
      String(
        subjectName || ""
      ) +
      "\"?\n\n" +
      "Ela deixara de aparecer para novas aulas e planejamentos.\n" +
      "O historico das aulas antigas sera preservado."

    );

  if (!confirmed) {
    return;
  }

  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_subject",
      {
        p_subject_id:
          subjectId
      }
    );

  if (error) {

    console.error(
      "Erro ao excluir materia:",
      error
    );

    alert(
      error.message ||
      "Nao foi possivel excluir a materia."
    );

    return;
  }

  await loadTeacherSubjectCatalog();

  alert(
    "Materia excluida com sucesso."
  );

}


// =====================================================
// NOVO CONTEUDO
// =====================================================

async function saveNewTeacherContent(
  subjectId
) {

  const input =
    document.getElementById(
      "new-content-title-" +
      subjectId
    );


  const message =
    document.getElementById(
      "new-content-message-" +
      subjectId
    );


  if (!input) {
    return;
  }


  const title =
    input.value.trim();


  if (!title) {

    if (message) {

      message.textContent =
        "Digite o nome do conteudo.";

      message.style.color =
        "red";

    }

    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_teacher_content",
      {
        p_subject_id:
          subjectId,

        p_title:
          title
      }
    );


  if (error) {

    console.error(
      "Erro ao salvar conteudo:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o conteudo.";

      message.style.color =
        "red";

    }


    return;
  }


  await loadTeacherSubjectCatalog();

}


// =====================================================
// ATIVAR / DESATIVAR CONTEUDO
// =====================================================

async function setTeacherContentActive(
  contentId,
  active
) {

  const {
    error
  } =
    await supabaseClient.rpc(
      "set_teacher_content_active",
      {
        p_content_id:
          contentId,

        p_active:
          active
      }
    );


  if (error) {

    console.error(
      "Erro ao alterar conteudo:",
      error
    );

    alert(
      error.message ||
      "Nao foi possivel alterar o conteudo."
    );

    return;
  }


  await loadTeacherSubjectCatalog();

}


// =====================================================
// ALUNOS DO PROFESSOR
// =====================================================

async function loadTeacherStudents() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_students"
    );


  if (error) {

    console.error(
      "Erro ao carregar alunos:",
      error
    );

    currentTeacherStudents = [];

    return [];
  }


  currentTeacherStudents =
    data || [];


  return currentTeacherStudents;
}


// =====================================================
// COMPLETAR GRADE VISUAL DO HORARIO DO PROFESSOR
//
// Ex.: Perfil 08:00 - 20:00
// gera 08:00, 08:30, ..., 19:30.
// =====================================================

function fillTeacherScheduleWithWorkHourGrid(
  schedule
) {

  const settings =
    currentTeacherProfileSettings;


  if (
    !settings ||
    !settings.work_start_time ||
    !settings.work_end_time
  ) {

    return schedule || [];

  }


  const startMinutes =
    timeToMinutes(
      settings.work_start_time
    );


  const endMinutes =
    timeToEndBoundaryMinutes(
      settings.work_end_time
    );


  const result =
    [
      ...(schedule || [])
    ];


  for (
    let minutes =
      startMinutes;

    minutes + 30 <=
      endMinutes;

    minutes += 30
  ) {

    const startTime =
      minutesToClockTime(
        minutes
      );


    const endTime =
      minutesToClockTime(
        minutes + 30
      );


    const exists =
      result.some(
        slot =>
          normalizeTime(
            slot.start_time
          ) ===
          normalizeTime(
            startTime
          )
      );


    if (!exists) {

      result.push({

        start_time:
          startTime,

        end_time:
          endTime,

        status:
          "free",

        student_id:
          null,

        student_name:
          null,

        reservation_id:
          null,

        makeup_id:
          null,

        attendance:
          null,

        synthetic_work_slot:
          true

      });

    }

  }


  return result
    .filter(
      slot =>
        isTimeInsideTeacherWorkHours(
          slot.start_time,
          slot.end_time,
          settings
        )
    )
    .sort(
      (
        a,
        b
      ) =>
        timeToMinutes(
          a.start_time
        )
        -
        timeToMinutes(
          b.start_time
        )
    );

}


// =====================================================
// AGENDA SEMANAL DO PROFESSOR
// =====================================================

async function loadTeacherWeeklySchedule() {

  await loadCurrentTeacherProfileSettings();


  const body =
    document.getElementById(
      "teacherScheduleBody"
    );


  if (!body) {
    return;
  }


  const label =
    document.getElementById(
      "teacherSelectedWeekLabel"
    );


  if (label) {

    label.textContent =
      formatWeekLabel(
        selectedTeacherWeekStart
      );

  }


  body.innerHTML = `

    <tr>

      <td colspan="8">
        Carregando agenda...
      </td>

    </tr>

  `;


  const teacherWeekStartDb =
    formatDateForDatabase(
      selectedTeacherWeekStart
    );


  const {
    data: holidayData,
    error: holidayError
  } =
    await supabaseClient.rpc(
      "get_teacher_holidays_for_week",
      {
        p_week_start:
          teacherWeekStartDb
      }
    );


  if (holidayError) {

    console.warn(
      "Nao foi possivel carregar os feriados da semana:",
      holidayError
    );


    currentTeacherHolidayWeek =
      [];

  }

  else {

    currentTeacherHolidayWeek =
      holidayData || [];

  }


  renderTeacherHolidayDecisionArea();


  await loadTeacherClassLinksForAgenda();


  const pauseWeekEnd =
    addDays(
      selectedTeacherWeekStart,
      6
    );


  const {
    data: teacherPauseData,
    error: teacherPauseError
  } =
    await supabaseClient.rpc(
      "get_teacher_student_pause_periods",
      {

        p_from_date:
          formatDateForDatabase(
            selectedTeacherWeekStart
          ),

        p_to_date:
          formatDateForDatabase(
            pauseWeekEnd
          )

      }
    );


  if (teacherPauseError) {

    console.warn(
      "Nao foi possivel carregar as pausas dos alunos:",
      teacherPauseError
    );

    currentTeacherPausePeriods =
      [];

  }

  else {

    currentTeacherPausePeriods =
      teacherPauseData || [];

  }


  const days = [];


  for (
    let index = 0;
    index < 7;
    index++
  ) {

    const date =
      addDays(
        selectedTeacherWeekStart,
        index
      );


    const dateDb =
      formatDateForDatabase(
        date
      );


    const {
      data,
      error
    } =
      await supabaseClient.rpc(
        "get_teacher_schedule",
        {
          p_date:
            dateDb
        }
      );


    if (error) {

      console.error(
        "Erro ao carregar dia da agenda:",
        date,
        error
      );


      body.innerHTML = `

        <tr>

          <td colspan="8">
            N\u00E3o foi poss\u00EDvel carregar a agenda.
          </td>

        </tr>

      `;


      return;
    }


    const {
      data: attendanceData,
      error: attendanceError
    } =
      await supabaseClient.rpc(
        "get_teacher_attendance_for_date",
        {
          p_date:
            dateDb
        }
      );


    if (attendanceError) {

      console.warn(
        "N\u00E3o foi poss\u00EDvel carregar os registros de presen\u00E7a do dia:",
        date,
        attendanceError
      );

    }


    const attendanceList =
      attendanceData || [];


    const schedule =
      fillTeacherScheduleWithWorkHourGrid(
        (data || [])
          .filter(
            slot =>
              isTimeInsideTeacherWorkHours(
                slot.start_time,
                slot.end_time,
                currentTeacherProfileSettings
              )
          )
      )
        .map(
        slot => {

          const slotStart =
            timeToMinutes(
              slot.start_time
            );

          const slotEnd =
            timeToMinutes(
              slot.end_time
            );


          const attendance =
            attendanceList.find(
              item => {

                const itemStart =
                  timeToMinutes(
                    item.start_time
                  );

                const itemEnd =
                  timeToMinutes(
                    item.end_time
                  );


                return (
                  itemStart < slotEnd &&
                  itemEnd > slotStart
                );

              }
            ) || null;


          return {
            ...slot,
            attendance
          };

        }
      );


    const holiday =
      currentTeacherHolidayWeek.find(
        item =>
          String(
            item.holiday_date
          ) ===
          dateDb
      )
      || null;


    days.push({
      date,
      schedule,
      holiday,
      is_work_day:
        isTeacherWorkDayDate(
          date
        )
    });

  }


  renderTeacherWeeklySchedule(
    days
  );

}


// =====================================================
// RENDERIZAR AGENDA DO PROFESSOR
// =====================================================

function renderTeacherWeeklySchedule(days) {

  const head =
    document.getElementById("teacherScheduleHead");

  const body =
    document.getElementById("teacherScheduleBody");


  if (!head || !body) {
    return;
  }


  const dayNames = [
    "Segunda",
    "Ter\u00E7a",
    "Quarta",
    "Quinta",
    "Sexta",
    "S\u00E1bado",
    "Domingo"
  ];


  head.innerHTML = `

    <tr>

      <th>
        Hor\u00E1rio
      </th>

      ${days
        .map(
          (day, index) => `

            <th>

              ${dayNames[index]}

              <br>

              <small>
                ${formatDate(day.date)}
              </small>

              ${
                !day.is_work_day

                  ? `

                    <br>

                    <small
                      style="
                        color:#888;
                        font-weight:normal;
                      "
                    >
                      Nao atende
                    </small>

                  `

                  : ""
              }

            </th>

          `
        )
        .join("")}

    </tr>

  `;


  const times =
    new Set();


  days.forEach(
    day => {

      day.schedule.forEach(
        slot => {

          times.add(
            normalizeTime(
              slot.start_time
            )
          );

        }
      );

    }
  );


  const sortedTimes =
    Array
      .from(times)
      .sort();


  body.innerHTML =
    "";


  sortedTimes.forEach(
    time => {

      const row =
        document.createElement(
          "tr"
        );


      const timeCell =
        document.createElement(
          "td"
        );


      timeCell.textContent =
        time;


      row.appendChild(
        timeCell
      );


      days.forEach(
        day => {

          const cell =
            document.createElement(
              "td"
            );


          cell.classList.add(
            "schedule-cell"
          );


          const slot =
            day.schedule.find(
              item =>
                normalizeTime(
                  item.start_time
                ) === time
            );


          const todayWorkDayCheck =
            new Date();


          todayWorkDayCheck.setHours(
            0,
            0,
            0,
            0
          );


          const cellWorkDayCheck =
            new Date(
              day.date
            );


          cellWorkDayCheck.setHours(
            0,
            0,
            0,
            0
          );


          const isCurrentOrFutureDate =
            cellWorkDayCheck >=
            todayWorkDayCheck;


          if (
            !day.is_work_day &&
            isCurrentOrFutureDate
          ) {

            cell.innerHTML = `

              <strong>
                Nao atende
              </strong>

              <br>

              <small>
                Fora dos dias de atendimento
              </small>

            `;


            cell.style.backgroundColor =
              "#eeeeee";

            cell.style.color =
              "#777777";

            cell.style.cursor =
              "default";

            cell.title =
              "Este dia nao faz parte dos dias de atendimento configurados no Perfil.";


            row.appendChild(
              cell
            );


            return;
          }


          if (!slot) {

            cell.textContent =
              "\u2014";

            cell.style.backgroundColor =
              "#eeeeee";

            cell.style.color =
              "#777777";


            row.appendChild(
              cell
            );


            return;
          }


          if (
            day.holiday
            &&
            day.holiday.has_classes ===
              false
          ) {

            cell.innerHTML = `

              <strong>
                Feriado
              </strong>

              <br>

              <small>
                Sem aula
              </small>

            `;


            cell.style.backgroundColor =
              "#f7e9e1";

            cell.style.color =
              "#6b3fa0";

            cell.title =
              day.holiday.holiday_name;


            row.appendChild(
              cell
            );


            return;
          }


          const status =
            normalizeTeacherScheduleStatus(
              slot.status
            );


          const attendance =
            slot.attendance ||
            null;


          const attendanceStatus =
            attendance
              ? String(
                  attendance.attendance_status ||
                  ""
                ).toLowerCase()
              : "";


          const completedMakeup =
            Boolean(
              attendance &&
              attendance.occurrence_type ===
                "makeup" &&
              attendanceStatus ===
                "makeup"
            );


          const studentName =
            String(
              (
                attendance &&
                attendance.student_name
              )
              ||
              slot.student_name
              ||
              ""
            ).trim();


          const agendaStudentName =
            formatAgendaStudentName(
              studentName
            );


          const teacherSlotDateDb =
            formatDateForDatabase(
              day.date
            );


          const pausePeriod =
            currentTeacherPausePeriods.find(
              period => {

                if (
                  String(
                    period.student_id
                  ) !==
                  String(
                    slot.student_id || ""
                  )
                ) {
                  return false;
                }


                const startsOn =
                  String(
                    period.starts_on
                  );


                const endsOn =
                  period.ends_on
                    ? String(
                        period.ends_on
                      )
                    : null;


                return (
                  teacherSlotDateDb >=
                    startsOn
                  &&
                  (
                    !endsOn
                    ||
                    teacherSlotDateDb <=
                      endsOn
                  )
                );

              }
            );


          const pausedRegularLesson =
            Boolean(
              pausePeriod
              &&
              status.type ===
                "lesson"
              &&
              !attendance
            );


          const pausedReservedLesson =
            Boolean(
              pausedRegularLesson
              &&
              pausePeriod.keep_slot_reserved !==
                false
            );


          const pausedReleasedLesson =
            Boolean(
              pausedRegularLesson
              &&
              pausePeriod.keep_slot_reserved ===
                false
            );


          // ===========================================
          // AULAS PAUSADAS - HORARIO RESERVADO
          // ===========================================

          if (pausedReservedLesson) {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  agendaStudentName ||
                  (
                    pausePeriod &&
                    pausePeriod.student_name
                  )
                  ||
                  "Aluno"
                )}
              </strong>

              <br>

              <small>
                Aulas pausadas - horario reservado
              </small>

            `;


            cell.style.backgroundColor =
              "#e5e5e5";

            cell.style.color =
              "#555555";

          }


          // ===========================================
          // AULAS PAUSADAS - HORARIO LIBERADO
          // ===========================================

          else if (pausedReleasedLesson) {

            cell.innerHTML = `

              <strong>
                Livre
              </strong>

              <br>

              <small>
                Liberado durante a pausa de
                ${escapeHtml(
                  agendaStudentName ||
                  (
                    pausePeriod &&
                    pausePeriod.student_name
                  )
                  ||
                  "aluno"
                )}
              </small>

            `;


            cell.style.backgroundColor =
              "#dff5e3";

            cell.style.color =
              "#246b37";

          }


          // ===========================================
          // REPOSICAO JA REALIZADA
          // ===========================================

          else if (completedMakeup) {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  agendaStudentName ||
                  "Aluno"
                )}
              </strong>

              <br>

              <small>
                Reposi\u00E7\u00E3o realizada
              </small>

            `;


            cell.style.backgroundColor =
              "#f5e8c8";

            cell.style.color =
              "#a9573a";

          }


          // ===========================================
          // LIVRE
          // ===========================================

          else if (
            status.type ===
            "free"
          ) {

            cell.textContent =
              "Livre";

            cell.style.backgroundColor =
              "#dff5e3";

            cell.style.color =
              "#246b37";

          }


          // ===========================================
          // AULA
          // ===========================================

          else if (
            status.type ===
            "lesson"
          ) {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  agendaStudentName ||
                  "Aula"
                )}
              </strong>

              <br>

              <small>
                Aula
              </small>

            `;


            cell.style.backgroundColor =
              "#f7e9e1";

            cell.style.color =
              "#a9573a";

          }


          // ===========================================
          // REPOSICAO
          // ===========================================

          else if (
            status.type ===
            "makeup"
          ) {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  agendaStudentName ||
                  "Aluno"
                )}
              </strong>

              <br>

              <small>
                Reposi\u00E7\u00E3o
              </small>

            `;


            cell.style.backgroundColor =
              "#f5e8c8";

            cell.style.color =
              "#a9573a";

          }


          // ===========================================
          // CANCELADA
          // ===========================================

          else if (
            status.type ===
            "cancelled"
          ) {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  agendaStudentName ||
                  "Aluno"
                )}
              </strong>

              <br>

              <small>
                Cancelada
              </small>

            `;


            cell.style.backgroundColor =
              "#fff3cd";

            cell.style.color =
              "#856404";

          }


          // ===========================================
          // INDISPONIVEL
          // ===========================================

          else if (
            status.type ===
            "unavailable"
          ) {

            cell.textContent =
              "Indispon\u00EDvel";

            cell.style.backgroundColor =
              "#333333";

            cell.style.color =
              "#ffffff";

          }


          // ===========================================
          // OUTRA RESERVA
          // ===========================================

          else {

            cell.innerHTML = `

              <strong>
                ${escapeHtml(
                  studentName ||
                  "Reservado"
                )}
              </strong>

              <br>

              <small>
                Reserva
              </small>

            `;

          }


          // ===========================================
          // MOSTRAR PRESENCA JA REGISTRADA
          // ===========================================

          if (
            attendance &&
            !completedMakeup
          ) {

            const badge =
              document.createElement(
                "div"
              );


            badge.style.marginTop =
              "5px";

            badge.style.fontSize =
              "12px";

            badge.style.fontWeight =
              "bold";


            badge.textContent =
              formatTeacherAttendanceShort(
                attendanceStatus
              );


            cell.appendChild(
              badge
            );

          }


          // ===========================================
          // DATA / HORARIO
          // ===========================================

          const todayForEdit =
            new Date();


          todayForEdit.setHours(
            0,
            0,
            0,
            0
          );


          const cellDateForEdit =
            new Date(
              day.date
            );


          cellDateForEdit.setHours(
            0,
            0,
            0,
            0
          );


          const isPastDate =
            cellDateForEdit <
            todayForEdit;


          const isOccurrence =
            (
              status.type === "lesson" ||
              status.type === "makeup" ||
              completedMakeup ||
              Boolean(attendance)
            );


          const occurrenceFinished =
            isOccurrence

              ? isTeacherOccurrenceFinished(
                  day.date,
                  slot,
                  day.schedule
                )

              : false;


          // ===========================================
          // AULA / REPOSICAO JA ENCERRADA
          // ===========================================

          if (
            pausedReservedLesson
          ) {

            cell.style.cursor =
              "default";


            cell.title =
              "Aulas pausadas. O horario fixo continua reservado para este aluno.";

          }


          else if (
            pausedReleasedLesson
          ) {

            cell.style.cursor =
              "pointer";


            cell.title =
              "Horario liberado somente durante a pausa. Clique para agendar uma reposicao.";


            cell.addEventListener(
              "click",
              () => {

                openTeacherMakeupBooking(
                  day.date,
                  {
                    ...slot,
                    status:
                      "free",
                    student_id:
                      null,
                    student_name:
                      null
                  }
                );

              }
            );

          }


          else if (
            isOccurrence &&
            (
              occurrenceFinished ||
              Boolean(attendance)
            )
          ) {

            cell.style.cursor =
              "pointer";


            cell.title =
              attendance

                ? "Clique para revisar o registro desta aula."

                : "Clique para registrar presen\u00E7a / falta.";


            cell.addEventListener(
              "click",
              () => {

                openTeacherAttendanceManager(
                  day.date,
                  slot
                );

              }
            );

          }


          // ===========================================
          // AGENDA FIXA - HOJE / FUTURO
          // ===========================================

          else if (
            (
              status.type === "free" ||
              status.type === "lesson" ||
              status.type === "unavailable"
            )
            &&
            !isPastDate
          ) {

            cell.style.cursor =
              "pointer";


            cell.title =
              "Clique para editar este hor\u00E1rio.";


            cell.addEventListener(
              "click",
              () => {

                openTeacherScheduleEditor(
                  day.date,
                  slot
                );

              }
            );

          }


          // ===========================================
          // REPOSICAO FUTURA
          // ===========================================

          else if (
            status.type === "makeup"
          ) {

            cell.style.cursor =
              "pointer";


            cell.title =
              "Clique para gerenciar esta reposi\u00E7\u00E3o.";


            cell.addEventListener(
              "click",
              () => {

                openTeacherMakeupReservationManager(
                  day.date,
                  slot
                );

              }
            );

          }


          // ===========================================
          // PASSADO SEM AULA
          // ===========================================

          else if (isPastDate) {

            cell.style.cursor =
              "default";


            cell.title =
              "Semanas anteriores s\u00E3o somente para consulta.";

          }


          else if (
            status.type === "cancelled"
          ) {

            cell.style.cursor =
              "default";


            cell.title =
              "Esta ocorr\u00EAncia foi cancelada.";

          }


          row.appendChild(
            cell
          );

        }
      );


      body.appendChild(
        row
      );

    }
  );


  if (
    sortedTimes.length === 0
  ) {

    body.innerHTML = `

      <tr>

        <td colspan="8">
          Nenhum hor\u00E1rio cadastrado.
        </td>

      </tr>

    `;

  }

}



// =====================================================
// PRESENCA / FALTAS DIRETO NA AGENDA DO PROFESSOR
// =====================================================

function formatTeacherAttendanceShort(
  status
) {

  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {

    case "present":
      return "\u2705 Presente";

    case "absent":
      return "\u274C Falta sem justificativa";

    case "justified_absence":
      return "\u26A0\uFE0F Falta justificada";

    case "makeup":
      return "\u2705 Reposi\u00E7\u00E3o realizada";

    default:
      return "";

  }

}


// =====================================================
// DESCOBRIR SE A OCORRENCIA JA TERMINOU
// =====================================================

function isTeacherOccurrenceFinished(
  date,
  slot,
  schedule
) {

  if (
    slot.attendance &&
    slot.attendance.end_time
  ) {

    const attendanceEnd =
      combineDateAndTime(
        date,
        slot.attendance.end_time
      );


    if (
      normalizeTime(
        slot.attendance.end_time
      ) ===
        "00:00"
      &&
      normalizeTime(
        slot.start_time
      ) !==
        "00:00"
    ) {

      attendanceEnd.setDate(
        attendanceEnd.getDate() + 1
      );

    }


    return (
      attendanceEnd <=
      new Date()
    );

  }


  let occurrenceStart =
    timeToMinutes(
      slot.start_time
    );


  let occurrenceEnd =
    intervalEndToMinutes(
      slot.start_time,
      slot.end_time
    );


  const normalizedStatus =
    normalizeTeacherScheduleStatus(
      slot.status
    ).type;


  // ===================================================
  // REPOSICAO:
  // TODAS AS CELULAS DA MESMA RESERVA
  // ===================================================

  if (
    normalizedStatus === "makeup" &&
    slot.reservation_id
  ) {

    schedule
      .filter(
        item =>
          item.reservation_id ===
          slot.reservation_id
      )
      .forEach(
        item => {

          occurrenceStart =
            Math.min(
              occurrenceStart,
              timeToMinutes(
                item.start_time
              )
            );


          occurrenceEnd =
            Math.max(
              occurrenceEnd,
              timeToMinutes(
                item.end_time
              )
            );

        }
      );

  }


  // ===================================================
  // AULA REGULAR:
  // JUNTAR APENAS BLOCOS CONTIGUOS DO MESMO ALUNO
  // ===================================================

  else if (
    normalizedStatus === "lesson" &&
    slot.student_id
  ) {

    let changed =
      true;


    while (changed) {

      changed =
        false;


      schedule.forEach(
        item => {

          const itemStatus =
            normalizeTeacherScheduleStatus(
              item.status
            ).type;


          if (
            itemStatus !== "lesson" ||
            item.student_id !==
              slot.student_id
          ) {
            return;
          }


          const itemStart =
            timeToMinutes(
              item.start_time
            );


          const itemEnd =
            intervalEndToMinutes(
              item.start_time,
              item.end_time
            );


          if (
            itemEnd === occurrenceStart
          ) {

            occurrenceStart =
              itemStart;

            changed =
              true;

          }


          if (
            itemStart === occurrenceEnd
          ) {

            occurrenceEnd =
              itemEnd;

            changed =
              true;

          }

        }
      );

    }

  }


  const endTime =
    minutesToClockTime(
      occurrenceEnd
    );


  const occurrenceEndDate =
    combineDateAndTime(
      date,
      endTime
    );


  if (
    occurrenceEnd >=
      24 * 60
  ) {

    occurrenceEndDate.setDate(
      occurrenceEndDate.getDate() + 1
    );

  }


  return (
    occurrenceEndDate <=
    new Date()
  );

}


// =====================================================
// ABRIR REGISTRO DE PRESENCA
// =====================================================

function escapeSelectValue(
  value
) {

  return escapeHtml(
    value || ""
  );

}


// =====================================================
// MATERIAS DO PROFESSOR PARA O REGISTRO
// =====================================================

async function getTeacherSubjectsForRecord() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_subjects_for_record"
    );


  if (error) {

    console.error(
      "Erro ao carregar materias:",
      error
    );

    return [];
  }


  return data || [];

}


// =====================================================
// CONTEUDOS DA MATERIA
// =====================================================

async function getTeacherContentsForRecord(
  subjectId
) {

  if (!subjectId) {
    return [];
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_contents_for_record",
      {
        p_subject_id:
          subjectId
      }
    );


  if (error) {

    console.error(
      "Erro ao carregar conteudos:",
      error
    );

    return [];
  }


  return data || [];

}


// =====================================================
// PREENCHER SELECT DE CONTEUDO
// =====================================================

function fillTeacherContentSelect(
  contents,
  selectedContentId = null
) {

  const select =
    document.getElementById(
      "teacherLessonContent"
    );


  if (!select) {
    return;
  }


  select.innerHTML = `

    <option value="">
      Nao informado
    </option>

    ${contents
      .map(
        item => `

          <option
            value="${escapeSelectValue(
              item.content_id
            )}"
            ${
              String(
                item.content_id
              ) ===
              String(
                selectedContentId || ""
              )
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(
              item.content_title
            )}
          </option>

        `
      )
      .join("")}

  `;


  select.disabled =
    !document.getElementById(
      "teacherLessonSubject"
    )?.value;

}


// =====================================================
// CADASTRAR NOVO CONTEUDO
// =====================================================

async function createTeacherContentFromRecord() {

  const subjectSelect =
    document.getElementById(
      "teacherLessonSubject"
    );


  const input =
    document.getElementById(
      "teacherNewContentTitle"
    );


  const message =
    document.getElementById(
      "teacherNewContentMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherNewContentButton"
    );


  if (
    !subjectSelect ||
    !input
  ) {
    return;
  }


  const subjectId =
    subjectSelect.value;


  const title =
    input.value.trim();


  if (!subjectId) {

    if (message) {

      message.textContent =
        "Selecione a materia primeiro.";

      message.style.color =
        "red";

    }

    return;
  }


  if (!title) {

    if (message) {

      message.textContent =
        "Digite o nome do conteudo.";

      message.style.color =
        "red";

    }

    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "create_teacher_content_for_record",
      {
        p_subject_id:
          subjectId,

        p_title:
          title
      }
    );


  if (error) {

    console.error(
      "Erro ao cadastrar conteudo:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel cadastrar o conteudo.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar novo conteudo";

    }


    return;
  }


  const contents =
    await getTeacherContentsForRecord(
      subjectId
    );


  fillTeacherContentSelect(
    contents,
    data
  );


  input.value =
    "";


  const area =
    document.getElementById(
      "teacherNewContentArea"
    );


  if (area) {

    area.style.display =
      "none";

  }


  if (message) {

    message.textContent =
      "";

  }

}


// =====================================================
// PRESENCA / FALTAS DIRETO NA AGENDA DO PROFESSOR
// COM MATERIA + CONTEUDO
// =====================================================

async function openTeacherAttendanceManager(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {
    return;
  }


  area.innerHTML = `

    <div class="card">

      <h3>
        Carregando registro da aula...
      </h3>

    </div>

  `;


  const [
    occurrenceResult,
    subjects
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_teacher_occurrence_record",
        {

          p_date:
            formatDateForDatabase(
              date
            ),

          p_start_time:
            normalizeTime(
              slot.start_time
            )

        }
      ),

      getTeacherSubjectsForRecord()

    ]);


  const {
    data,
    error
  } =
    occurrenceResult;


  if (error) {

    console.error(
      "Erro ao carregar registro da aula:",
      error
    );


    area.innerHTML = `

      <div class="card">

        <h3>
          Registro da aula
        </h3>

        <p>
          ${
            escapeHtml(
              error.message ||
              "Nao foi possivel carregar esta aula."
            )
          }
        </p>

        <button
          type="button"
          class="secondary-button"
          id="closeTeacherAttendanceButton"
        >
          Fechar
        </button>

      </div>

    `;


    const closeButton =
      document.getElementById(
        "closeTeacherAttendanceButton"
      );


    if (closeButton) {

      closeButton.onclick =
        () => {

          area.innerHTML =
            "";

        };

    }


    return;
  }


  const occurrence =
    Array.isArray(data)
      ? data[0]
      : data;


  if (!occurrence) {

    area.innerHTML = `

      <div class="card">
        <p>
          Nao foi possivel identificar esta aula.
        </p>
      </div>

    `;

    return;
  }


  const isMakeup =
    occurrence.occurrence_type ===
    "makeup";


  let occurrencePlan =
    null;


  if (!isMakeup) {

    const {
      data: planData,
      error: planError
    } =
      await supabaseClient.rpc(
        "get_teacher_plan_for_occurrence",
        {
          p_student_id:
            occurrence.student_id,

          p_date:
            occurrence.lesson_date
        }
      );


    if (planError) {

      console.warn(
        "Nao foi possivel carregar o planejamento da aula:",
        planError
      );

    }

    else {

      occurrencePlan =
        Array.isArray(
          planData
        )
          ? planData[0] || null
          : planData || null;

    }

  }


  const currentStatus =
    String(
      occurrence.attendance_status ||
      ""
    ).toLowerCase();


  const attendanceNotes =
    occurrence.attendance_notes ||
    "";


  const teacherNotes =
    occurrence.teacher_notes ||
    (
      occurrencePlan
        ? occurrencePlan.notes || ""
        : ""
    );


  const selectedSubjectId =
    occurrence.subject_id ||
    (
      occurrencePlan
        ? occurrencePlan.subject_id || ""
        : ""
    );


  const selectedContentId =
    occurrence.content_id ||
    (
      occurrencePlan
        ? occurrencePlan.content_id || ""
        : ""
    );


  const initialContents =
    selectedSubjectId

      ? await getTeacherContentsForRecord(
          selectedSubjectId
        )

      : [];


  const statusOptions =
    isMakeup

      ? `

        <option
          value="makeup"
          selected
        >
          Reposicao realizada
        </option>

      `

      : `

        <option value="">
          Selecione
        </option>

        <option
          value="present"
          ${
            currentStatus === "present"
              ? "selected"
              : ""
          }
        >
          Presente
        </option>

        <option
          value="absent"
          ${
            currentStatus === "absent"
              ? "selected"
              : ""
          }
        >
          Falta sem justificativa
        </option>

        <option
          value="justified_absence"
          ${
            currentStatus ===
            "justified_absence"
              ? "selected"
              : ""
          }
        >
          Falta justificada (gera reposicao)
        </option>

      `;


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >

      <h3>
        ${
          isMakeup
            ? "Registrar reposicao"
            : "Registrar aula"
        }
      </h3>


      <p>
        <strong>Aluno:</strong>

        ${escapeHtml(
          occurrence.student_name ||
          "Aluno"
        )}
      </p>


      <p>
        <strong>Data:</strong>

        ${formatDate(
          new Date(
            occurrence.lesson_date +
            "T12:00:00"
          )
        )}
      </p>


      <p>
        <strong>Horario:</strong>

        ${normalizeTime(
          occurrence.start_time
        )}

        as

        ${normalizeTime(
          occurrence.end_time
        )}
      </p>


      ${
        currentStatus

          ? `

            <div
              style="
                margin-top:15px;
                padding:12px;
                border-radius:8px;
                background:#f7e9e1;
              "
            >

              <strong>
                Registro atual:
              </strong>

              ${escapeHtml(
                formatTeacherAttendanceShort(
                  currentStatus
                )
              )}

            </div>

          `

          : ""
      }


      ${
        occurrencePlan

          ? `

            <div
              style="
                margin-top:15px;
                padding:12px;
                border-radius:8px;
                background:#e8f5e9;
              "
            >
              <strong>
                Planejamento carregado:
              </strong>

              os campos de materia, conteudo e observacoes
              foram preenchidos automaticamente.
            </div>

          `

          : ""
      }


      <!-- ==========================================
           PRESENCA
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherAttendanceStatus"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          ${
            isMakeup
              ? "Situacao"
              : "Presenca"
          }
        </label>


        <select
          id="teacherAttendanceStatus"
          ${
            isMakeup
              ? "disabled"
              : ""
          }
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          ${statusOptions}

        </select>

      </div>


      <div
        id="teacherAttendanceWarning"
        style="
          margin-top:12px;
        "
      ></div>


      <!-- ==========================================
           MATERIA
           ========================================== -->

      <div
        style="
          margin-top:18px;
          padding-top:18px;
          border-top:1px solid #e5e5e5;
        "
      >

        <label
          for="teacherLessonSubject"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Materia
        </label>


        <select
          id="teacherLessonSubject"
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option value="">
            Nao informada
          </option>


          ${subjects
            .map(
              subject => `

                <option
                  value="${escapeSelectValue(
                    subject.subject_id
                  )}"
                  ${
                    String(
                      subject.subject_id
                    ) ===
                    String(
                      selectedSubjectId
                    )
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(
                    subject.subject_name
                  )}
                </option>

              `
            )
            .join("")}

        </select>


        ${
          subjects.length === 0

            ? `

              <p
                style="
                  margin-top:8px;
                  font-size:13px;
                  color:#856404;
                "
              >
                Nenhuma materia ativa cadastrada.
                Voce ainda pode salvar a presenca
                e as observacoes.
              </p>

            `

            : ""
        }

      </div>


      <!-- ==========================================
           CONTEUDO
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherLessonContent"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Conteudo trabalhado
        </label>


        <select
          id="teacherLessonContent"
          ${
            selectedSubjectId
              ? ""
              : "disabled"
          }
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option value="">
            Nao informado
          </option>


          ${initialContents
            .map(
              item => `

                <option
                  value="${escapeSelectValue(
                    item.content_id
                  )}"
                  ${
                    String(
                      item.content_id
                    ) ===
                    String(
                      selectedContentId
                    )
                      ? "selected"
                      : ""
                  }
                >
                  ${escapeHtml(
                    item.content_title
                  )}
                </option>

              `
            )
            .join("")}

        </select>


        <button
          type="button"
          class="secondary-button"
          id="openTeacherNewContentButton"
          style="
            margin-top:10px;
          "
        >
          + Novo conteudo
        </button>


        <div
          id="teacherNewContentArea"
          style="
            display:none;
            margin-top:12px;
            padding:15px;
            border-radius:8px;
            background:#f7f7f7;
          "
        >

          <label
            for="teacherNewContentTitle"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:8px;
            "
          >
            Nome do novo conteudo
          </label>


          <input
            type="text"
            id="teacherNewContentTitle"
            maxlength="200"
            placeholder="Ex.: Present Perfect - ever / never"
            style="
              width:100%;
              box-sizing:border-box;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >


          <div
            style="
              display:flex;
              gap:10px;
              flex-wrap:wrap;
              margin-top:10px;
            "
          >

            <button
              type="button"
              class="action-button"
              id="saveTeacherNewContentButton"
            >
              Salvar novo conteudo
            </button>


            <button
              type="button"
              class="secondary-button"
              id="cancelTeacherNewContentButton"
            >
              Cancelar
            </button>

          </div>


          <p
            id="teacherNewContentMessage"
            style="
              margin-top:8px;
            "
          ></p>

        </div>

      </div>


      <!-- ==========================================
           OBSERVACAO DE PRESENCA
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherAttendanceNotes"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Observacao sobre presenca / falta
        </label>


        <textarea
          id="teacherAttendanceNotes"
          rows="3"
          maxlength="1000"
          placeholder="Ex.: aluno avisou que estava doente..."
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
          "
        >${escapeHtml(
          attendanceNotes
        )}</textarea>

      </div>


      <!-- ==========================================
           OBSERVACOES DA AULA
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherLessonNotes"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Observacoes da aula
        </label>


        <textarea
          id="teacherLessonNotes"
          rows="4"
          maxlength="3000"
          placeholder="Ex.: desempenho, pontos de atencao, orientacoes..."
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
          "
        >${escapeHtml(
          teacherNotes
        )}</textarea>

      </div>


      ${
        isMakeup

          ? `

            <div
              style="
                margin-top:15px;
                padding:12px;
                border-radius:8px;
                background:#f7e9e1;
              "
            >
              Ao salvar, a reposicao sera marcada
              como realizada e deixara de ficar pendente.
            </div>

          `

          : ""
      }


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="saveTeacherAttendanceButton"
        >
          Salvar registro
        </button>


        <button
          type="button"
          class="secondary-button"
          id="closeTeacherAttendanceButton"
        >
          Fechar
        </button>

      </div>


      <p
        id="teacherAttendanceMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const statusSelect =
    document.getElementById(
      "teacherAttendanceStatus"
    );


  const warning =
    document.getElementById(
      "teacherAttendanceWarning"
    );


  const subjectSelect =
    document.getElementById(
      "teacherLessonSubject"
    );


  const contentSelect =
    document.getElementById(
      "teacherLessonContent"
    );


  function updateAttendanceWarning() {

    if (
      !statusSelect ||
      !warning
    ) {
      return;
    }


    if (
      statusSelect.value ===
      "absent"
    ) {

      warning.innerHTML = `

        <div
          style="
            padding:12px;
            border-radius:8px;
            background:#fff3cd;
          "
        >
          <strong>Falta sem justificativa:</strong>
          esta falta nao gera reposicao.
        </div>

      `;

    }


    else if (
      statusSelect.value ===
      "justified_absence"
    ) {

      warning.innerHTML = `

        <div
          style="
            padding:12px;
            border-radius:8px;
            background:#f7e9e1;
          "
        >
          <strong>Falta justificada:</strong>
          ao salvar, o sistema gerara
          automaticamente uma reposicao para o aluno.
        </div>

      `;

    }


    else {

      warning.innerHTML =
        "";

    }

  }


  updateAttendanceWarning();


  if (
    statusSelect &&
    !isMakeup
  ) {

    statusSelect.addEventListener(
      "change",
      updateAttendanceWarning
    );

  }


  if (subjectSelect) {

    subjectSelect.addEventListener(
      "change",
      async () => {

        const subjectId =
          subjectSelect.value;


        if (!contentSelect) {
          return;
        }


        if (!subjectId) {

          contentSelect.innerHTML = `
            <option value="">
              Nao informado
            </option>
          `;

          contentSelect.disabled =
            true;

          return;
        }


        contentSelect.disabled =
          true;


        contentSelect.innerHTML = `
          <option value="">
            Carregando...
          </option>
        `;


        const contents =
          await getTeacherContentsForRecord(
            subjectId
          );


        fillTeacherContentSelect(
          contents
        );

      }
    );

  }


  const newContentButton =
    document.getElementById(
      "openTeacherNewContentButton"
    );


  if (newContentButton) {

    newContentButton.addEventListener(
      "click",
      () => {

        if (
          !subjectSelect ||
          !subjectSelect.value
        ) {

          alert(
            "Selecione uma materia antes de cadastrar um conteudo."
          );

          return;
        }


        const newContentArea =
          document.getElementById(
            "teacherNewContentArea"
          );


        if (newContentArea) {

          newContentArea.style.display =
            "block";

        }

      }
    );

  }


  const saveNewContentButton =
    document.getElementById(
      "saveTeacherNewContentButton"
    );


  if (saveNewContentButton) {

    saveNewContentButton.addEventListener(
      "click",
      createTeacherContentFromRecord
    );

  }


  const cancelNewContentButton =
    document.getElementById(
      "cancelTeacherNewContentButton"
    );


  if (cancelNewContentButton) {

    cancelNewContentButton.addEventListener(
      "click",
      () => {

        const newContentArea =
          document.getElementById(
            "teacherNewContentArea"
          );


        if (newContentArea) {

          newContentArea.style.display =
            "none";

        }

      }
    );

  }


  const saveButton =
    document.getElementById(
      "saveTeacherAttendanceButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      () => {

        saveTeacherAttendance(
          date,
          slot,
          isMakeup
        );

      }
    );

  }


  const closeButton =
    document.getElementById(
      "closeTeacherAttendanceButton"
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

}


// =====================================================
// SALVAR REGISTRO COMPLETO DA AULA
// =====================================================

async function saveTeacherAttendance(
  date,
  slot,
  isMakeup
) {

  const statusSelect =
    document.getElementById(
      "teacherAttendanceStatus"
    );


  const attendanceNotes =
    document.getElementById(
      "teacherAttendanceNotes"
    );


  const teacherNotes =
    document.getElementById(
      "teacherLessonNotes"
    );


  const subjectSelect =
    document.getElementById(
      "teacherLessonSubject"
    );


  const contentSelect =
    document.getElementById(
      "teacherLessonContent"
    );


  const button =
    document.getElementById(
      "saveTeacherAttendanceButton"
    );


  const message =
    document.getElementById(
      "teacherAttendanceMessage"
    );


  const status =
    isMakeup
      ? "makeup"
      : (
          statusSelect
            ? statusSelect.value
            : ""
        );


  const subjectId =
    subjectSelect
      ? subjectSelect.value || null
      : null;


  const contentId =
    contentSelect
      ? contentSelect.value || null
      : null;


  if (!status) {

    if (message) {

      message.textContent =
        "Selecione a presenca do aluno.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    contentId &&
    !subjectId
  ) {

    if (message) {

      message.textContent =
        "Selecione a materia correspondente ao conteudo.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    status === "justified_absence"
  ) {

    const confirmed =
      window.confirm(

        "Confirmar falta justificada?\n\n" +
        "Uma reposicao sera gerada automaticamente para o aluno."

      );


    if (!confirmed) {
      return;
    }

  }


  else if (
    status === "absent"
  ) {

    const confirmed =
      window.confirm(

        "Confirmar falta sem justificativa?\n\n" +
        "Esta falta nao gerara reposicao."

      );


    if (!confirmed) {
      return;
    }

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
      "save_teacher_occurrence_record",
      {

        p_date:
          formatDateForDatabase(
            date
          ),

        p_start_time:
          normalizeTime(
            slot.start_time
          ),

        p_attendance_status:
          status,

        p_attendance_notes:
          attendanceNotes
            ? attendanceNotes.value.trim() || null
            : null,

        p_subject_id:
          subjectId,

        p_content_id:
          contentId,

        p_teacher_notes:
          teacherNotes
            ? teacherNotes.value.trim() || null
            : null

      }
    );


  if (error) {

    console.error(
      "Erro ao salvar registro da aula:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o registro.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar registro";

    }


    return;
  }


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  await loadTeacherWeeklySchedule();


  if (
    document.getElementById(
      "teacherAttendanceReportList"
    )
  ) {

    await loadTeacherAttendanceReport();

  }


  alert(
    isMakeup
      ? "Reposicao registrada como realizada."
      : "Registro da aula salvo com sucesso."
  );

}


// =====================================================
// STATUS DA AGENDA DO PROFESSOR
// =====================================================

function normalizeTeacherScheduleStatus(
  status
) {

  switch (
    String(
      status || ""
    ).toLowerCase()
  ) {

    case "free":
    case "available":

      return {
        type: "free"
      };


    case "lesson":

      return {
        type: "lesson"
      };


    case "makeup":

      return {
        type: "makeup"
      };


    case "cancelled":

      return {
        type: "cancelled"
      };


    case "unavailable":

      return {
        type: "unavailable"
      };


    case "reservation":

      return {
        type: "reservation"
      };


    default:

      return {
        type: "reservation"
      };

  }

}


// =====================================================
// EDITAR HOR\u00C1RIO DO PROFESSOR
// =====================================================

async function openTeacherScheduleEditor(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {

    console.error(
      "\u00C1rea de edi\u00E7\u00E3o da agenda do professor n\u00E3o encontrada."
    );

    return;
  }


  // ===================================================
  // N\u00C3O PERMITIR ALTERA\u00C7\u00C3O RETROATIVA
  // ===================================================

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const selectedDate =
    new Date(
      date
    );

  selectedDate.setHours(
    0,
    0,
    0,
    0
  );


  if (
    selectedDate <
    today
  ) {

    alert(
      "Semanas anteriores s\u00E3o somente para consulta. " +
      "Altera\u00E7\u00F5es na agenda fixa n\u00E3o podem modificar o passado."
    );

    return;
  }


  if (
    currentTeacherStudents.length === 0
  ) {

    await loadTeacherStudents();

  }


  const dayOfWeek =
    (
      (
        date.getDay() + 6
      ) % 7
    ) + 1;


  const currentStatus =
    String(
      slot.status || ""
    ).toLowerCase();


  const editableStatus =
    currentStatus === "lesson"
      ? "lesson"

      : currentStatus ===
        "unavailable"
        ? "unavailable"

        : "free";


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c96f4a;
      "
    >

      <h3>
        Editar hor\u00E1rio fixo
      </h3>


      <p>
        <strong>Dia:</strong>
        ${formatDay(dayOfWeek)}
      </p>


      <p>
        <strong>Hor\u00E1rio:</strong>

        ${normalizeTime(
          slot.start_time
        )}

        \u00E0s

        ${normalizeTime(
          slot.end_time
        )}
      </p>


      <p
        style="
          padding:10px;
          border-radius:8px;
          background:#fff3cd;
        "
      >

        <strong>
          Altera\u00E7\u00E3o da agenda fixa
        </strong>

        <br><br>

        A mudan\u00E7a entra em vigor hoje e vale
        para as pr\u00F3ximas ocorr\u00EAncias deste hor\u00E1rio.

        <br>

        Semanas e dias anteriores permanecer\u00E3o
        registrados como estavam.

      </p>


      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherSlotStatus"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Tipo do hor\u00E1rio
        </label>


        <select
          id="teacherSlotStatus"
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option
            value="free"
            ${
              editableStatus === "free"
                ? "selected"
                : ""
            }
          >
            Livre
          </option>


          <option
            value="lesson"
            ${
              editableStatus === "lesson"
                ? "selected"
                : ""
            }
          >
            Aula
          </option>


          <option
            value="unavailable"
            ${
              editableStatus === "unavailable"
                ? "selected"
                : ""
            }
          >
            Indispon\u00EDvel
          </option>

        </select>

      </div>


      <div
        id="teacherSlotStudentArea"
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherSlotStudent"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Aluno
        </label>


        <select
          id="teacherSlotStudent"
          style="
            width:100%;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option value="">
            Selecione um aluno
          </option>


          ${currentTeacherStudents
            .map(
              student => `

                <option
                  value="${student.student_id}"

                  ${
                    student.student_id ===
                    slot.student_id
                      ? "selected"
                      : ""
                  }
                >

                  ${escapeHtml(
                    student.student_name
                  )}

                  \u2014 ${student.class_duration_minutes} min

                </option>

              `
            )
            .join("")}

        </select>


        <p
          style="
            margin-top:8px;
            font-size:13px;
            color:#666;
          "
        >
          A dura\u00E7\u00E3o da aula \u00E9 definida pelo
          cadastro do aluno.
        </p>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="saveTeacherSlotButton"
        >
          Salvar
        </button>


        ${
          currentStatus === "lesson"
            ? `

              <button
                type="button"
                class="secondary-button"
                id="cancelSingleTeacherLessonButton"
                style="
                  border-color:#c0392b;
                  color:#c0392b;
                "
              >
                Cancelar somente esta aula
              </button>

            `
            : ""
        }


        <button
          type="button"
          class="secondary-button"
          id="closeTeacherSlotEditorButton"
        >
          Cancelar
        </button>

      </div>


      <p
        id="teacherSlotMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const statusSelect =
    document.getElementById(
      "teacherSlotStatus"
    );


  const studentArea =
    document.getElementById(
      "teacherSlotStudentArea"
    );


  const studentSelect =
    document.getElementById(
      "teacherSlotStudent"
    );


  function updateStudentVisibility() {

    if (
      !statusSelect ||
      !studentArea
    ) {
      return;
    }


    const isLesson =
      statusSelect.value ===
      "lesson";


    studentArea.style.display =
      isLesson
        ? "block"
        : "none";


    if (
      studentSelect
    ) {

      studentSelect.disabled =
        !isLesson;

    }

  }


  updateStudentVisibility();


  if (
    statusSelect
  ) {

    statusSelect.addEventListener(
      "change",
      updateStudentVisibility
    );

  }


  const saveButton =
    document.getElementById(
      "saveTeacherSlotButton"
    );


  if (
    saveButton
  ) {

    saveButton.addEventListener(
      "click",
      () => {

        saveTeacherWeeklySlot(
          dayOfWeek,
          slot.start_time
        );

      }
    );

  }


  const closeButton =
    document.getElementById(
      "closeTeacherSlotEditorButton"
    );


  // ===================================================
  // BOT\u00C3O REAGENDAR SOMENTE ESTA AULA
  // ===================================================

  if (
    currentStatus === "lesson" &&
    closeButton &&
    closeButton.parentElement
  ) {

    const moveButton =
      document.createElement(
        "button"
      );


    moveButton.type =
      "button";


    moveButton.className =
      "secondary-button";


    moveButton.textContent =
      "Reagendar somente esta aula";


    moveButton.style.borderColor =
      "#a9573a";


    moveButton.style.color =
      "#a9573a";


    closeButton.parentElement.insertBefore(
      moveButton,
      closeButton
    );


    moveButton.addEventListener(
      "click",
      () => {

        openTeacherLessonMove(
          date,
          slot
        );

      }
    );

  }



  // ===================================================
  // CANCELAR SOMENTE ESTA AULA
  // O botao ja faz parte do HTML do editor.
  // ===================================================

  const cancelSingleLessonButton =
    document.getElementById(
      "cancelSingleTeacherLessonButton"
    );


  if (
    cancelSingleLessonButton
  ) {

    cancelSingleLessonButton.addEventListener(
      "click",
      () => {

        openTeacherLessonCancellation(
          date,
          slot
        );

      }
    );

  }


  // ===================================================
  // AGENDAR REPOSICAO EM HORARIO LIVRE
  // ===================================================

  if (
    currentStatus === "free" &&
    closeButton &&
    closeButton.parentElement
  ) {

    const makeupButton =
      document.createElement(
        "button"
      );


    makeupButton.type =
      "button";


    makeupButton.className =
      "secondary-button";


    makeupButton.textContent =
      "Agendar reposi\u00E7\u00E3o neste hor\u00E1rio";


    makeupButton.style.borderColor =
      "#a9573a";


    makeupButton.style.color =
      "#a9573a";


    closeButton.parentElement.insertBefore(
      makeupButton,
      closeButton
    );


    makeupButton.addEventListener(
      "click",
      () => {

        openTeacherMakeupBooking(
          date,
          slot
        );

      }
    );

  }


  // ===================================================
  // FECHAR
  // ===================================================

  if (
    closeButton
  ) {

    closeButton.addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

  }

}



// =====================================================
// PROFESSOR - AGENDAR REPOSICAO
// =====================================================

async function openTeacherMakeupBooking(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_available_makeups"
    );


  if (error) {

    console.error(
      "Erro ao carregar reposi\u00E7\u00F5es dispon\u00EDveis:",
      error
    );

    area.innerHTML = `

      <div class="card">

        <h3>
          Agendar reposi\u00E7\u00E3o
        </h3>

        <p>
          N\u00E3o foi poss\u00EDvel carregar as reposi\u00E7\u00F5es dispon\u00EDveis.
        </p>

        <button
          type="button"
          class="secondary-button"
          id="closeTeacherMakeupBookingButton"
        >
          Voltar
        </button>

      </div>

    `;


    const back =
      document.getElementById(
        "closeTeacherMakeupBookingButton"
      );


    if (back) {

      back.addEventListener(
        "click",
        () => {

          openTeacherScheduleEditor(
            date,
            slot
          );

        }
      );

    }


    return;
  }


  const makeups =
    data || [];


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #a9573a;
      "
    >

      <h3>
        Agendar reposi\u00E7\u00E3o
      </h3>


      <p>
        <strong>Data:</strong>
        ${formatDate(date)}
      </p>


      <p>
        <strong>Hor\u00E1rio:</strong>
        ${normalizeTime(
          slot.start_time
        )}
      </p>


      ${
        makeups.length === 0

          ? `

            <div
              style="
                padding:15px;
                background:#f7f7f7;
                border-radius:8px;
                margin-top:15px;
              "
            >
              Nenhuma reposi\u00E7\u00E3o dispon\u00EDvel para os alunos.
            </div>

          `

          : `

            <div
              style="
                margin-top:18px;
              "
            >

              <label
                for="teacherMakeupSelect"
                style="
                  display:block;
                  font-weight:bold;
                  margin-bottom:8px;
                "
              >
                Reposi\u00E7\u00E3o
              </label>


              <select
                id="teacherMakeupSelect"
                style="
                  width:100%;
                  padding:10px;
                  border:1px solid #ccc;
                  border-radius:8px;
                "
              >

                <option value="">
                  Selecione
                </option>


                ${makeups
                  .map(
                    makeup => `

                      <option
                        value="${makeup.makeup_id}"
                      >
                        ${escapeHtml(
                          makeup.student_name ||
                          "Aluno"
                        )}
                        \u2014 ${makeup.duration_minutes} min
                        \u2014 ${escapeHtml(
                          formatMakeupSource(
                            makeup.source
                          )
                        )}
                      </option>

                    `
                  )
                  .join("")}

              </select>


              <p
                style="
                  margin-top:8px;
                  font-size:13px;
                  color:#666;
                "
              >
                Para uma reposi\u00E7\u00E3o de 60 minutos,
                os dois blocos de 30 minutos precisam estar livres.
              </p>

            </div>

          `
      }


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        ${
          makeups.length > 0

            ? `

              <button
                type="button"
                class="action-button"
                id="confirmTeacherMakeupBookingButton"
              >
                Agendar reposi\u00E7\u00E3o
              </button>

            `

            : ""
        }


        <button
          type="button"
          class="secondary-button"
          id="backTeacherMakeupBookingButton"
        >
          Voltar
        </button>

      </div>


      <p
        id="teacherMakeupBookingMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const confirmButton =
    document.getElementById(
      "confirmTeacherMakeupBookingButton"
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      () => {

        confirmTeacherMakeupBooking(
          date,
          slot
        );

      }
    );

  }


  const backButton =
    document.getElementById(
      "backTeacherMakeupBookingButton"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      () => {

        openTeacherScheduleEditor(
          date,
          slot
        );

      }
    );

  }

}


// =====================================================
// PROFESSOR - CONFIRMAR REPOSICAO
// =====================================================

async function confirmTeacherMakeupBooking(
  date,
  slot
) {

  const select =
    document.getElementById(
      "teacherMakeupSelect"
    );


  const button =
    document.getElementById(
      "confirmTeacherMakeupBookingButton"
    );


  const message =
    document.getElementById(
      "teacherMakeupBookingMessage"
    );


  if (!select) {
    return;
  }


  const makeupId =
    select.value;


  if (!makeupId) {

    if (message) {

      message.textContent =
        "Selecione uma reposi\u00E7\u00E3o.";

      message.style.color =
        "red";

    }


    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Agendando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "teacher_reserve_makeup_with_rules",
      {

        p_makeup_id:
          makeupId,

        p_reservation_date:
          formatDateForDatabase(
            date
          ),

        p_start_time:
          normalizeTime(
            slot.start_time
          )

      }
    );


  if (error) {

    console.error(
      "Erro ao agendar reposi\u00E7\u00E3o pelo professor:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel agendar a reposi\u00E7\u00E3o.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Agendar reposi\u00E7\u00E3o";

    }


    return;
  }


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  await loadTeacherWeeklySchedule();


  alert(
    "Reposi\u00E7\u00E3o agendada com sucesso."
  );

}


// =====================================================
// PROFESSOR - GERENCIAR REPOSICAO AGENDADA
// =====================================================

function openTeacherMakeupReservationManager(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {
    return;
  }


  if (!slot.reservation_id) {

    alert(
      "N\u00E3o foi poss\u00EDvel identificar a reserva desta reposi\u00E7\u00E3o."
    );

    return;
  }


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #a9573a;
      "
    >

      <h3>
        Reposi\u00E7\u00E3o agendada
      </h3>


      <p>
        <strong>Aluno:</strong>
        ${escapeHtml(
          slot.student_name ||
          "Aluno"
        )}
      </p>


      <p>
        <strong>Data:</strong>
        ${formatDate(date)}
      </p>


      <p>
        <strong>Hor\u00E1rio:</strong>
        ${normalizeTime(
          slot.start_time
        )}
        \u00E0s
        ${normalizeTime(
          slot.end_time
        )}
      </p>


      <p
        style="
          padding:12px;
          background:#f7e9e1;
          border-radius:8px;
        "
      >
        Se o professor cancelar, a reposi\u00E7\u00E3o
        volta para o aluno e o cancelamento do aluno
        n\u00E3o \u00E9 consumido.
      </p>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="secondary-button"
          id="cancelTeacherMakeupReservationButton"
          style="
            border-color:#c0392b;
            color:#c0392b;
          "
        >
          Cancelar reposi\u00E7\u00E3o
        </button>


        <button
          type="button"
          class="secondary-button"
          id="closeTeacherMakeupManagerButton"
        >
          Fechar
        </button>

      </div>


      <p
        id="teacherMakeupManagerMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  document
    .getElementById(
      "cancelTeacherMakeupReservationButton"
    )
    .addEventListener(
      "click",
      () => {

        cancelTeacherMakeupReservation(
          slot.reservation_id
        );

      }
    );


  document
    .getElementById(
      "closeTeacherMakeupManagerButton"
    )
    .addEventListener(
      "click",
      () => {

        area.innerHTML =
          "";

      }
    );

}


// =====================================================
// PROFESSOR - CANCELAR REPOSICAO
// =====================================================

async function cancelTeacherMakeupReservation(
  reservationId
) {

  const confirmed =
    window.confirm(
      "Cancelar esta reposi\u00E7\u00E3o?\n\n" +
      "Ela voltar\u00E1 para o aluno como dispon\u00EDvel."
    );


  if (!confirmed) {
    return;
  }


  const button =
    document.getElementById(
      "cancelTeacherMakeupReservationButton"
    );


  const message =
    document.getElementById(
      "teacherMakeupManagerMessage"
    );


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Cancelando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "cancel_makeup_by_teacher",
      {
        p_reservation_id:
          reservationId
      }
    );


  if (error) {

    console.error(
      "Erro ao cancelar reposi\u00E7\u00E3o pelo professor:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel cancelar a reposi\u00E7\u00E3o.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Cancelar reposi\u00E7\u00E3o";

    }


    return;
  }


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  await loadTeacherWeeklySchedule();


  alert(
    "Reposi\u00E7\u00E3o cancelada. Ela voltou para o aluno."
  );

}


   // =====================================================
// REAGENDAR UMA \u00DANICA AULA
// =====================================================


// =====================================================
// PROFESSOR - CANCELAR UMA UNICA AULA
// =====================================================

function openTeacherLessonCancellation(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {
    return;
  }


  const studentName =
    String(
      slot.student_name ||
      "Aluno"
    );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #c0392b;
      "
    >

      <h3>
        Cancelar somente esta aula
      </h3>


      <p>
        <strong>Aluno:</strong>

        ${escapeHtml(
          studentName
        )}
      </p>


      <p>
        <strong>Data:</strong>

        ${formatDate(date)}
      </p>


      <p>
        <strong>Hor\u00E1rio:</strong>

        ${normalizeTime(
          slot.start_time
        )}

        \u00E0s

        ${normalizeTime(
          slot.end_time
        )}
      </p>


      <div
        style="
          margin-top:15px;
          padding:15px;
          border-radius:8px;
          background:#fff3cd;
        "
      >

        <strong>
          Esta a\u00E7\u00E3o cancela apenas esta ocorr\u00EAncia.
        </strong>

        <br><br>

        A agenda fixa das semanas seguintes n\u00E3o ser\u00E1 alterada.

        <br><br>

        Uma reposi\u00E7\u00E3o ser\u00E1 liberada automaticamente
        para o aluno.

      </div>


      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherCancelLessonReason"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Justificativa para o aluno

          <span
            style="
              font-weight:normal;
              color:#666;
            "
          >
            (opcional)
          </span>

        </label>


        <textarea
          id="teacherCancelLessonReason"
          maxlength="1000"
          rows="4"
          placeholder="Ex.: Tive um compromisso e n\u00E3o conseguirei realizar esta aula."
          style="
            width:100%;
            box-sizing:border-box;
            padding:12px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
            font-size:15px;
          "
        ></textarea>


        <div
          id="teacherCancelLessonReasonCounter"
          style="
            margin-top:5px;
            text-align:right;
            font-size:12px;
            color:#666;
          "
        >
          0 / 1000
        </div>

      </div>


      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherCancelLessonOldSlotStatus"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Como fica este hor\u00E1rio nesta data?
        </label>


        <select
          id="teacherCancelLessonOldSlotStatus"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option
            value="unavailable"
            selected
          >
            Indispon\u00EDvel somente nesta data
          </option>


          <option
            value="free"
          >
            Livre somente nesta data
          </option>

        </select>


        <p
          style="
            margin-top:8px;
            font-size:13px;
            color:#666;
          "
        >
          Nas semanas seguintes, a aula fixa permanece normalmente.
        </p>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="confirmTeacherLessonCancellationButton"
          style="
            background:#c0392b;
          "
        >
          Confirmar cancelamento
        </button>


        <button
          type="button"
          class="secondary-button"
          id="backTeacherLessonCancellationButton"
        >
          Voltar
        </button>

      </div>


      <p
        id="teacherLessonCancellationMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const reasonInput =
    document.getElementById(
      "teacherCancelLessonReason"
    );


  const reasonCounter =
    document.getElementById(
      "teacherCancelLessonReasonCounter"
    );


  if (
    reasonInput &&
    reasonCounter
  ) {

    reasonInput.addEventListener(
      "input",
      () => {

        reasonCounter.textContent =
          reasonInput.value.length +
          " / 1000";

      }
    );

  }


  const confirmButton =
    document.getElementById(
      "confirmTeacherLessonCancellationButton"
    );


  if (confirmButton) {

    confirmButton.addEventListener(
      "click",
      () => {

        confirmTeacherLessonCancellation(
          date,
          slot
        );

      }
    );

  }


  const backButton =
    document.getElementById(
      "backTeacherLessonCancellationButton"
    );


  if (backButton) {

    backButton.addEventListener(
      "click",
      () => {

        openTeacherScheduleEditor(
          date,
          slot
        );

      }
    );

  }

}


// =====================================================
// PROFESSOR - CONFIRMAR CANCELAMENTO DE UMA AULA
// =====================================================

async function confirmTeacherLessonCancellation(
  date,
  slot
) {

  const reasonInput =
    document.getElementById(
      "teacherCancelLessonReason"
    );


  const oldSlotSelect =
    document.getElementById(
      "teacherCancelLessonOldSlotStatus"
    );


  const button =
    document.getElementById(
      "confirmTeacherLessonCancellationButton"
    );


  const message =
    document.getElementById(
      "teacherLessonCancellationMessage"
    );


  if (!oldSlotSelect) {
    return;
  }


  const reason =
    reasonInput
      ? reasonInput.value.trim()
      : "";


  const oldSlotStatus =
    oldSlotSelect.value === "free"
      ? "free"
      : "unavailable";


  const confirmed =
    window.confirm(

      "Confirmar cancelamento desta aula?\n\n" +

      formatDate(date) +

      " \u00E0s " +

      normalizeTime(
        slot.start_time
      ) +

      "\n\nUma reposi\u00E7\u00E3o ser\u00E1 liberada para o aluno." +

      (
        oldSlotStatus === "free"
          ? "\nO hor\u00E1rio ficar\u00E1 livre somente nesta data."
          : "\nO hor\u00E1rio ficar\u00E1 indispon\u00EDvel somente nesta data."
      ) +

      (
        reason
          ? "\n\nJustificativa: " + reason
          : ""
      )

    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Cancelando...";

  }


  if (message) {

    message.textContent =
      "";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "teacher_cancel_lesson_occurrence",
      {

        p_lesson_date:
          formatDateForDatabase(
            date
          ),

        p_slot_start:
          normalizeTime(
            slot.start_time
          ),

        p_old_slot_status:
          oldSlotStatus,

        p_reason:
          reason || null

      }
    );


  if (error) {

    console.error(
      "Erro ao cancelar aula pelo professor:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel cancelar esta aula.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Confirmar cancelamento";

    }


    return;
  }


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  await loadTeacherWeeklySchedule();


  alert(
    "Aula cancelada com sucesso.\n\n" +
    "Uma reposi\u00E7\u00E3o foi liberada para o aluno e " +
    "a agenda fixa das semanas seguintes foi preservada."
  );

}


function openTeacherLessonMove(
  date,
  slot
) {

  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (!area) {
    return;
  }


  const today =
    new Date();


  const todayDatabase =
    formatDateForDatabase(
      today
    );


  const currentDateDatabase =
    formatDateForDatabase(
      date
    );


  const studentName =
    String(
      slot.student_name ||
      "Aluno"
    );


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #a9573a;
      "
    >

      <h3>
        Reagendar somente esta aula
      </h3>


      <p>
        <strong>Aluno:</strong>

        ${escapeHtml(
          studentName
        )}
      </p>


      <div
        style="
          padding:15px;
          background:#fff3cd;
          border-radius:8px;
          margin-top:15px;
        "
      >

        <strong>
          Aula atual
        </strong>

        <br><br>

        ${formatDate(date)}

        \u00E0s

        ${normalizeTime(
          slot.start_time
        )}

      </div>


      <p
        style="
          margin-top:15px;
          color:#555;
        "
      >
        Esta altera\u00E7\u00E3o vale somente para
        esta ocorr\u00EAncia.

        A agenda fixa das outras semanas continuar\u00E1 igual.
      </p>


      <!-- ==========================================
           NOVA DATA
           ========================================== -->

      <div
        style="
          margin-top:20px;
        "
      >

        <label
          for="teacherMoveDate"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Nova data
        </label>


        <input
          type="date"
          id="teacherMoveDate"
          min="${todayDatabase}"
          value="${currentDateDatabase}"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

      </div>


      <!-- ==========================================
           NOVO HORARIO
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherMoveTime"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Novo hor\u00E1rio
        </label>


        <input
          type="time"
          id="teacherMoveTime"
          step="1800"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >


        <p
          style="
            margin-top:8px;
            font-size:13px;
            color:#666;
          "
        >
          Use hor\u00E1rios terminados em :00 ou :30.
          O sistema verificar\u00E1 automaticamente se
          todos os blocos necess\u00E1rios est\u00E3o livres.
        </p>

      </div>


      <!-- ==========================================
           JUSTIFICATIVA
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherMoveReason"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          Justificativa do reagendamento
          <span
            style="
              font-weight:normal;
              color:#666;
            "
          >
            (opcional)
          </span>
        </label>


        <textarea
          id="teacherMoveReason"
          maxlength="1000"
          rows="4"
          placeholder="Ex.: Tenho um compromisso nesse hor\u00E1rio e precisei transferir esta aula."
          style="
            width:100%;
            box-sizing:border-box;
            padding:12px;
            border:1px solid #ccc;
            border-radius:8px;
            resize:vertical;
            font-family:inherit;
            font-size:15px;
          "
        ></textarea>


        <div
          id="teacherMoveReasonCounter"
          style="
            margin-top:5px;
            text-align:right;
            font-size:12px;
            color:#666;
          "
        >
          0 / 1000
        </div>

      </div>


      <!-- ==========================================
           HORARIO ANTIGO
           ========================================== -->

      <div
        style="
          margin-top:18px;
        "
      >

        <label
          for="teacherMoveOldSlotStatus"
          style="
            display:block;
            font-weight:bold;
            margin-bottom:8px;
          "
        >
          O que fazer com o hor\u00E1rio antigo nesta data?
        </label>

        <select
          id="teacherMoveOldSlotStatus"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >

          <option value="unavailable" selected>
            Indispon\u00EDvel somente nesta data
          </option>

          <option value="free">
            Livre somente nesta data
          </option>

        </select>

        <p
          style="
            margin-top:8px;
            font-size:13px;
            color:#666;
          "
        >
          Esta escolha vale somente para
          ${formatDate(date)}.

          Nas semanas seguintes, o hor\u00E1rio fixo
          volta ao normal automaticamente.
        </p>

      </div>


      <div
        style="
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:20px;
        "
      >

        <button
          type="button"
          class="action-button"
          id="confirmTeacherLessonMoveButton"
        >
          Confirmar reagendamento
        </button>


        <button
          type="button"
          class="secondary-button"
          id="backTeacherLessonMoveButton"
        >
          Voltar
        </button>

      </div>


      <p
        id="teacherLessonMoveMessage"
        style="
          margin-top:12px;
        "
      ></p>

    </div>

  `;


  const reasonInput =
    document.getElementById(
      "teacherMoveReason"
    );


  const reasonCounter =
    document.getElementById(
      "teacherMoveReasonCounter"
    );


  if (
    reasonInput &&
    reasonCounter
  ) {

    reasonInput.addEventListener(
      "input",
      () => {

        reasonCounter.textContent =
          reasonInput.value.length +
          " / 1000";

      }
    );

  }


  document
    .getElementById(
      "confirmTeacherLessonMoveButton"
    )
    .addEventListener(
      "click",
      () => {

        confirmTeacherLessonMove(
          date,
          slot
        );

      }
    );


  document
    .getElementById(
      "backTeacherLessonMoveButton"
    )
    .addEventListener(
      "click",
      () => {

        openTeacherScheduleEditor(
          date,
          slot
        );

      }
    );

}



// =====================================================
// CONFIRMAR REAGENDAMENTO
// =====================================================

async function confirmTeacherLessonMove(
  originalDate,
  slot
) {

  const dateInput =
    document.getElementById(
      "teacherMoveDate"
    );


  const timeInput =
    document.getElementById(
      "teacherMoveTime"
    );


  const reasonInput =
    document.getElementById(
      "teacherMoveReason"
    );


  const oldSlotStatusSelect =
    document.getElementById(
      "teacherMoveOldSlotStatus"
    );


  const button =
    document.getElementById(
      "confirmTeacherLessonMoveButton"
    );


  const message =
    document.getElementById(
      "teacherLessonMoveMessage"
    );


  if (
    !dateInput ||
    !timeInput ||
    !oldSlotStatusSelect
  ) {
    return;
  }


  const newDate =
    dateInput.value;


  const newTime =
    timeInput.value;


  const reason =
    reasonInput
      ? reasonInput.value.trim()
      : "";


  const oldSlotStatus =
    oldSlotStatusSelect.value === "free"
      ? "free"
      : "unavailable";


  const oldSlotStatusLabel =
    oldSlotStatus === "free"
      ? "Livre somente nesta data"
      : "Indispon\u00EDvel somente nesta data";


  if (!newDate) {

    message.textContent =
      "Escolha a nova data.";

    message.style.color =
      "red";

    return;
  }


  if (!newTime) {

    message.textContent =
      "Escolha o novo hor\u00E1rio.";

    message.style.color =
      "red";

    return;
  }


  const minute =
    Number(
      newTime.split(":")[1]
    );


  if (
    minute !== 0 &&
    minute !== 30
  ) {

    message.textContent =
      "O hor\u00E1rio precisa terminar em :00 ou :30.";

    message.style.color =
      "red";

    return;
  }


  const confirmed =
    window.confirm(

      "Confirmar reagendamento?\n\n" +

      formatDate(
        originalDate
      ) +

      " \u00E0s " +

      normalizeTime(
        slot.start_time
      ) +

      "\n\n\u2192\n\n" +

      formatDate(
        new Date(
          newDate +
          "T12:00:00"
        )
      ) +

      " \u00E0s " +

      newTime +

      "\n\nHor\u00E1rio antigo: " +
      oldSlotStatusLabel +

      (
        reason
          ? "\n\nJustificativa: " + reason
          : ""
      )

    );


  if (!confirmed) {
    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Reagendando...";

  }


  if (message) {

    message.textContent =
      "";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "move_lesson_occurrence_with_option",
      {

        p_from_date:
          formatDateForDatabase(
            originalDate
          ),

        p_from_start:
          normalizeTime(
            slot.start_time
          ),

        p_to_date:
          newDate,

        p_to_start:
          newTime,

        p_old_slot_status:
          oldSlotStatus,

        p_reason:
          reason || null

      }
    );


  if (error) {

    console.error(
      "Erro ao reagendar aula:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel reagendar a aula.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Confirmar reagendamento";

    }


    return;
  }


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (area) {

    area.innerHTML =
      "";

  }


  await loadTeacherWeeklySchedule();


  alert(
    "Aula reagendada com sucesso.\n\n" +
    "A altera\u00E7\u00E3o vale somente para as datas envolvidas. " +
    "A agenda fixa das semanas seguintes foi preservada."
  );

}



// =====================================================
// SALVAR HOR\u00C1RIO DO PROFESSOR
// =====================================================

async function saveTeacherWeeklySlot(
  dayOfWeek,
  startTime
) {

  const statusSelect =
    document.getElementById(
      "teacherSlotStatus"
    );


  const studentSelect =
    document.getElementById(
      "teacherSlotStudent"
    );


  const button =
    document.getElementById(
      "saveTeacherSlotButton"
    );


  const message =
    document.getElementById(
      "teacherSlotMessage"
    );


  if (!statusSelect) {
    return;
  }


  const status =
    statusSelect.value;


  const studentId =
    status === "lesson"

      ? (
          studentSelect
            ? studentSelect.value || null
            : null
        )

      : null;


  if (
    status === "lesson" &&
    !studentId
  ) {

    if (
      message
    ) {

      message.textContent =
        "Selecione um aluno para a aula.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    button
  ) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  if (
    message
  ) {

    message.textContent =
      "";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "manage_weekly_slot",
      {

        p_day_of_week:
          Number(
            dayOfWeek
          ),

        p_start_time:
          normalizeTime(
            startTime
          ),

        p_status:
          status,

        p_student_id:
          studentId

      }
    );


  if (
    error
  ) {

    console.error(
      "Erro ao salvar hor\u00E1rio:",
      error
    );


    if (
      message
    ) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel salvar o hor\u00E1rio.";

      message.style.color =
        "red";

    }


    if (
      button
    ) {

      button.disabled =
        false;

      button.textContent =
        "Salvar";

    }


    return;
  }


  await loadTeacherWeeklySchedule();


  const area =
    document.getElementById(
      "teacherScheduleEditArea"
    );


  if (
    area
  ) {

    area.innerHTML =
      "";

  }


  alert(
    "Hor\u00E1rio atualizado com sucesso."
  );

}

// =====================================================
// CANCELAMENTOS / ADIAMENTOS DOS ALUNOS
// =====================================================

async function loadTeacherCancellationMessages() {

  const container =
    document.getElementById(
      "teacherCancellationNotices"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `
    <div class="card">
      Carregando cancelamentos...
    </div>
  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_student_cancellations"
    );


  if (error) {

    console.error(
      "Erro ao carregar cancelamentos:",
      error
    );


    container.innerHTML = `

      <div class="card">

        <strong>
          N\u00E3o foi poss\u00EDvel carregar
          os cancelamentos dos alunos.
        </strong>

      </div>

    `;


    return;
  }


  const cancellations =
    data || [];


  // ===================================================
  // NENHUM CANCELAMENTO NOVO
  // ===================================================

  if (
    cancellations.length === 0
  ) {

    container.innerHTML = `

      <div class="card">

        <h3>
          Cancelamentos / adiamentos
        </h3>

        <p>
          Nenhum cancelamento novo.
        </p>

      </div>

    `;


    return;
  }


  // ===================================================
  // MOSTRAR CANCELAMENTOS
  // ===================================================

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
          justify-content:space-between;
          align-items:center;
          gap:15px;
          flex-wrap:wrap;
          margin-bottom:18px;
        "
      >

        <div
          style="
            display:flex;
            align-items:center;
            gap:10px;
          "
        >

          <span
            style="
              font-size:24px;
            "
          >
            \uD83D\uDCE9
          </span>


          <h3
            style="
              margin:0;
            "
          >
            Cancelamentos / adiamentos
          </h3>

        </div>


        <strong>
          ${cancellations.length}
          ${
            cancellations.length === 1
              ? "novo"
              : "novos"
          }
        </strong>

      </div>


      <div
        style="
          display:grid;
          gap:15px;
        "
      >

        ${cancellations
          .map(
            cancellation =>
              renderTeacherCancellationCard(
                cancellation
              )
          )
          .join("")}

      </div>

    </div>

  `;


  // ===================================================
  // BOT\u00D5ES MARCAR COMO LIDO
  // ===================================================

  document
    .querySelectorAll(
      ".mark-cancellation-read-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          markTeacherCancellationAsRead(
            button.dataset.lessonId
          );

        }
      );

    });

}


// =====================================================
// CARD DE CANCELAMENTO PARA O PROFESSOR
// =====================================================

function renderTeacherCancellationCard(
  cancellation
) {

  const lessonDate =
    cancellation.lesson_date

      ? formatDate(
          new Date(
            cancellation.lesson_date +
            "T12:00:00"
          )
        )

      : "Data n\u00E3o informada";


  const start =
    cancellation.start_time
      ? normalizeTime(
          cancellation.start_time
        )
      : "";


  const end =
    cancellation.end_time
      ? normalizeTime(
          cancellation.end_time
        )
      : "";


  const studentMessage =
    String(
      cancellation.cancellation_message ||
      ""
    ).trim();


  const generatedMakeup =
    cancellation.generated_makeup ===
    true;


  return `

    <div
      id="teacher-cancellation-${cancellation.lesson_id}"
      style="
        padding:18px;
        border:1px solid #ddd;
        border-radius:10px;
        background:#fffdf5;
      "
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
          flex-wrap:wrap;
        "
      >

        <strong
          style="
            font-size:18px;
          "
        >
          ${escapeHtml(
            cancellation.student_name ||
            "Aluno"
          )}
        </strong>


        <span>
          ${lessonDate}
        </span>

      </div>


      <p
        style="
          margin-top:12px;
        "
      >

        <strong>
          Aula:
        </strong>

        ${lessonDate}

        ${
          start
            ? `, ${start}`
            : ""
        }

        ${
          end
            ? ` \u00E0s ${end}`
            : ""
        }

      </p>


      <p>

        <strong>
          Gerou reposi\u00E7\u00E3o:
        </strong>

        ${
          generatedMakeup
            ? "\u2705 Sim"
            : "\u274C N\u00E3o"
        }

      </p>


      <div
        style="
          margin-top:15px;
          padding:15px;
          border-radius:8px;
          background:#f7e9e1;
        "
      >

        <strong>
          Mensagem do aluno
        </strong>


        ${
          studentMessage

            ? `

              <p
                style="
                  margin-bottom:0;
                  white-space:pre-wrap;
                "
              >
                ${escapeHtml(
                  studentMessage
                )}
              </p>

            `

            : `

              <p
                style="
                  margin-bottom:0;
                  color:#666;
                "
              >
                O aluno n\u00E3o deixou uma mensagem.
              </p>

            `
        }

      </div>


      ${
        cancellation.cancellation_notes

          ? `

            <p
              style="
                margin-top:15px;
                font-size:13px;
                color:#666;
              "
            >

              ${escapeHtml(
                cancellation.cancellation_notes
              )}

            </p>

          `

          : ""
      }


      <button
        type="button"
        class="secondary-button mark-cancellation-read-button"
        data-lesson-id="${cancellation.lesson_id}"
        style="
          margin-top:15px;
        "
      >
        \u2713 Marcar como lido
      </button>


      <p
        id="teacher-cancellation-message-${cancellation.lesson_id}"
        style="
          margin-top:8px;
        "
      ></p>

    </div>

  `;

}

// =====================================================
// MARCAR CANCELAMENTO COMO LIDO
// =====================================================

async function markTeacherCancellationAsRead(
  lessonId
) {

  if (!lessonId) {
    return;
  }


  const button =
    document.querySelector(
      `.mark-cancellation-read-button[data-lesson-id="${lessonId}"]`
    );


  const message =
    document.getElementById(
      `teacher-cancellation-message-${lessonId}`
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
      "mark_student_cancellation_read",
      {
        p_lesson_id:
          lessonId
      }
    );


  if (error) {

    console.error(
      "Erro ao marcar cancelamento como lido:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\u00E3o foi poss\u00EDvel marcar como lido.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "\u2713 Marcar como lido";

    }


    return;
  }


  // Atualiza toda a caixa.
  // O cancelamento marcado desaparece porque
  // o RPC agora retorna somente os n\u00E3o lidos.

  await loadTeacherCancellationMessages();

}

// =====================================================
// CARREGAR REGRAS DO PROFESSOR
// =====================================================

// =====================================================
// PAGINA DE PERFIL DO PROFESSOR
// =====================================================

async function loadTeacherProfilePage() {

  const area =
    document.getElementById(
      "teacherProfileFormArea"
    );


  if (!area) {
    return;
  }


  const settings =
    await loadCurrentTeacherProfileSettings();


  const {
    data: rescheduleRulesData,
    error: rescheduleRulesError
  } =
    await supabaseClient.rpc(
      "get_my_teacher_reschedule_rules"
    );


  const rescheduleRules =
    rescheduleRulesError

      ? {
          makeup_reschedule_notice_hours: 2,
          monthly_makeup_limit: 8,
          makeup_reschedule_max_count: 1,
          lesson_reschedule_notice_hours: 2
        }

      : (
          (
            Array.isArray(
              rescheduleRulesData
            )
              ? rescheduleRulesData[0]
              : rescheduleRulesData
          )
          || {
            makeup_reschedule_notice_hours: 2,
            monthly_makeup_limit: 8,
            makeup_reschedule_max_count: 1,
            lesson_reschedule_notice_hours: 2
          }
        );


  if (rescheduleRulesError) {

    console.warn(
      "Nao foi possivel carregar as regras de remarcacao:",
      rescheduleRulesError
    );

  }


  const {
    data: systemFinancialData,
    error: systemFinancialError
  } =
    await supabaseClient.rpc(
      "get_my_system_financial"
    );


  const systemFinancial =
    systemFinancialError

      ? null

      : (
          (
            Array.isArray(
              systemFinancialData
            )
              ? systemFinancialData[0]
              : systemFinancialData
          )
          || null
        );


  if (systemFinancialError) {

    console.warn(
      "Nao foi possivel carregar a mensalidade do sistema:",
      systemFinancialError
    );

  }


  if (!settings) {

    area.innerHTML =
      "Nao foi possivel carregar o perfil.";

    return;
  }


  area.innerHTML = `

    <div
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:14px;
      "
    >

      <div>

        <label
          for="teacherProfileName"
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
          id="teacherProfileName"
          value="${escapeHtml(
            settings.teacher_name || ""
          )}"
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
          for="teacherProfileEmail"
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
          id="teacherProfileEmail"
          value="${escapeHtml(
            settings.teacher_email || ""
          )}"
          disabled
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
            background:#f2f2f2;
          "
        >

      </div>


      <div>

        <label
          for="teacherProfilePix"
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
          id="teacherProfilePix"
          value="${escapeHtml(
            settings.pix || ""
          )}"
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
        <label for="teacherProfilePhone" style="display:block;font-weight:bold;margin-bottom:7px;">
          Telefone
        </label>
        <input type="tel" id="teacherProfilePhone" value="${escapeHtml(currentProfile.phone || "")}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>


      <div>
        <label for="teacherProfileCpf" style="display:block;font-weight:bold;margin-bottom:7px;">
          CPF
        </label>
        <input type="text" id="teacherProfileCpf" value="${escapeHtml(currentProfile.cpf || "")}" style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #ccc;border-radius:8px;">
      </div>


      <div>

        <label
          for="teacherProfileCnpj"
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
          id="teacherProfileCnpj"
          value="${escapeHtml(
            settings.cnpj || ""
          )}"
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
          for="teacherProfileWorkStart"
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
          id="teacherProfileWorkStart"
          step="1800"
          value="${normalizeTime(
            settings.work_start_time ||
            "08:00"
          )}"
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
          for="teacherProfileWorkEnd"
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
          id="teacherProfileWorkEnd"
          step="1800"
          value="${normalizeTime(
            settings.work_end_time ||
            "20:00"
          )}"
          style="
            width:100%;
            box-sizing:border-box;
            padding:10px;
            border:1px solid #ccc;
            border-radius:8px;
          "
        >


        <div
          style="
            margin-top:5px;
            color:#666;
            font-size:12px;
          "
        >
          Selecione 00:00 para permitir aulas que terminem
          exatamente a meia-noite.
        </div>

      </div>

    </div>


    <div
      style="
        margin-top:18px;
        padding:15px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#fffaf3;
      "
    >

      <h4
        style="
          margin:0;
        "
      >
        Dias em que dou aula
      </h4>


      <p
        style="
          margin:5px 0 12px;
          color:#666;
          font-size:13px;
        "
      >
        Selecione pelo menos um dia. Alunos e reposicoes
        so poderao ser agendados nesses dias.
      </p>


      <div
        id="teacherProfileWorkDays"
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
        "
      >

        ${[
          [1, "Segunda"],
          [2, "Terca"],
          [3, "Quarta"],
          [4, "Quinta"],
          [5, "Sexta"],
          [6, "Sabado"],
          [7, "Domingo"]
        ]
          .map(
            item => `

              <label
                style="
                  display:flex;
                  align-items:center;
                  gap:6px;
                  padding:9px 11px;
                  border:1px solid #cfd9e8;
                  border-radius:8px;
                  background:#ffffff;
                  cursor:pointer;
                "
              >

                <input
                  type="checkbox"
                  data-teacher-work-day
                  value="${item[0]}"
                  ${
                    getTeacherWorkDays(
                      settings
                    ).includes(
                      item[0]
                    )
                      ? "checked"
                      : ""
                  }
                >

                <span>
                  ${item[1]}
                </span>

              </label>

            `
          )
          .join("")}

      </div>


      <div
        style="
          margin-top:10px;
          color:#555;
          font-size:13px;
        "
      >
        Atualmente:
        <strong>
          ${escapeHtml(
            formatTeacherWorkDays(
              getTeacherWorkDays(
                settings
              )
            )
          )}
        </strong>
      </div>

    </div>


    <div
      style="
        margin-top:18px;
        padding:15px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#f7e9e1;
      "
    >

      <h4
        style="
          margin:0;
        "
      >
        Regras de remarca\u00E7\u00E3o
      </h4>


      <p
        style="
          margin:5px 0 14px;
          color:#666;
          font-size:13px;
        "
      >
        Estas regras valem para todos os seus alunos.
      </p>


      <div
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
          gap:14px;
        "
      >

        <div>

          <label
            for="teacherMakeupRescheduleNotice"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Aluno remarcar reposi\u00E7\u00E3o
          </label>


          <select
            id="teacherMakeupRescheduleNotice"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            ${[2, 6, 24]
              .map(
                value => `

                  <option
                    value="${value}"
                    ${
                      Number(
                        rescheduleRules
                          .makeup_reschedule_notice_hours
                      ) === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${value}h de anteced\u00EAncia
                  </option>

                `
              )
              .join("")}

          </select>

        </div>


        <div>

          <label
            for="teacherMonthlyMakeupLimit"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Quantidade de reposi\u00E7\u00F5es por m\u00EAs
          </label>


          <select
            id="teacherMonthlyMakeupLimit"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            ${[2, 4, 6, 8]
              .map(
                value => `

                  <option
                    value="${value}"
                    ${
                      Number(
                        rescheduleRules
                          .monthly_makeup_limit
                      ) === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${value} por m\u00EAs
                  </option>

                `
              )
              .join("")}

          </select>


          <div
            style="
              margin-top:5px;
              color:#666;
              font-size:12px;
            "
          >
            Conta reposi\u00E7\u00F5es agendadas ou realizadas
            no m\u00EAs. Reposi\u00E7\u00F5es canceladas n\u00E3o contam.
          </div>

        </div>


        <div>

          <label
            for="teacherMakeupRescheduleMaxCount"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Quantas vezes pode remarcar a reposi\u00E7\u00E3o
          </label>


          <select
            id="teacherMakeupRescheduleMaxCount"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            ${[1, 2, 3]
              .map(
                value => `

                  <option
                    value="${value}"
                    ${
                      Number(
                        rescheduleRules
                          .makeup_reschedule_max_count
                      ) === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${value}
                    ${
                      value === 1
                        ? "vez"
                        : "vezes"
                    }
                  </option>

                `
              )
              .join("")}

          </select>

        </div>


        <div>

          <label
            for="teacherLessonRescheduleNotice"
            style="
              display:block;
              font-weight:bold;
              margin-bottom:7px;
            "
          >
            Aluno remarcar a aula
          </label>


          <select
            id="teacherLessonRescheduleNotice"
            style="
              width:100%;
              padding:10px;
              border:1px solid #ccc;
              border-radius:8px;
            "
          >

            ${[2, 6, 24]
              .map(
                value => `

                  <option
                    value="${value}"
                    ${
                      Number(
                        rescheduleRules
                          .lesson_reschedule_notice_hours
                      ) === value
                        ? "selected"
                        : ""
                    }
                  >
                    ${value}h de anteced\u00EAncia
                  </option>

                `
              )
              .join("")}

          </select>

        </div>

      </div>

    </div>


    <div
      style="
        margin-top:18px;
        padding:15px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#fffaf3;
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

          <h4
            style="
              margin:0;
            "
          >
            Mensalidade do sistema
          </h4>


          <div
            style="
              margin-top:4px;
              color:#666;
              font-size:13px;
            "
          >
            Informacoes definidas pelo administrador.
          </div>

        </div>


        ${
          systemFinancial &&
          systemFinancial.display_status !==
            "not_configured"

            ? `

              <strong
                style="
                  padding:6px 10px;
                  border-radius:999px;
                  background:${
                    systemFinancial.display_status ===
                      "paid"

                      ? "#eef8f0"

                      : (
                          systemFinancial.display_status ===
                            "overdue"

                            ? "#fdecea"

                            : "#fff3cd"
                        )
                  };
                "
              >
                ${
                  systemFinancial.display_status ===
                    "paid"

                    ? "Pago"

                    : (
                        systemFinancial.display_status ===
                          "overdue"

                          ? "Atrasado"

                          : "Pendente"
                      )
                }
              </strong>

            `

            : ""
        }

      </div>


      ${
        !systemFinancial ||
        systemFinancial.display_status ===
          "not_configured"

          ? `

            <div
              style="
                margin-top:12px;
                padding:11px;
                border-radius:8px;
                background:#ffffff;
              "
            >
              O administrador ainda nao configurou a sua
              mensalidade de uso do sistema.
            </div>

          `

          : `

            <div
              style="
                display:grid;
                grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
                gap:10px;
                margin-top:13px;
              "
            >

              <div>

                <div
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  Valor
                </div>

                <strong
                  style="
                    font-size:18px;
                  "
                >
                  ${formatCurrency(
                    systemFinancial.amount != null
                      ? systemFinancial.amount
                      : systemFinancial.system_monthly_fee
                  )}
                </strong>

              </div>


              <div>

                <div
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  Dia do vencimento
                </div>

                <strong>
                  ${Number(
                    systemFinancial.system_payment_due_day || 10
                  )}
                </strong>

              </div>


              <div>

                <div
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  Vencimento deste mes
                </div>

                <strong>
                  ${
                    systemFinancial.due_date

                      ? formatDate(
                          new Date(
                            String(
                              systemFinancial.due_date
                            )
                            +
                            "T12:00:00"
                          )
                        )

                      : "-"
                  }
                </strong>

              </div>


              <div>

                <div
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  Situacao
                </div>

                <strong>
                  ${
                    systemFinancial.display_status ===
                      "paid"

                      ? "Pago"

                      : (
                          systemFinancial.display_status ===
                            "overdue"

                            ? "Atrasado"

                            : "Pendente"
                        )
                  }
                </strong>

              </div>


              <div>

                <div
                  style="
                    color:#666;
                    font-size:12px;
                  "
                >
                  Nota fiscal
                </div>

                <strong>
                  ${
                    systemFinancial.invoice_required ===
                      true
                    ||
                    (
                      systemFinancial.invoice_required == null
                      &&
                      systemFinancial.system_invoice_required ===
                        true
                    )

                      ? "Necessaria"

                      : "Nao necessaria"
                  }
                </strong>

              </div>

            </div>


            <div
              style="
                margin-top:13px;
                padding:11px 12px;
                border-radius:8px;
                background:#ffffff;
              "
            >

              <div
                style="
                  color:#666;
                  font-size:12px;
                "
              >
                PIX para pagamento
              </div>


              <strong
                style="
                  display:block;
                  margin-top:3px;
                  word-break:break-all;
                "
              >
                ${
                  systemFinancial.pix_key

                    ? escapeHtml(
                        systemFinancial.pix_key
                      )

                    : "PIX ainda nao informado pelo administrador."
                }
              </strong>

            </div>


            ${
              systemFinancial.paid_at

                ? `

                  <div
                    style="
                      margin-top:10px;
                      color:#555;
                      font-size:13px;
                    "
                  >
                    Pagamento registrado em
                    ${escapeHtml(
                      formatDateTime(
                        systemFinancial.paid_at
                      )
                    )}.
                  </div>

                `

                : ""
            }

          `
      }

    </div>


    <div
      style="
        margin-top:14px;
        padding:12px;
        border-radius:8px;
        background:#f7e9e1;
        font-size:13px;
      "
    >
      Os dias e horarios definidos acima controlam a agenda.
      Se ja existir aluno, aula ou reposicao em um dia/horario
      que voce tentar remover, o sistema pedira para reagendar
      antes de salvar a alteracao.
    </div>


    <button
      type="button"
      class="action-button"
      id="saveTeacherProfileButton"
      style="
        margin-top:15px;
      "
    >
      Salvar perfil
    </button>


    <p
      id="teacherProfileMessage"
      style="
        margin-top:10px;
      "
    ></p>

  `;


  const saveButton =
    document.getElementById(
      "saveTeacherProfileButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveTeacherProfilePage
    );

  }

}


// =====================================================
// SALVAR PERFIL DO PROFESSOR
// =====================================================

async function saveTeacherProfilePage() {

  const nameInput =
    document.getElementById(
      "teacherProfileName"
    );


  const pixInput =
    document.getElementById(
      "teacherProfilePix"
    );

  const phoneInput =
    document.getElementById(
      "teacherProfilePhone"
    );

  const cpfInput =
    document.getElementById(
      "teacherProfileCpf"
    );


  const cnpjInput =
    document.getElementById(
      "teacherProfileCnpj"
    );


  const startInput =
    document.getElementById(
      "teacherProfileWorkStart"
    );


  const endInput =
    document.getElementById(
      "teacherProfileWorkEnd"
    );


  const makeupNoticeInput =
    document.getElementById(
      "teacherMakeupRescheduleNotice"
    );


  const monthlyMakeupLimitInput =
    document.getElementById(
      "teacherMonthlyMakeupLimit"
    );


  const makeupMaxCountInput =
    document.getElementById(
      "teacherMakeupRescheduleMaxCount"
    );


  const lessonNoticeInput =
    document.getElementById(
      "teacherLessonRescheduleNotice"
    );


  const workDayInputs =
    Array.from(
      document.querySelectorAll(
        "[data-teacher-work-day]"
      )
    );


  const message =
    document.getElementById(
      "teacherProfileMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherProfileButton"
    );


  if (
    !nameInput ||
    !phoneInput ||
    !cpfInput ||
    !startInput ||
    !endInput ||
    !makeupNoticeInput ||
    !monthlyMakeupLimitInput ||
    !makeupMaxCountInput ||
    !lessonNoticeInput
  ) {
    return;
  }


  const name =
    nameInput.value.trim();

  const phone =
    phoneInput.value.trim();

  const cpf =
    normalizeDigitsV2(
      cpfInput.value
    );


  const startTime =
    startInput.value;


  const endTime =
    endInput.value;


  const makeupNoticeHours =
    Number(
      makeupNoticeInput.value
    );


  const monthlyMakeupLimit =
    Number(
      monthlyMakeupLimitInput.value
    );


  const makeupMaxCount =
    Number(
      makeupMaxCountInput.value
    );


  const lessonNoticeHours =
    Number(
      lessonNoticeInput.value
    );


  const workDays =
    workDayInputs

      .filter(
        input =>
          input.checked
      )

      .map(
        input =>
          Number(
            input.value
          )
      )

      .filter(
        value =>
          value >= 1 &&
          value <= 7
      )

      .sort(
        (
          a,
          b
        ) =>
          a - b
      );


  if (!name) {

    if (message) {

      message.textContent =
        "Informe o nome do professor.";

      message.style.color =
        "red";

    }


    return;
  }

  if (
    normalizeDigitsV2(phone).length < 10 ||
    !isValidCpfV2(cpf) ||
    !pixInput ||
    !pixInput.value.trim() ||
    !cnpjInput ||
    normalizeDigitsV2(cnpjInput.value).length !== 14
  ) {
    if (message) {
      message.textContent =
        "Informe telefone, CPF, PIX e CNPJ validos.";
      message.style.color = "red";
    }
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

    if (message) {

      message.textContent =
        "Informe um horario inicial e final validos. O fim pode ser 00:00 para representar meia-noite.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    workDays.length === 0
  ) {

    if (message) {

      message.textContent =
        "Selecione pelo menos um dia em que voce da aula.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    ![2, 6, 24].includes(
      makeupNoticeHours
    )
    ||
    ![2, 4, 6, 8].includes(
      monthlyMakeupLimit
    )
    ||
    ![1, 2, 3].includes(
      makeupMaxCount
    )
    ||
    ![2, 6, 24].includes(
      lessonNoticeHours
    )
  ) {

    if (message) {

      message.textContent =
        "Selecione valores validos para todas as regras de remarcacao.";

      message.style.color =
        "red";

    }


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
      "save_my_teacher_profile_with_rules_and_days",
      {

        p_name:
          name,

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
          endTime,

        p_work_days:
          workDays,

        p_makeup_reschedule_notice_hours:
          makeupNoticeHours,

        p_monthly_makeup_limit:
          monthlyMakeupLimit,

        p_makeup_reschedule_max_count:
          makeupMaxCount,

        p_lesson_reschedule_notice_hours:
          lessonNoticeHours

      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar perfil";

  }


  if (error) {

    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar o perfil.";

      message.style.color =
        "red";

    }


    return;
  }


  const {
    error: personalDataError
  } = await supabaseClient.rpc(
    "save_my_teacher_personal_data_v2",
    {
      p_phone: phone,
      p_cpf: cpf
    }
  );


  if (personalDataError) {

    if (message) {
      message.textContent =
        personalDataError.message ||
        "Os demais dados foram salvos, mas telefone e CPF falharam.";
      message.style.color = "red";
    }

    return;
  }


  currentProfile.name =
    name;

  currentProfile.phone = phone;
  currentProfile.cpf = cpf;


  await loadCurrentTeacherProfileSettings();


  const header =
    document.getElementById(
      "teacherHeader"
    );


  if (header) {

    header.innerHTML = `
      <h2>Ola, ${escapeHtml(name)}</h2>
      <p>Area do professor.</p>
    `;

  }


  if (message) {

    message.textContent =
      "Perfil, dias de atendimento e regras atualizados com sucesso.";

    message.style.color =
      "green";

  }

}


// =====================================================
// LINKS DAS AULAS ACIMA DA AGENDA
// =====================================================

async function loadTeacherClassLinksForAgenda() {

  const area =
    document.getElementById(
      "teacherClassLinksArea"
    );


  if (!area) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_class_links"
    );


  if (error) {

    console.warn(
      "Nao foi possivel carregar os links das aulas:",
      error
    );


    area.innerHTML =
      "";

    return;
  }


  const links =
    data || [];


  if (
    links.length ===
      0
  ) {

    area.innerHTML =
      "";

    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:13px 14px;
        border:1px solid #e7dfd5;
        border-radius:10px;
        background:#f7e9e1;
      "
    >

      <strong>
        Links das aulas
      </strong>


      <div
        style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:10px;
        "
      >

        ${links
          .map(
            item => `

              <a
                href="${safeHrefV3(
                  item.class_link
                )}"
                target="_blank"
                rel="noopener noreferrer"
                class="secondary-button"
                style="
                  text-decoration:none;
                "
                title="${escapeHtml(
                  item.student_name
                )}"
              >
                ${escapeHtml(
                  formatAgendaStudentName(
                    item.student_name
                  )
                )}
                - Abrir aula
              </a>

            `
          )
          .join("")}

      </div>

    </div>

  `;

}


// =====================================================
// FERIADOS - PAINEL DO PROFESSOR NA AGENDA
// =====================================================

function renderTeacherHolidayDecisionArea() {

  const area =
    document.getElementById(
      "teacherHolidayDecisionArea"
    );


  if (!area) {
    return;
  }


  if (
    currentTeacherHolidayWeek.length ===
      0
  ) {

    area.innerHTML =
      "";

    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:14px;
        border:1px solid #dcccbc;
        border-radius:10px;
        background:#fffaf3;
      "
    >

      <strong>
        Feriado nacional nesta semana
      </strong>


      <div
        style="
          display:grid;
          gap:10px;
          margin-top:10px;
        "
      >

        ${currentTeacherHolidayWeek
          .map(
            holiday => `

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:10px;
                  flex-wrap:wrap;
                  padding:10px;
                  background:#ffffff;
                  border-radius:8px;
                "
              >

                <div>

                  <strong>
                    ${escapeHtml(
                      holiday.holiday_name
                    )}
                  </strong>


                  <div
                    style="
                      margin-top:3px;
                      color:#666;
                      font-size:13px;
                    "
                  >
                    ${formatDate(
                      new Date(
                        String(
                          holiday.holiday_date
                        )
                        +
                        "T12:00:00"
                      )
                    )}

                    -
                    ${
                      holiday.has_classes ===
                        false

                        ? "Sem aula"

                        : (
                            holiday.has_classes ===
                              true

                              ? "Aula normal"

                              : "Decisao pendente"
                          )
                    }
                  </div>

                </div>


                <div
                  style="
                    display:flex;
                    gap:7px;
                    flex-wrap:wrap;
                  "
                >

                  <button
                    type="button"
                    class="secondary-button teacher-holiday-decision-button"
                    data-holiday-date="${holiday.holiday_date}"
                    data-has-classes="true"
                  >
                    Ter aula normalmente
                  </button>


                  <button
                    type="button"
                    class="secondary-button teacher-holiday-decision-button"
                    data-holiday-date="${holiday.holiday_date}"
                    data-has-classes="false"
                  >
                    Nao ter aula
                  </button>

                </div>

              </div>

            `
          )
          .join("")}

      </div>


      <div
        style="
          margin-top:9px;
          color:#666;
          font-size:12px;
        "
      >
        Feriados estaduais, municipais ou regionais nao
        alteram a agenda automaticamente.
      </div>

    </div>

  `;


  document
    .querySelectorAll(
      ".teacher-holiday-decision-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const holidayDate =
            button.dataset.holidayDate;


          const hasClasses =
            button.dataset.hasClasses ===
              "true";


          const {
            error
          } =
            await supabaseClient.rpc(
              "set_teacher_holiday_decision",
              {
                p_holiday_date:
                  holidayDate,

                p_has_classes:
                  hasClasses
              }
            );


          if (error) {

            alert(
              error.message ||
              "Nao foi possivel salvar a decisao do feriado."
            );


            return;
          }


          await loadTeacherWeeklySchedule();

        }
      );

    });

}


// =====================================================
// FERIADOS - AVISO PARA O ALUNO
// =====================================================

function renderStudentHolidayArea() {

  const area =
    document.getElementById(
      "studentHolidayArea"
    );


  if (!area) {
    return;
  }


  if (
    currentStudentHolidayWeek.length ===
      0
  ) {

    area.innerHTML =
      "";

    return;
  }


  area.innerHTML = `

    <div
      style="
        padding:12px 14px;
        border-radius:9px;
        background:#fffaf3;
        border:1px solid #dcccbc;
      "
    >

      ${currentStudentHolidayWeek
        .map(
          holiday => `

            <div
              style="
                margin:4px 0;
              "
            >

              <strong>
                ${escapeHtml(
                  holiday.holiday_name
                )}
              </strong>

              -
              ${
                holiday.has_classes ===
                  false

                  ? "Nao havera aula."

                  : (
                      holiday.has_classes ===
                        true

                        ? "Aulas normais."

                        : "O professor ainda nao registrou uma alteracao; a agenda permanece normal."
                    )
              }

            </div>

          `
        )
        .join("")}

    </div>

  `;

}


// =====================================================
// PAGINA DE MATERIAIS DO PROFESSOR
// =====================================================

async function loadTeacherMaterialsPage() {

  const studentSelect =
    document.getElementById(
      "teacherMaterialStudent"
    );


  const list =
    document.getElementById(
      "teacherMaterialsList"
    );


  if (
    !studentSelect ||
    !list
  ) {
    return;
  }


  const [
    studentsResult,
    materialsResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_teacher_material_students"
      ),

      supabaseClient.rpc(
        "get_teacher_materials",
        {
          p_student_id:
            null
        }
      )

    ]);


  if (
    studentsResult.error ||
    materialsResult.error
  ) {

    console.error(
      "Erro ao carregar materiais:",
      studentsResult.error ||
      materialsResult.error
    );


    list.innerHTML =
      "Nao foi possivel carregar os materiais.";


    return;
  }


  currentTeacherMaterialStudents =
    studentsResult.data || [];


  currentTeacherMaterials =
    materialsResult.data || [];


  studentSelect.innerHTML = `

    <option value="">
      Selecione o aluno
    </option>

    ${currentTeacherMaterialStudents
      .map(
        student => `

          <option
            value="${student.student_id}"
          >
            ${escapeHtml(
              student.student_name
            )}
          </option>

        `
      )
      .join("")}

  `;


  renderTeacherMaterialsList();


  const saveButton =
    document.getElementById(
      "saveTeacherMaterialButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveTeacherMaterial
    );

  }


  studentSelect.addEventListener(
    "change",
    renderTeacherMaterialsList
  );

}


// =====================================================
// LISTA DE MATERIAIS NO PROFESSOR
// =====================================================

function renderTeacherMaterialsList() {

  const list =
    document.getElementById(
      "teacherMaterialsList"
    );


  const select =
    document.getElementById(
      "teacherMaterialStudent"
    );


  if (!list) {
    return;
  }


  const selectedStudentId =
    select
      ? select.value
      : "";


  const materials =
    selectedStudentId

      ? currentTeacherMaterials.filter(
          item =>
            String(
              item.student_id
            ) ===
            String(
              selectedStudentId
            )
        )

      : currentTeacherMaterials;


  if (
    materials.length ===
      0
  ) {

    list.innerHTML = `

      <div
        style="
          padding:14px;
          border-radius:9px;
          background:#fffaf3;
        "
      >
        Nenhum material cadastrado
        ${
          selectedStudentId
            ? "para este aluno"
            : ""
        }.
      </div>

    `;


    return;
  }


  list.innerHTML = `

    <div
      style="
        display:grid;
        gap:10px;
      "
    >

      ${materials
        .map(
          item => `

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

                <div>

                  <strong>
                    ${escapeHtml(
                      item.title
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
                      item.student_name
                    )}
                  </div>

                </div>


                <button
                  type="button"
                  class="secondary-button delete-teacher-material-button"
                  data-material-id="${item.material_id}"
                  style="
                    color:#c0392b;
                    border-color:#c0392b;
                  "
                >
                  Remover
                </button>

              </div>


              ${
                item.description

                  ? `

                    <div
                      style="
                        margin-top:8px;
                        white-space:pre-wrap;
                      "
                    >
                      ${escapeHtml(
                        item.description
                      )}
                    </div>

                  `

                  : ""
              }


              <a
                href="${safeHrefV3(item.url)}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display:inline-block;
                  margin-top:9px;
                  word-break:break-all;
                "
              >
                Abrir material
              </a>

            </div>

          `
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".delete-teacher-material-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          deleteTeacherMaterial(
            button.dataset.materialId
          );

        }
      );

    });

}


// =====================================================
// SALVAR MATERIAL
// =====================================================

async function saveTeacherMaterial() {

  const studentSelect =
    document.getElementById(
      "teacherMaterialStudent"
    );


  const titleInput =
    document.getElementById(
      "teacherMaterialTitle"
    );


  const urlInput =
    document.getElementById(
      "teacherMaterialUrl"
    );


  const descriptionInput =
    document.getElementById(
      "teacherMaterialDescription"
    );


  const message =
    document.getElementById(
      "teacherMaterialMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherMaterialButton"
    );


  if (
    !studentSelect ||
    !titleInput ||
    !urlInput
  ) {
    return;
  }


  const studentId =
    studentSelect.value;


  const title =
    titleInput.value.trim();


  const url =
    urlInput.value.trim();


  if (!studentId) {

    if (message) {

      message.textContent =
        "Selecione o aluno.";

      message.style.color =
        "red";

    }


    return;
  }


  if (!title) {

    if (message) {

      message.textContent =
        "Informe o titulo do material.";

      message.style.color =
        "red";

    }


    return;
  }


  if (
    !/^https?:\/\//i.test(
      url
    )
  ) {

    if (message) {

      message.textContent =
        "O link precisa comecar com http:// ou https://.";

      message.style.color =
        "red";

    }


    return;
  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Adicionando...";

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_teacher_material",
      {
        p_student_id:
          studentId,

        p_title:
          title,

        p_url:
          url,

        p_description:
          descriptionInput
            ? descriptionInput.value.trim() || null
            : null
      }
    );


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Adicionar material";

  }


  if (error) {

    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel adicionar o material.";

      message.style.color =
        "red";

    }


    return;
  }


  titleInput.value =
    "";


  urlInput.value =
    "";


  if (descriptionInput) {

    descriptionInput.value =
      "";

  }


  if (message) {

    message.textContent =
      "Material adicionado com sucesso.";

    message.style.color =
      "green";

  }


  const {
    data,
    error: reloadError
  } =
    await supabaseClient.rpc(
      "get_teacher_materials",
      {
        p_student_id:
          null
      }
    );


  if (!reloadError) {

    currentTeacherMaterials =
      data || [];


    renderTeacherMaterialsList();

  }

}


// =====================================================
// REMOVER MATERIAL
// =====================================================

async function deleteTeacherMaterial(
  materialId
) {

  if (
    !window.confirm(
      "Remover este material do aluno?"
    )
  ) {
    return;
  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "delete_teacher_material",
      {
        p_material_id:
          materialId
      }
    );


  if (error) {

    alert(
      error.message ||
      "Nao foi possivel remover o material."
    );


    return;
  }


  currentTeacherMaterials =
    currentTeacherMaterials.filter(
      item =>
        String(
          item.material_id
        ) !==
        String(
          materialId
        )
    );


  renderTeacherMaterialsList();

}


// =====================================================
// MATERIAIS DO ALUNO
// =====================================================

async function loadStudentMaterials() {

  const container =
    document.getElementById(
      "studentMaterialsContent"
    );


  if (!container) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_materials"
    );


  if (error) {

    console.error(
      "Erro ao carregar materiais do aluno:",
      error
    );


    container.innerHTML =
      "Nao foi possivel carregar seus materiais.";


    return;
  }


  const materials =
    data || [];


  if (
    materials.length ===
      0
  ) {

    container.innerHTML = `

      <div
        style="
          padding:16px;
          border-radius:9px;
          background:#fffaf3;
        "
      >
        Nenhum material foi disponibilizado ainda.
      </div>

    `;


    return;
  }


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:12px;
      "
    >

      ${materials
        .map(
          item => `

            <div
              style="
                padding:15px;
                border:1px solid #ddd;
                border-radius:10px;
                background:#ffffff;
              "
            >

              <strong
                style="
                  font-size:17px;
                "
              >
                ${escapeHtml(
                  item.title
                )}
              </strong>


              ${
                item.description

                  ? `

                    <div
                      style="
                        margin-top:8px;
                        white-space:pre-wrap;
                      "
                    >
                      ${escapeHtml(
                        item.description
                      )}
                    </div>

                  `

                  : ""
              }


              <a
                href="${safeHrefV3(item.url)}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  display:inline-block;
                  margin-top:11px;
                "
              >
                Abrir material
              </a>

            </div>

          `
        )
        .join("")}

    </div>

  `;

}


// =====================================================
// PAINEL OPERACIONAL DO PROFESSOR
// =====================================================

async function loadTeacherDashboard() {

  const area =
    document.getElementById(
      "teacherDashboardArea"
    );


  if (!area) {
    return;
  }


  const dashboardNow =
    new Date();


  const dashboardYear =
    dashboardNow.getFullYear();


  const dashboardMonth =
    dashboardNow.getMonth() + 1;


  const [
    summaryResult,
    alertsResult,
    contractSummaryResult,
    contractAlertsResult,
    financialGenerationResult,
    todayScheduleResult
  ] =
    await Promise.all([

      supabaseClient.rpc(
        "get_teacher_dashboard_summary"
      ),

      supabaseClient.rpc(
        "get_teacher_dashboard_alerts"
      ),

      supabaseClient.rpc(
        "get_teacher_contract_dashboard_summary"
      ),

      supabaseClient.rpc(
        "get_teacher_contract_dashboard_alerts"
      ),

      supabaseClient.rpc(
        "get_teacher_financial_generation_status",
        {
          p_year:
            dashboardYear,

          p_month:
            dashboardMonth
        }
      ),

      supabaseClient.rpc(
        "get_teacher_schedule",
        {
          p_date:
            formatDateForDatabase(
              dashboardNow
            )
        }
      )

    ]);


  const dashboardErrors =
    [
      {
        name:
          "resumo geral",
        error:
          summaryResult.error
      },
      {
        name:
          "alertas gerais",
        error:
          alertsResult.error
      },
      {
        name:
          "resumo de contratos",
        error:
          contractSummaryResult.error
      },
      {
        name:
          "alertas de contratos",
        error:
          contractAlertsResult.error
      },
      {
        name:
          "geracao financeira",
        error:
          financialGenerationResult.error
      },
      {
        name:
          "aulas de hoje",
        error:
          todayScheduleResult.error
      }
    ]
      .filter(
        item =>
          Boolean(
            item.error
          )
      );


  dashboardErrors.forEach(
    item => {

      console.error(
        "Erro no " +
        item.name +
        " do painel:",
        item.error
      );

    }
  );


  const summary =
    (
      !summaryResult.error
      &&
      Array.isArray(
        summaryResult.data
      )
        ? summaryResult.data[0]
        : (
            !summaryResult.error
              ? summaryResult.data
              : null
          )
    )
    || {};


  const contractSummary =
    (
      !contractSummaryResult.error
      &&
      Array.isArray(
        contractSummaryResult.data
      )
        ? contractSummaryResult.data[0]
        : (
            !contractSummaryResult.error
              ? contractSummaryResult.data
              : null
          )
    )
    || {};


  const financialGeneration =
    (
      !financialGenerationResult.error
      &&
      Array.isArray(
        financialGenerationResult.data
      )
        ? financialGenerationResult.data[0]
        : (
            !financialGenerationResult.error
              ? financialGenerationResult.data
              : null
          )
    )
    || {};


  const todayOccurrences =
    (todayScheduleResult.error
      ? []
      : (todayScheduleResult.data || [])
    )
      .filter(item => {
        const type =
          normalizeTeacherScheduleStatus(
            item.status
          ).type;

        return type === "lesson" ||
          type === "makeup";
      })
      .sort(
        (a, b) =>
          timeToMinutes(a.start_time) -
          timeToMinutes(b.start_time)
      );


  const nowMinutes =
    dashboardNow.getHours() * 60 +
    dashboardNow.getMinutes();


  const nextTodayLesson =
    todayOccurrences.find(
      item =>
        timeToMinutes(item.start_time) >=
        nowMinutes
    ) || null;


  const generatedFinancialAlerts =
    Number(
      financialGeneration.missing_records || 0
    ) > 0

      ? [
          {
            alert_type:
              "missing_financial",

            student_id:
              null,

            student_name:
              "",

            title:
              "Mensalidades do mes ainda nao geradas",

            detail:
              String(
                Number(
                  financialGeneration.missing_records || 0
                )
              )
              +
              " aluno(s) ainda estao sem lancamento em "
              +
              formatMonth(
                dashboardMonth
              )
              +
              "/"
              +
              dashboardYear
              +
              ".",

            alert_date:
              null,

            amount:
              null,

            sort_priority:
              15
          }
        ]

      : [];


  const alerts =
    [
      ...generatedFinancialAlerts,
      ...(
        contractAlertsResult.error
          ? []
          : (
              contractAlertsResult.data ||
              []
            )
      ),
      ...(
        alertsResult.error
          ? []
          : (
              alertsResult.data ||
              []
            )
      )
    ]
      .sort(
        (
          a,
          b
        ) =>
          Number(
            a.sort_priority || 999
          )
          -
          Number(
            b.sort_priority || 999
          )
      );


  area.innerHTML = `

    <div class="card teacher-dashboard-card">

      <div
        class="dashboard-heading"
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
            Visao geral
          </h3>


          <p
            style="
              margin:6px 0 0;
              color:#666;
            "
          >
            Acompanhe o que precisa da sua atencao.
          </p>

        </div>


        <button
          type="button"
          class="secondary-button"
          id="refreshTeacherDashboardButton"
        >
          Atualizar resumo
        </button>

      </div>


      ${
        currentTeacherAccess &&
        currentTeacherAccess.access_type === "trial"
          ? `
            <div class="access-countdown">
              Teste gratis
              <strong>${formatRemainingTimeV2(currentTeacherAccess.remaining_seconds)}</strong>
            </div>
          `
          : ""
      }


      <div class="dashboard-highlight-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:18px;">
        ${renderTeacherDashboardStat("Aulas hoje", todayOccurrences.length)}

        <div class="dashboard-next-lesson" style="padding:13px;border:1px solid #ddd;border-radius:9px;background:#ffffff;">
          <div class="dashboard-next-label" style="font-size:12px;color:#666;">Proxima aula</div>
          <div class="dashboard-next-value" style="margin-top:5px;font-size:18px;font-weight:bold;">
            ${
              nextTodayLesson
                ? `${normalizeTime(nextTodayLesson.start_time)} - ${escapeHtml(formatAgendaStudentName(nextTodayLesson.student_name || "Aluno"))}`
                : "Nenhuma aula restante hoje"
            }
          </div>
        </div>
      </div>


      <div
        class="dashboard-stat-grid"
        style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(150px,1fr));
          gap:10px;
          margin-top:18px;
        "
      >

        ${renderTeacherDashboardStat(
          "Alunos ativos",
          summary.active_students || 0
        )}

        ${renderTeacherDashboardStat(
          "Aulas pausadas",
          summary.paused_students || 0
        )}

        ${renderTeacherDashboardStat(
          "Comentarios novos",
          summary.unread_comments || 0
        )}

        ${renderTeacherDashboardStat(
          "Mensalidades atrasadas",
          summary.overdue_financial || 0
        )}

        ${renderTeacherDashboardStat(
          "Mensalidades nao geradas",
          financialGeneration.missing_records || 0
        )}

        ${renderTeacherDashboardStat(
          "Reposicoes vencendo",
          summary.expiring_makeups || 0
        )}

        ${renderTeacherDashboardStat(
          "Menores sem responsavel",
          summary.minors_without_guardian || 0
        )}

        ${renderTeacherDashboardStat(
          "Contratos vencendo",
          contractSummary.expiring_contracts || 0
        )}

        ${renderTeacherDashboardStat(
          "Contratos vencidos",
          contractSummary.expired_contracts || 0
        )}

      </div>


      ${
        dashboardErrors.length > 0

          ? `

            <div
              style="
                margin-top:16px;
                padding:10px 12px;
                border-radius:8px;
                background:#fff3cd;
                color:#6b5400;
              "
            >
              Parte do painel apresentou erro, mas as demais
              informacoes continuam sendo exibidas.

              <div
                style="
                  margin-top:4px;
                  font-size:12px;
                "
              >
                ${escapeHtml(
                  dashboardErrors
                    .map(
                      item =>
                        item.name
                    )
                    .join(", ")
                )}
              </div>
            </div>

          `

          : ""
      }


      <div
        class="dashboard-attention"
        style="
          margin-top:20px;
        "
      >

        <h4
          style="
            margin-bottom:10px;
          "
        >
          Atencao necessaria
        </h4>


        ${
          alerts.length === 0

            ? `

              <div
                class="dashboard-all-good"
                style="
                  padding:14px;
                  border-radius:9px;
                  background:#eef8f0;
                "
              >
                <strong>Tudo em dia!</strong><br>
                Nenhuma pendencia importante no momento.
              </div>

            `

            : `

              <div
                class="dashboard-alert-list"
                style="
                  display:grid;
                  gap:9px;
                "
              >

                ${alerts
                  .map(
                    renderTeacherDashboardAlert
                  )
                  .join("")}

              </div>

            `
        }

      </div>

    </div>

  `;


  const refreshButton =
    document.getElementById(
      "refreshTeacherDashboardButton"
    );


  if (refreshButton) {

    refreshButton.addEventListener(
      "click",
      loadTeacherDashboard
    );

  }


  document
    .querySelectorAll(
      ".teacher-dashboard-student-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          const studentId =
            button.dataset.studentId;


          setTeacherPage(
            "students"
          );


          await waitForElement(
            "teacherStudentDetailArea"
          );


          await openTeacherStudentDetail(
            studentId
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".teacher-dashboard-financial-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          setTeacherPage(
            "financial"
          );

        }
      );

    });

}


// =====================================================
// CARD NUMERICO DO PAINEL
// =====================================================

function renderTeacherDashboardStat(
  label,
  value
) {

  return `

    <div
      class="dashboard-stat"
      style="
        padding:13px;
        border:1px solid #ddd;
        border-radius:9px;
        background:#ffffff;
      "
    >

      <div
        class="dashboard-stat-label"
        style="
          font-size:12px;
          color:#666;
        "
      >
        ${escapeHtml(
          label
        )}
      </div>


      <div
        class="dashboard-stat-value"
        style="
          margin-top:4px;
          font-size:24px;
          font-weight:bold;
        "
      >
        ${Number(
          value || 0
        )}
      </div>

    </div>

  `;

}


// =====================================================
// ALERTA DO PAINEL
// =====================================================

function renderTeacherDashboardAlert(
  alert
) {

  const financial =
    alert.alert_type ===
      "overdue_financial"
    ||
    alert.alert_type ===
      "missing_financial";


  return `

    <div
      class="dashboard-alert"
      style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap;
        padding:12px;
        border:1px solid #e3e3e3;
        border-radius:9px;
        background:#ffffff;
      "
    >

      <div>

        <strong>
          ${escapeHtml(
            alert.title || "Alerta"
          )}
        </strong>


        <div
          style="
            margin-top:3px;
          "
        >
          ${escapeHtml(
            alert.student_name || ""
          )}
        </div>


        ${
          alert.detail

            ? `

              <div
                style="
                  margin-top:3px;
                  color:#666;
                  font-size:13px;
                "
              >
                ${escapeHtml(
                  alert.detail
                )}
              </div>

            `

            : ""
        }


        ${
          alert.amount != null

            ? `

              <div
                style="
                  margin-top:4px;
                  font-weight:bold;
                "
              >
                ${formatCurrency(
                  alert.amount
                )}
              </div>

            `

            : ""
        }

      </div>


      <button
        type="button"
        class="secondary-button ${
          financial
            ? "teacher-dashboard-financial-button"
            : "teacher-dashboard-student-button"
        }"
        ${
          financial
            ? ""
            : `data-student-id="${alert.student_id}"`
        }
      >
        ${
          financial
            ? "Abrir financeiro"
            : "Ver aluno"
        }
      </button>

    </div>

  `;

}


// =====================================================
// ESPERAR ELEMENTO APARECER APOS TROCA DE ABA
// =====================================================

async function waitForElement(
  id,
  timeoutMs = 2500
) {

  const start =
    Date.now();


  while (
    Date.now() - start <
      timeoutMs
  ) {

    const element =
      document.getElementById(
        id
      );


    if (element) {
      return element;
    }


    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          50
        )
    );

  }


  return null;

}


async function loadTeacherRules() {

  const input =
    document.getElementById(
      "teacherRulesInput"
    );


  const preview =
    document.getElementById(
      "teacherRulesImagePreview"
    );


  if (!input) {
    return;
  }


  input.value =
    "Carregando regras...";


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_teacher_rules_content"
    );


  if (error) {

    console.error(
      "Erro ao carregar regras:",
      error
    );


    input.value =
      "";


    const message =
      document.getElementById(
        "teacherRulesMessage"
      );


    if (message) {

      message.textContent =
        "Nao foi possivel carregar as regras.";

      message.style.color =
        "red";

    }


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


  input.value =
    content.rules_text || "";


  currentTeacherRulesImagePath =
    content.rules_image_path ||
    null;


  teacherRulesImageRemoved =
    false;


  renderTeacherRulesImagePreview();


  const saveButton =
    document.getElementById(
      "saveTeacherRulesButton"
    );


  if (saveButton) {

    saveButton.addEventListener(
      "click",
      saveTeacherRules
    );

  }

}


// =====================================================
// URL PUBLICA DA IMAGEM DAS REGRAS
// =====================================================

function getRulesImagePublicUrl(
  path
) {

  if (!path) {
    return "";
  }


  const {
    data
  } =
    supabaseClient.storage
      .from(
        "rules-images"
      )
      .getPublicUrl(
        path
      );


  return (
    data &&
    data.publicUrl
  )
    ? data.publicUrl
    : "";

}


// =====================================================
// PREVIEW DA IMAGEM DAS REGRAS
// =====================================================

function renderTeacherRulesImagePreview() {

  const preview =
    document.getElementById(
      "teacherRulesImagePreview"
    );


  if (!preview) {
    return;
  }


  const url =
    getRulesImagePublicUrl(
      currentTeacherRulesImagePath
    );


  if (
    !url ||
    teacherRulesImageRemoved
  ) {

    preview.innerHTML =
      "<small>Nenhuma imagem salva.</small>";

    return;
  }


  preview.innerHTML = `

    <img
      src="${escapeHtml(
        url
      )}"
      alt="Imagem atual das regras"
      style="
        display:block;
        max-width:100%;
        max-height:350px;
        object-fit:contain;
        border-radius:9px;
      "
    >


    <button
      type="button"
      class="secondary-button"
      id="removeTeacherRulesImageButton"
      style="
        margin-top:9px;
        border-color:#c0392b;
        color:#c0392b;
      "
    >
      Remover imagem
    </button>

  `;


  const removeButton =
    document.getElementById(
      "removeTeacherRulesImageButton"
    );


  if (removeButton) {

    removeButton.addEventListener(
      "click",
      () => {

        teacherRulesImageRemoved =
          true;


        renderTeacherRulesImagePreview();

      }
    );

  }

}


// =====================================================
// SALVAR REGRAS DO PROFESSOR
// =====================================================

async function saveTeacherRules() {

  const input =
    document.getElementById(
      "teacherRulesInput"
    );


  const imageInput =
    document.getElementById(
      "teacherRulesImageInput"
    );


  const message =
    document.getElementById(
      "teacherRulesMessage"
    );


  const button =
    document.getElementById(
      "saveTeacherRulesButton"
    );


  if (!input) {
    return;
  }


  const rules =
    input.value.trim();


  const oldImagePath =
    currentTeacherRulesImagePath;


  let nextImagePath =
    teacherRulesImageRemoved
      ? null
      : currentTeacherRulesImagePath;


  const file =
    imageInput &&
    imageInput.files
      ? imageInput.files[0]
      : null;


  if (file) {

    const allowedTypes =
      [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif"
      ];


    if (
      !allowedTypes.includes(
        file.type
      )
    ) {

      if (message) {

        message.textContent =
          "Use uma imagem JPG, PNG, WEBP ou GIF.";

        message.style.color =
          "red";

      }


      return;
    }


    if (
      file.size >
        5 * 1024 * 1024
    ) {

      if (message) {

        message.textContent =
          "A imagem deve ter no maximo 5 MB.";

        message.style.color =
          "red";

      }


      return;
    }

  }


  if (button) {

    button.disabled =
      true;

    button.textContent =
      "Salvando...";

  }


  if (message) {

    message.textContent =
      "";

  }


  if (file) {

    const extension =
      (
        file.name
          .split(".")
          .pop()
          ||
        "jpg"
      )
        .toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ""
        );


    nextImagePath =
      currentUser.id
      +
      "/rules-"
      +
      Date.now()
      +
      "."
      +
      extension;


    const {
      error: uploadError
    } =
      await supabaseClient.storage
        .from(
          "rules-images"
        )
        .upload(
          nextImagePath,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              file.type
          }
        );


    if (uploadError) {

      console.error(
        "Erro ao enviar imagem das regras:",
        uploadError
      );


      if (message) {

        message.textContent =
          uploadError.message ||
          "Nao foi possivel enviar a imagem.";

        message.style.color =
          "red";

      }


      if (button) {

        button.disabled =
          false;

        button.textContent =
          "Salvar regras";

      }


      return;
    }

  }


  const {
    error
  } =
    await supabaseClient.rpc(
      "save_teacher_rules_content",
      {
        p_rules_text:
          rules,

        p_rules_image_path:
          nextImagePath
      }
    );


  if (error) {

    console.error(
      "Erro ao salvar regras:",
      error
    );


    if (
      file &&
      nextImagePath
    ) {

      await supabaseClient.storage
        .from(
          "rules-images"
        )
        .remove([
          nextImagePath
        ]);

    }


    if (message) {

      message.textContent =
        error.message ||
        "Nao foi possivel salvar as regras.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Salvar regras";

    }


    return;
  }


  currentTeacherRulesImagePath =
    nextImagePath;


  teacherRulesImageRemoved =
    false;


  if (
    oldImagePath &&
    oldImagePath !==
      nextImagePath
  ) {

    await supabaseClient.storage
      .from(
        "rules-images"
      )
      .remove([
        oldImagePath
      ]);

  }


  if (imageInput) {

    imageInput.value =
      "";

  }


  renderTeacherRulesImagePreview();


  if (message) {

    message.textContent =
      "Regras salvas com sucesso.";

    message.style.color =
      "green";

  }


  if (button) {

    button.disabled =
      false;

    button.textContent =
      "Salvar regras";

  }

}


// =====================================================
// BOT\xd5ES DE NAVEGA\xc7\xc3O
// =====================================================

document
  .querySelectorAll(
    "[data-student-page]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setStudentPage(
          button.dataset.studentPage
        );

      }
    );

  });


document
  .querySelectorAll(
    "[data-teacher-page]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        setTeacherPage(
          button.dataset.teacherPage
        );

      }
    );

  });


// =====================================================
// SEMANA
// =====================================================

function getMonday(date) {

  const result =
    new Date(date);


  result.setHours(
    12,
    0,
    0,
    0
  );


  const day =
    result.getDay();


  const difference =
    day === 0
      ? -6
      : 1 - day;


  result.setDate(
    result.getDate() +
    difference
  );


  return result;
}


function addDays(
  date,
  amount
) {

  const result =
    new Date(date);


  result.setDate(
    result.getDate() +
    amount
  );


  return result;
}


function getDateForDay(
  weekStart,
  dayOfWeek
) {

  return addDays(
    weekStart,
    Number(dayOfWeek) - 1
  );
}


function getWeekDays() {

  const names = [

    "Segunda",
    "Ter\xe7a",
    "Quarta",
    "Quinta",
    "Sexta",
    "S\xe1bado",
    "Domingo"

  ];


  return names.map(
    (name, index) => ({

      name,

      date:
        addDays(
          selectedWeekStart,
          index
        )

    })
  );
}


// =====================================================
// DATAS
// =====================================================


// =====================================================
// ANTECED\u00CANCIA M\u00CDNIMA PARA MARCAR REPOSI\u00C7\u00C3O
// =====================================================

function canBookMakeupOnDate(
  reservationDate
) {

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );


  const targetDate =
    new Date(
      reservationDate
    );

  targetDate.setHours(
    0,
    0,
    0,
    0
  );


  return (
    targetDate > today
  );

}


// =====================================================
// JUNTAR DATA + HOR\u00C1RIO
// =====================================================

function combineDateAndTime(
  date,
  time
) {

  const result =
    new Date(date);

  const parts =
    normalizeTime(
      time
    ).split(":");


  result.setHours(
    Number(parts[0]),
    Number(parts[1]),
    0,
    0
  );


  return result;

}


function formatDate(date) {

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(date);
}


function formatDateTime(value) {

  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return String(value);

  }


  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short"
    }
  ).format(date);
}


function formatWeekLabel(
  weekStart
) {

  const weekEnd =
    addDays(
      weekStart,
      6
    );


  return (
    formatDate(weekStart) +
    " \u2192 " +
    formatDate(weekEnd)
  );
}


function formatDateForDatabase(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    year +
    "-" +
    month +
    "-" +
    day
  );
}


// =====================================================
// HOR\xc1RIOS
// =====================================================

function normalizeTime(time) {

  return String(
    time
  ).substring(
    0,
    5
  );
}


function timeToMinutes(time) {

  const parts =
    normalizeTime(time)
      .split(":");


  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}


function minutesToTime(minutes) {

  const hours =
    Math.floor(
      minutes / 60
    );


  const mins =
    minutes % 60;


  return (
    String(hours).padStart(
      2,
      "0"
    ) +
    ":" +
    String(mins).padStart(
      2,
      "0"
    )
  );
}


// =====================================================
// DIA DA SEMANA
// =====================================================

function formatDay(day) {

  const days = {

    1: "Segunda-feira",

    2: "Ter\xe7a-feira",

    3: "Quarta-feira",

    4: "Quinta-feira",

    5: "Sexta-feira",

    6: "S\xe1bado",

    7: "Domingo"

  };


  return (
    days[
      Number(day)
    ] || ""
  );
}


// =====================================================
// ESCAPAR HTML
// =====================================================

function getFirstNameV5(value) {

  const normalized =
    String(value || "")
      .trim();

  return normalized
    ? normalized.split(/\s+/)[0]
    : "Professor";

}


function escapeHtml(value) {

  return String(
    value || ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


// =====================================================
// LOGIN
// =====================================================

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      loginMessage.textContent =
        "Entrando...";


      const email =
        document
          .getElementById("email")
          .value
          .trim();


      const password =
        document
          .getElementById("password")
          .value;


      const {
        data,
        error
      } =
        await supabaseClient.auth
          .signInWithPassword({
            email,
            password
          });


      if (error) {

        console.error(error);


        loginMessage.textContent =
          /email.*not.*confirmed|email.*nao.*confirm/i.test(error.message || "")
            ? "Confirme seu e-mail antes de entrar. Se precisar, use 'Reenviar confirmacao de e-mail'."
            : "E-mail ou senha incorretos.";


        return;
      }


      loginMessage.textContent =
        "";


      await showLoggedUser(
        data.user
      );

    }
  );

}


// =====================================================
// LOGOUT
// =====================================================

if (logoutButton) {

  logoutButton.addEventListener(
    "click",
    async () => {

      await supabaseClient.auth.signOut();


      currentUser = null;

      currentProfile = null;

      currentStudentId = null;

      currentStudentAccessMode = "full";
      currentTeacherAccess = null;


      teacherScreen.classList.add(
        "hidden"
      );

      studentScreen.classList.add(
        "hidden"
      );

      loginScreen.classList.remove(
        "hidden"
      );


      if (loginForm) {

        loginForm.reset();

      }

    }
  );

}


// =====================================================
// RECUPERA\xc7\xc3O DE SENHA
// =====================================================

if (forgotPasswordButton) {

  forgotPasswordButton.addEventListener(
    "click",
    async () => {

      const email =
        document
          .getElementById("email")
          .value
          .trim();


      if (!email) {

        loginMessage.textContent =
          "Digite seu e-mail primeiro.";

        return;
      }


      const {
        error
      } =
        await supabaseClient.auth
          .resetPasswordForEmail(
            email,
            {
              redirectTo:
                getAppBaseUrlV4()
            }
          );


      if (error) {

        console.error(error);


        loginMessage.textContent =
          "N\xe3o foi poss\xedvel enviar o e-mail de recupera\xe7\xe3o.";


        return;
      }


      loginMessage.textContent =
        "E-mail de recupera\xe7\xe3o enviado.";

    }
  );

}


if (resendConfirmationButton) {
  resendConfirmationButton.addEventListener(
    "click",
    async () => {
      const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
      if (!isValidEmailV2(email)) {
        loginMessage.textContent = "Digite um e-mail valido primeiro.";
        return;
      }

      const { error } = await supabaseClient.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: getAppBaseUrlV4() }
      });

      loginMessage.textContent = error
        ? "Nao foi possivel reenviar a confirmacao agora."
        : "Confirmacao reenviada. Verifique tambem a pasta de spam.";
    }
  );
}


function showPasswordRecoveryFormV4() {
  const mainLoginCard = document.querySelector("#loginScreen > .login-card");
  const card = document.getElementById("passwordRecoveryCard");
  if (!card) return;

  loginScreen.classList.remove("hidden");
  studentScreen.classList.add("hidden");
  teacherScreen.classList.add("hidden");
  mainLoginCard?.classList.add("hidden");
  setPublicCardV2("passwordRecoveryCard");

  card.innerHTML = `
    <h2>Definir nova senha</h2>
    <p>Informe uma nova senha para concluir a recuperacao da conta.</p>
    <form id="passwordRecoveryFormV4">
      <label for="newRecoveryPasswordV4">Nova senha</label>
      <input id="newRecoveryPasswordV4" type="password" minlength="8" autocomplete="new-password" required>
      <label for="confirmRecoveryPasswordV4">Confirmar nova senha</label>
      <input id="confirmRecoveryPasswordV4" type="password" minlength="8" autocomplete="new-password" required>
      <button type="submit" class="primary-button" id="saveRecoveryPasswordV4">Salvar nova senha</button>
      <p id="passwordRecoveryMessageV4" class="message"></p>
    </form>
  `;

  document.getElementById("passwordRecoveryFormV4")
    ?.addEventListener("submit", saveRecoveryPasswordV4);
}


async function saveRecoveryPasswordV4(event) {
  event.preventDefault();
  const password = document.getElementById("newRecoveryPasswordV4")?.value || "";
  const confirmation = document.getElementById("confirmRecoveryPasswordV4")?.value || "";
  const message = document.getElementById("passwordRecoveryMessageV4");
  const button = document.getElementById("saveRecoveryPasswordV4");

  if (password.length < 8 || password !== confirmation) {
    message.textContent = "Use ao menos 8 caracteres e repita a mesma senha.";
    message.style.color = "red";
    return;
  }

  button.disabled = true;
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    button.disabled = false;
    message.textContent = error.message || "Nao foi possivel alterar a senha.";
    message.style.color = "red";
    return;
  }

  message.textContent = "Senha atualizada. Voce ja pode entrar com a nova senha.";
  message.style.color = "green";
  await supabaseClient.auth.signOut();
  window.setTimeout(() => window.location.replace(getAppBaseUrlV4()), 900);
}


// =====================================================
// INICIALIZA\xc7\xc3O
// =====================================================

async function initializeApp() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();


  if (session?.user) {
    if (isPasswordRecoveryUrlV4()) {
      showPasswordRecoveryFormV4();
    } else {
      await showLoggedUser(
        session.user
      );
    }

  }
}


// =====================================================
// ALTERA\xc7\xc3O DE AUTENTICA\xc7\xc3O
// =====================================================

supabaseClient.auth.onAuthStateChange(
  async (
    event,
    session
  ) => {

    if (event === "PASSWORD_RECOVERY" && session?.user) {
      showPasswordRecoveryFormV4();
      return;
    }

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {

      await showLoggedUser(
        session.user
      );

    }

  }
);


// =====================================================
// INICIAR
// =====================================================

initializeApp();


// =====================================================
// ERP V2 - TESTE GRATIS, CADASTROS, SUPORTE E ACESSOS
// =====================================================

function normalizeDigitsV2(value) {
  return String(value || "").replace(/\D/g, "");
}


function isValidCpfV2(value) {
  const cpf = normalizeDigitsV2(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  let sum = 0;
  for (let index = 0; index < 9; index++) {
    sum += Number(cpf[index]) * (10 - index);
  }

  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;

  sum = 0;
  for (let index = 0; index < 10; index++) {
    sum += Number(cpf[index]) * (11 - index);
  }

  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;

  return digit === Number(cpf[10]);
}


function isValidEmailV2(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(
    String(value || "").trim()
  );
}


function formatRemainingTimeV2(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (days > 0) {
    return `${days} dia(s) e ${hours}h restantes`;
  }

  if (hours > 0) {
    return `${hours}h e ${minutes}min restantes`;
  }

  return `${minutes}min restantes`;
}


function renderWeekdayCheckboxesV2(name, selectedDays = []) {
  const days = [
    [1, "Seg"], [2, "Ter"], [3, "Qua"], [4, "Qui"],
    [5, "Sex"], [6, "Sab"], [7, "Dom"]
  ];

  return `
    <div class="weekday-options">
      ${days.map(([value, label]) => `
        <label>
          <input
            type="checkbox"
            name="${name}"
            value="${value}"
            ${selectedDays.map(Number).includes(value) ? "checked" : ""}
          >
          ${label}
        </label>
      `).join("")}
    </div>
  `;
}


function collectCheckedDaysV2(name) {
  return Array.from(
    document.querySelectorAll(`input[name="${name}"]:checked`)
  ).map(input => Number(input.value));
}


function setPublicCardV2(cardId) {
  [
    "publicTeacherRegistrationCard",
    "publicSupportCard",
    "passwordRecoveryCard"
  ].forEach(id => {
    const card = document.getElementById(id);
    if (card) {
      card.classList.toggle("hidden", id !== cardId);
    }
  });
}


function openPublicTeacherRegistrationV2() {
  const card = document.getElementById(
    "publicTeacherRegistrationCard"
  );

  if (!card) return;

  card.innerHTML = `
    <h2>Novo professor</h2>
    <p>Crie seu acesso e use a Aulora gratuitamente por 15 dias.</p>

    <form id="publicTeacherRegistrationForm">
      <div class="erp-form-grid">
        <div><label>Nome completo</label><input id="publicTeacherName" type="text" autocomplete="name" required></div>
        <div><label>E-mail</label><input id="publicTeacherEmail" type="email" autocomplete="email" required></div>
        <div><label>CPF</label><input id="publicTeacherCpf" type="text" inputmode="numeric" required></div>
        <div><label>Telefone</label><input id="publicTeacherPhone" type="tel" autocomplete="tel" required></div>
        <div><label>Senha</label><input id="publicTeacherPassword" type="password" minlength="6" autocomplete="new-password" required></div>
        <div><label>Confirmar senha</label><input id="publicTeacherPasswordConfirm" type="password" minlength="6" autocomplete="new-password" required></div>
        <div><label>PIX</label><input id="publicTeacherPix" type="text" required></div>
        <div><label>CNPJ</label><input id="publicTeacherCnpj" type="text" inputmode="numeric" required></div>
        <div><label>Inicio das aulas</label><input id="publicTeacherStart" type="time" step="1800" value="08:00" required></div>
        <div><label>Fim das aulas</label><input id="publicTeacherEnd" type="time" step="1800" value="20:00" required></div>
        <div class="full-width">
          <label>Dias em que da aula</label>
          ${renderWeekdayCheckboxesV2("publicTeacherWorkDay", [1,2,3,4,5])}
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
        <button type="submit" class="primary-button" id="savePublicTeacherButton">Criar acesso gratuito</button>
        <button type="button" class="secondary-button" id="closePublicTeacherButton">Cancelar</button>
      </div>
      <p id="publicTeacherMessage" class="message"></p>
    </form>
  `;

  setPublicCardV2("publicTeacherRegistrationCard");

  document.getElementById("closePublicTeacherButton")
    .addEventListener("click", () => setPublicCardV2(""));

  document.getElementById("publicTeacherRegistrationForm")
    .addEventListener("submit", savePublicTeacherV2);
}


async function savePublicTeacherV2(event) {
  event.preventDefault();

  const value = id => document.getElementById(id)?.value || "";
  const name = value("publicTeacherName").trim();
  const email = value("publicTeacherEmail").trim().toLowerCase();
  const cpf = normalizeDigitsV2(value("publicTeacherCpf"));
  const phone = value("publicTeacherPhone").trim();
  const password = value("publicTeacherPassword");
  const confirmPassword = value("publicTeacherPasswordConfirm");
  const pix = value("publicTeacherPix").trim();
  const cnpj = normalizeDigitsV2(value("publicTeacherCnpj"));
  const startTime = value("publicTeacherStart");
  const endTime = value("publicTeacherEnd");
  const workDays = collectCheckedDaysV2("publicTeacherWorkDay");
  const message = document.getElementById("publicTeacherMessage");
  const button = document.getElementById("savePublicTeacherButton");

  const fail = text => {
    message.textContent = text;
    message.style.color = "red";
  };

  if (name.length < 3 || !isValidEmailV2(email)) {
    fail("Informe nome completo e e-mail valido.");
    return;
  }

  if (!isValidCpfV2(cpf)) {
    fail("Informe um CPF valido.");
    return;
  }

  if (normalizeDigitsV2(phone).length < 10) {
    fail("Informe um telefone valido com DDD.");
    return;
  }

  if (password.length < 6 || password !== confirmPassword) {
    fail("A senha deve ter ao menos 6 caracteres e as duas senhas devem coincidir.");
    return;
  }

  if (!pix || cnpj.length !== 14 || workDays.length === 0) {
    fail("Preencha PIX, CNPJ e ao menos um dia de atendimento.");
    return;
  }

  if (!startTime || !endTime || timeToMinutes(startTime) >= timeToEndBoundaryMinutes(endTime)) {
    fail("Informe um horario valido. O fim pode ser 00:00 para representar meia-noite.");
    return;
  }

  button.disabled = true;
  button.textContent = "Criando...";
  message.textContent = "Criando seu acesso seguro...";
  message.style.color = "#555";

  const authClient = createStudentAccessAuthClient();
  const { data: authData, error: authError } =
    await authClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAppBaseUrlV4(),
        data: {
          name,
          role: "teacher",
          signup_source: "public",
          phone,
          cpf,
          pix,
          cnpj,
          work_start_time: startTime,
          work_end_time: endTime,
          work_days: workDays
        }
      }
    });

  if (authError || !authData?.user?.id) {
    fail(authError?.message || "Nao foi possivel criar o acesso.");
    button.disabled = false;
    button.textContent = "Criar acesso gratuito";
    return;
  }

  if (!authData.session) {
    event.target.reset();
    message.textContent = "Enviamos um e-mail de confirmacao. Clique no botao da mensagem para ativar o acesso e iniciar os 15 dias gratuitos.";
    message.style.color = "green";
    button.disabled = false;
    button.textContent = "Criar acesso gratuito";
    return;
  }

  const { error: profileError } =
    await authClient.rpc(
      "register_public_teacher_from_auth_v2",
      {
        p_name: name,
        p_email: email,
        p_phone: phone,
        p_cpf: cpf,
        p_pix: pix,
        p_cnpj: cnpj,
        p_work_start_time: startTime,
        p_work_end_time: endTime,
        p_work_days: workDays
      }
    );

  if (profileError) {
    fail(profileError.message || "O acesso foi criado, mas o perfil nao pode ser finalizado.");
    button.disabled = false;
    button.textContent = "Criar acesso gratuito";
    return;
  }

  await authClient.auth.signOut();
  event.target.reset();
  message.textContent = "Cadastro concluido. Entre com seu e-mail e senha para iniciar os 15 dias gratuitos.";
  message.style.color = "green";
  button.disabled = false;
  button.textContent = "Criar acesso gratuito";
}


function openPublicSupportV2() {
  const card = document.getElementById("publicSupportCard");
  if (!card) return;

  card.innerHTML = `
    <h2>Falar com o suporte</h2>
    <form id="publicSupportForm" class="support-form">
      <label>Nome</label><input id="publicSupportName" type="text" minlength="2" maxlength="120" required>
      <label>E-mail para contato</label><input id="publicSupportEmail" type="email" maxlength="254" required>
      <label>Assunto</label><input id="publicSupportSubject" type="text" minlength="3" maxlength="160" required>
      <label>Mensagem</label><textarea id="publicSupportMessageText" rows="5" minlength="2" maxlength="4000" required></textarea>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;">
        <button type="submit" class="primary-button">Enviar mensagem</button>
        <button type="button" class="secondary-button" id="closePublicSupportButton">Cancelar</button>
      </div>
      <p id="publicSupportMessage" class="message"></p>
    </form>
  `;

  setPublicCardV2("publicSupportCard");
  document.getElementById("closePublicSupportButton")
    .addEventListener("click", () => setPublicCardV2(""));
  document.getElementById("publicSupportForm")
    .addEventListener("submit", savePublicSupportV2);
}


async function savePublicSupportV2(event) {
  event.preventDefault();
  const get = id => document.getElementById(id)?.value.trim() || "";
  const messageArea = document.getElementById("publicSupportMessage");

  const { data, error } = await supabaseClient.functions.invoke(
    "public-support",
    { body: {
      name: get("publicSupportName"),
      email: get("publicSupportEmail").toLowerCase(),
      subject: get("publicSupportSubject"),
      message: get("publicSupportMessageText")
    } }
  );

  if (error) {
    messageArea.textContent = data?.error || error.message || "Nao foi possivel enviar a mensagem.";
    messageArea.style.color = "red";
    return;
  }

  event.target.reset();
  messageArea.textContent = "Mensagem enviada. O suporte respondera pelo e-mail informado.";
  messageArea.style.color = "green";
}


async function showTeacherSupportOnlyArea() {
  loginScreen.classList.add("hidden");
  teacherScreen.classList.remove("hidden");
  studentScreen.classList.add("hidden");

  ensureTeacherSupportNavButton();

  document.querySelectorAll("[data-teacher-page]")
    .forEach(button => {
      button.style.display =
        button.dataset.teacherPage === "support" ? "" : "none";
    });

  const header = document.getElementById("teacherHeader");
  if (header) {
    header.innerHTML = `
      <h2>Ola, ${escapeHtml(currentProfile.name)}</h2>
      <p>Seu periodo gratuito terminou. O acesso normal volta quando o pagamento for confirmado.</p>
    `;
  }

  setTeacherPage("support");
}


function renderSupportMessagesV2(messages) {
  return (messages || []).map(item => `
    <div class="support-message ${item.author_role === "admin" ? "admin" : ""}">
      <strong>${item.author_role === "admin" ? "Suporte" : "Professor"}</strong>
      <div>${escapeHtml(item.body)}</div>
      <small>${formatDateTime(item.created_at)}</small>
    </div>
  `).join("");
}


async function loadTeacherSupportArea() {
  const area = document.getElementById("teacherSupportArea");
  if (!area) return;

  const { data, error } = await supabaseClient.rpc(
    "get_my_support_tickets_v4"
  );

  if (error) {
    area.innerHTML = `<p>${escapeHtml(error.message || "Nao foi possivel carregar o suporte.")}</p>`;
    return;
  }

  const tickets = data || [];
  const activeTickets = tickets.filter(ticket => ticket.status !== "closed");
  const archivedTickets = tickets.filter(ticket => ticket.status === "closed");
  const renderTeacherTicketV4 = (ticket, archived) => `
    <div style="padding:14px;border:1px solid #ddd;border-radius:10px;">
      <strong>${escapeHtml(ticket.subject)}</strong>
      <span style="margin-left:8px;">${archived ? "Arquivado" : escapeHtml(ticket.status)}</span>
      <div class="support-thread">${renderSupportMessagesV2(ticket.messages)}</div>
      ${archived ? `
        <p style="margin-bottom:0;color:#666;">Este chamado foi encerrado e esta disponivel somente para consulta.</p>
      ` : `
        <textarea id="teacherSupportReply-${ticket.ticket_id}" rows="2" placeholder="Responder..."></textarea>
        <button type="button" class="secondary-button teacher-support-reply-button" data-ticket-id="${ticket.ticket_id}" style="margin-top:8px;">Responder</button>
      `}
    </div>
  `;

  area.innerHTML = `
    <div class="support-form">
      <label>Assunto</label><input id="teacherSupportSubject" type="text">
      <label>Mensagem</label><textarea id="teacherSupportNewMessage" rows="4"></textarea>
      <button type="button" class="action-button" id="createTeacherSupportTicketButton" style="margin-top:10px;">Enviar novo chamado</button>
      <p id="teacherSupportFormMessage"></p>
    </div>

    <h4 style="margin:22px 0 10px;">Em atendimento</h4>
    <div style="display:grid;gap:14px;">
      ${activeTickets.map(ticket => renderTeacherTicketV4(ticket, false)).join("") || "<p>Nenhum chamado em atendimento.</p>"}
    </div>

    <details style="margin-top:22px;">
      <summary><strong>Arquivo (${archivedTickets.length})</strong></summary>
      <div style="display:grid;gap:14px;margin-top:12px;">
        ${archivedTickets.map(ticket => renderTeacherTicketV4(ticket, true)).join("") || "<p>Nenhum chamado arquivado.</p>"}
      </div>
    </details>
  `;

  document.getElementById("createTeacherSupportTicketButton")
    .addEventListener("click", createTeacherSupportTicketV2);

  document.querySelectorAll(".teacher-support-reply-button")
    .forEach(button => button.addEventListener(
      "click",
      () => replyTeacherSupportTicketV2(button.dataset.ticketId)
    ));
}


async function createTeacherSupportTicketV2() {
  const subject = document.getElementById("teacherSupportSubject")?.value.trim() || "";
  const message = document.getElementById("teacherSupportNewMessage")?.value.trim() || "";
  const area = document.getElementById("teacherSupportFormMessage");

  const { error } = await supabaseClient.rpc(
    "create_support_ticket_v2",
    { p_subject: subject, p_message: message }
  );

  if (error) {
    area.textContent = error.message || "Nao foi possivel enviar o chamado.";
    area.style.color = "red";
    return;
  }

  await loadTeacherSupportArea();
}


async function replyTeacherSupportTicketV2(ticketId) {
  const input = document.getElementById(`teacherSupportReply-${ticketId}`);
  const message = input?.value.trim() || "";
  if (!message) return;

  const { error } = await supabaseClient.rpc(
    "reply_support_ticket_v2",
    { p_ticket_id: ticketId, p_message: message }
  );

  if (error) {
    alert(error.message || "Nao foi possivel responder.");
    return;
  }

  await loadTeacherSupportArea();
}


async function loadAdminSupportArea(append = false) {
  const area = document.getElementById("adminSupportArea");
  if (!area) return;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_support_tickets_page_v4",
    {
      p_archived: adminSupportViewV4 === "archived",
      p_limit: 50,
      p_before: append ? adminSupportBeforeV3 : null
    }
  );

  if (error) {
    area.innerHTML = `<p>${escapeHtml(error.message || "Nao foi possivel carregar os chamados.")}</p>`;
    return;
  }

  adminSupportTicketsV3 = append
    ? [...adminSupportTicketsV3, ...(data || [])]
    : (data || []);
  adminSupportBeforeV3 = adminSupportTicketsV3.length
    ? adminSupportTicketsV3[adminSupportTicketsV3.length - 1].updated_at
    : null;

  area.innerHTML = `
    <div style="display:grid;gap:14px;">
      ${adminSupportTicketsV3.map(ticket => `
        <div style="padding:14px;border:1px solid #ddd;border-radius:10px;">
          <strong>${escapeHtml(ticket.subject)}</strong>
          <div>${escapeHtml(ticket.contact_name)} - ${escapeHtml(ticket.contact_email)}</div>
          <small>${escapeHtml(ticket.source)} | ${escapeHtml(ticket.status)}</small>
          <div class="support-thread">${renderSupportMessagesV2(ticket.messages)}</div>
          ${adminSupportViewV4 === "archived" ? `
            <p style="margin-bottom:0;color:#666;">Encerrado e disponivel somente para consulta.</p>
          ` : `
            <textarea id="adminSupportReply-${ticket.ticket_id}" rows="2" placeholder="Responder..."></textarea>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
              <button type="button" class="secondary-button admin-support-reply-button" data-ticket-id="${ticket.ticket_id}">Responder</button>
              <button type="button" class="secondary-button admin-support-close-button" data-ticket-id="${ticket.ticket_id}">Encerrar e arquivar</button>
            </div>
          `}
        </div>
      `).join("") || `<p>Nenhum chamado ${adminSupportViewV4 === "archived" ? "arquivado" : "em atendimento"}.</p>`}
      ${(data || []).length === 50 ? '<button type="button" class="secondary-button" id="loadOlderAdminSupportV3">Carregar chamados anteriores</button>' : ''}
    </div>
  `;

  document.querySelectorAll(".admin-support-reply-button")
    .forEach(button => button.addEventListener(
      "click",
      () => replyAdminSupportTicketV2(button.dataset.ticketId)
    ));

  document.querySelectorAll(".admin-support-close-button")
    .forEach(button => button.addEventListener(
      "click",
      () => closeAdminSupportTicketV2(button.dataset.ticketId)
    ));

  document.getElementById("loadOlderAdminSupportV3")
    ?.addEventListener("click", () => loadAdminSupportArea(true));
}


async function replyAdminSupportTicketV2(ticketId) {
  const message = document.getElementById(`adminSupportReply-${ticketId}`)?.value.trim() || "";
  if (!message) return;

  const { error } = await supabaseClient.rpc(
    "reply_support_ticket_v2",
    { p_ticket_id: ticketId, p_message: message }
  );

  if (error) {
    alert(error.message || "Nao foi possivel responder.");
    return;
  }

  await loadAdminSupportArea();
}


async function closeAdminSupportTicketV2(ticketId) {
  if (!window.confirm("Encerrar este chamado? Depois disso ele ficara somente para leitura no arquivo.")) return;

  const { error } = await supabaseClient.rpc(
    "set_support_ticket_status_v2",
    { p_ticket_id: ticketId, p_status: "closed" }
  );

  if (error) {
    alert(error.message || "Nao foi possivel encerrar o chamado.");
    return;
  }

  await loadAdminSupportArea(false);
}


async function loadAdminPrivacyRequestsV3() {
  const area = document.getElementById("adminPrivacyRequestsV3");
  if (!area) return;

  const { data, error } = await supabaseClient.rpc(
    "get_admin_privacy_requests_v3"
  );

  if (error) {
    area.innerHTML = `<p>${escapeHtml(error.message || "Nao foi possivel carregar as solicitacoes.")}</p>`;
    return;
  }

  const requestLabels = {
    export: "Exportacao",
    correction: "Correcao",
    deletion: "Exclusao"
  };

  area.innerHTML = `
    <div style="display:grid;gap:14px;">
      ${(data || []).map(request => `
        <div style="padding:14px;border:1px solid #ddd;border-radius:10px;">
          <strong>${escapeHtml(requestLabels[request.request_type] || request.request_type)}</strong>
          <div>${escapeHtml(request.profile_name)} - ${escapeHtml(request.profile_email)}</div>
          <small>${escapeHtml(request.profile_role)} | ${new Date(request.created_at).toLocaleString("pt-BR")}</small>
          <textarea id="adminPrivacyNotes-${request.request_id}" rows="2" maxlength="2000" placeholder="Notas internas" style="margin-top:10px;">${escapeHtml(request.notes || "")}</textarea>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px;">
            <select id="adminPrivacyStatus-${request.request_id}">
              <option value="open" ${request.status === "open" ? "selected" : ""}>Aberta</option>
              <option value="processing" ${request.status === "processing" ? "selected" : ""}>Em andamento</option>
              <option value="completed" ${request.status === "completed" ? "selected" : ""}>Concluida</option>
              <option value="rejected" ${request.status === "rejected" ? "selected" : ""}>Recusada</option>
            </select>
            <button type="button" class="secondary-button admin-privacy-save-v3" data-request-id="${request.request_id}">Salvar andamento</button>
          </div>
        </div>
      `).join("") || "<p>Nenhuma solicitacao recebida.</p>"}
    </div>
  `;

  document.querySelectorAll(".admin-privacy-save-v3")
    .forEach(button => button.addEventListener(
      "click",
      () => saveAdminPrivacyRequestV3(button.dataset.requestId)
    ));
}


async function saveAdminPrivacyRequestV3(requestId) {
  const status = document.getElementById(`adminPrivacyStatus-${requestId}`)?.value || "open";
  const notes = document.getElementById(`adminPrivacyNotes-${requestId}`)?.value.trim() || null;
  const { error } = await supabaseClient.rpc(
    "admin_update_privacy_request_v3",
    { p_request_id: requestId, p_status: status, p_notes: notes }
  );

  if (error) {
    alert(error.message || "Nao foi possivel atualizar a solicitacao.");
    return;
  }

  await loadAdminPrivacyRequestsV3();
}


async function saveNewStudentWithAccessV2() {
  const value = id => document.getElementById(id)?.value || "";
  const name = value("newStudentName").trim();
  const email = value("newStudentEmail").trim().toLowerCase();
  const phone = value("newStudentPhone").trim();
  const cpf = normalizeDigitsV2(value("newStudentCpf"));
  const classLink = value("newStudentClassLink").trim();
  const password = value("newStudentPassword");
  const confirmPassword = value("newStudentPasswordConfirm");
  const duration = Number(value("newStudentDuration"));
  const birthDate = value("newStudentBirthDate");
  const contractStartDate = value("newStudentContractStartDate");
  const contractEndDate = value("newStudentContractEndDate");
  const contractNotes = value("newStudentContractNotes").trim() || null;
  const billingType = value("newStudentBillingType");
  const monthlyFee = value("newStudentMonthlyFee") === "" ? null : Number(value("newStudentMonthlyFee"));
  const lessonFee = value("newStudentLessonFee") === "" ? null : Number(value("newStudentLessonFee"));
  const dueDay = Number(value("newStudentDueDay"));
  const invoiceRequired = Boolean(document.getElementById("newStudentInvoiceDefault")?.checked);
  const scheduleResult = collectStudentFixedSchedule("newStudentFixedScheduleRows");
  const message = document.getElementById("newStudentMessage");
  const button = document.getElementById("saveNewStudentButton");

  const fail = text => {
    message.textContent = text;
    message.style.color = "red";
  };

  if (name.length < 3 || !isValidEmailV2(email) || !isValidCpfV2(cpf)) {
    fail("Informe nome, e-mail e CPF validos.");
    return;
  }

  if (normalizeDigitsV2(phone).length < 10 || !/^https?:\/\//i.test(classLink)) {
    fail("Informe telefone com DDD e um link de aula valido.");
    return;
  }

  if (password.length < 6 || password !== confirmPassword) {
    fail("A senha deve ter ao menos 6 caracteres e as senhas devem coincidir.");
    return;
  }

  if (![30, 60].includes(duration) || !birthDate || !contractStartDate || !contractEndDate) {
    fail("Preencha duracao, nascimento e o periodo completo do contrato.");
    return;
  }

  if (contractEndDate < contractStartDate || scheduleResult.error) {
    fail(scheduleResult.error || "O termino do contrato deve ser posterior ao inicio.");
    return;
  }

  if (!['monthly', 'per_lesson'].includes(billingType) || dueDay < 1 || dueDay > 31) {
    fail("Preencha corretamente a cobranca e o vencimento.");
    return;
  }

  if ((billingType === "monthly" && !(monthlyFee >= 0)) ||
      (billingType === "per_lesson" && !(lessonFee >= 0))) {
    fail("Informe o valor financeiro do aluno.");
    return;
  }

  const { data: capacityData, error: capacityError } = await supabaseClient.rpc(
    "get_my_teacher_student_capacity_v2"
  );
  const capacity = Array.isArray(capacityData) ? capacityData[0] : capacityData;

  if (capacityError || capacity?.can_add_student === false) {
    fail(capacityError?.message || `O limite de ${capacity?.max_registered_students || 0} alunos cadastrados foi atingido.`);
    return;
  }

  button.disabled = true;
  button.textContent = "Criando acesso...";

  const params = {
    name,
    email,
    phone,
    cpf,
    password,
    class_duration_minutes: duration,
    schedule: scheduleResult.schedule,
    billing_type: billingType,
    monthly_fee: monthlyFee,
    lesson_fee: lessonFee,
    payment_due_day: dueDay,
    invoice_required_default: invoiceRequired,
    birth_date: birthDate,
    contract_start_date: contractStartDate,
    contract_end_date: contractEndDate,
    contract_notes: contractNotes,
    class_link: classLink
  };

  const provision = await supabaseClient.functions.invoke(
    "provision-users",
    { body: { kind: "student", student: params } }
  );
  const provisionItem = provision.data?.results?.[0];
  const result = {
    error:
      provision.error ||
      (!provisionItem?.ok
        ? { message: provisionItem?.error || provision.data?.error || "Nao foi possivel concluir o cadastro." }
        : null)
  };

  if (result.error) {
    fail(result.error.message || "Nao foi possivel concluir o cadastro.");
    button.disabled = false;
    button.textContent = "Criar aluno e acesso";
    return;
  }

  closeRegisterStudentForm();
  currentTeacherStudents = [];
  await loadTeacherStudents();
  await loadTeacherStudentOverview();
  alert(
    provisionItem.confirmation_sent === false
      ? "Aluno cadastrado, mas o e-mail de confirmacao nao pode ser enviado agora. Ele pode usar 'Reenviar confirmacao de e-mail' na entrada."
      : "Aluno cadastrado. O acesso sera liberado depois que ele confirmar o e-mail."
  );
}


async function saveAdminTeacherV2() {
  const value = id => document.getElementById(id)?.value || "";
  const name = value("adminNewTeacherName").trim();
  const email = value("adminNewTeacherEmail").trim().toLowerCase();
  const password = value("adminNewTeacherPassword");
  const confirmPassword = value("adminNewTeacherPasswordConfirm");
  const phone = value("adminNewTeacherPhone").trim();
  const cpf = normalizeDigitsV2(value("adminNewTeacherCpf"));
  const pix = value("adminNewTeacherPix").trim();
  const cnpj = normalizeDigitsV2(value("adminNewTeacherCnpj"));
  const startTime = value("adminNewTeacherStart");
  const endTime = value("adminNewTeacherEnd");
  const workDays = collectCheckedDaysV2("adminNewTeacherWorkDay");
  const accessType = value("adminNewTeacherAccessType");
  const message = document.getElementById("adminTeacherRegistrationMessage");
  const button = document.getElementById("saveAdminTeacherButton");

  const fail = text => {
    message.textContent = text;
    message.style.color = "red";
  };

  if (name.length < 3 || !isValidEmailV2(email) || !isValidCpfV2(cpf) || normalizeDigitsV2(phone).length < 10) {
    fail("Informe nome, e-mail, telefone e CPF validos.");
    return;
  }

  if (password.length < 6 || password !== confirmPassword || !pix || cnpj.length !== 14) {
    fail("Preencha senhas iguais, PIX e CNPJ.");
    return;
  }

  if (!startTime || !endTime || timeToMinutes(startTime) >= timeToEndBoundaryMinutes(endTime) || workDays.length === 0) {
    fail("Informe horarios e dias de atendimento validos.");
    return;
  }

  button.disabled = true;
  button.textContent = "Criando...";

  const authClient = createStudentAccessAuthClient();
  const { data: authData, error: authError } = await authClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAppBaseUrlV4(),
      data: { name, role: "teacher" }
    }
  });

  const rpcParams = {
    p_name: name,
    p_email: email,
    p_pix: pix,
    p_cnpj: cnpj,
    p_work_start_time: startTime,
    p_work_end_time: endTime
  };

  let teacherId = null;
  const authUser = authData?.user;
  const existingAccess = authError || (Array.isArray(authUser?.identities) && authUser.identities.length === 0);
  let registrationResult;

  if (existingAccess) {
    registrationResult = await supabaseClient.rpc("recover_teacher_from_auth_email", rpcParams);
  } else if (authUser?.id) {
    registrationResult = await supabaseClient.rpc(
      "register_teacher_from_auth",
      { p_auth_user_id: authUser.id, ...rpcParams }
    );
  } else {
    registrationResult = { error: authError || { message: "O acesso nao foi criado." } };
  }

  if (registrationResult.error) {
    fail(registrationResult.error.message || "Nao foi possivel criar o professor.");
    button.disabled = false;
    button.textContent = "Criar professor";
    return;
  }

  await loadAdminTeachers();
  teacherId = currentAdminTeachers.find(item =>
    String(item.teacher_email || "").toLowerCase() === email
  )?.teacher_id;

  if (!teacherId) {
    fail("O professor foi criado, mas nao foi localizado para finalizar o perfil.");
    button.disabled = false;
    button.textContent = "Criar professor";
    return;
  }

  const { error: updateError } = await supabaseClient.rpc(
    "admin_update_teacher_v2",
    {
      p_teacher_id: teacherId,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_cpf: cpf,
      p_pix: pix,
      p_cnpj: cnpj,
      p_work_start_time: startTime,
      p_work_end_time: endTime,
      p_work_days: workDays,
      p_access_type: accessType
    }
  );

  button.disabled = false;
  button.textContent = "Criar professor";

  if (updateError) {
    fail(updateError.message || "O acesso foi criado, mas os dados adicionais falharam.");
    return;
  }

  await authClient.auth.signOut();
  document.getElementById("adminTeacherRegistrationArea").style.display = "none";
  await loadAdminTeachers();
  alert("Professor cadastrado. O acesso sera liberado depois que ele confirmar o e-mail.");
}


async function saveAdminTeacherAccessV2(teacherId) {
  const select = document.querySelector(`.admin-teacher-access-type[data-teacher-id="${teacherId}"]`);
  if (!select) return;

  const { error } = await supabaseClient.rpc(
    "admin_set_teacher_access_v2",
    { p_teacher_id: teacherId, p_access_type: select.value }
  );

  if (error) {
    alert(error.message || "Nao foi possivel alterar o acesso.");
    return;
  }

  await loadAdminTeachers();
}


function openAdminTeacherEditV2(teacherId) {
  const teacher = currentAdminTeachers.find(item => String(item.teacher_id) === String(teacherId));
  const area = document.getElementById(`adminTeacherEditArea-${teacherId}`);
  if (!teacher || !area) return;

  area.style.display = "block";
  area.innerHTML = `
    <div class="erp-form-grid">
      <div><label>Nome</label><input id="editTeacherName-${teacherId}" value="${escapeHtml(teacher.teacher_name)}"></div>
      <div><label>E-mail</label><input id="editTeacherEmail-${teacherId}" type="email" value="${escapeHtml(teacher.teacher_email)}"></div>
      <div><label>Telefone</label><input id="editTeacherPhone-${teacherId}" value="${escapeHtml(teacher.phone || "")}"></div>
      <div><label>CPF</label><input id="editTeacherCpf-${teacherId}" value="${escapeHtml(teacher.cpf || "")}"></div>
      <div><label>PIX</label><input id="editTeacherPix-${teacherId}" value="${escapeHtml(teacher.pix || "")}"></div>
      <div><label>CNPJ</label><input id="editTeacherCnpj-${teacherId}" value="${escapeHtml(teacher.cnpj || "")}"></div>
      <div><label>Inicio</label><input id="editTeacherStart-${teacherId}" type="time" step="1800" value="${normalizeTime(teacher.work_start_time)}"></div>
      <div><label>Fim</label><input id="editTeacherEnd-${teacherId}" type="time" step="1800" value="${normalizeTime(teacher.work_end_time)}"></div>
      <div class="full-width"><label>Dias de atendimento</label>${renderWeekdayCheckboxesV2(`editTeacherWorkDay-${teacherId}`, teacher.work_days || [])}</div>
    </div>
    <button type="button" class="action-button" id="saveTeacherEdit-${teacherId}" style="margin-top:12px;">Salvar cadastro</button>
  `;

  document.getElementById(`saveTeacherEdit-${teacherId}`)
    .addEventListener("click", () => saveAdminTeacherEditV2(teacherId));
}


async function saveAdminTeacherEditV2(teacherId) {
  const teacher = currentAdminTeachers.find(item => String(item.teacher_id) === String(teacherId));
  const value = prefix => document.getElementById(`${prefix}-${teacherId}`)?.value || "";
  const params = {
    p_teacher_id: teacherId,
    p_name: value("editTeacherName").trim(),
    p_email: value("editTeacherEmail").trim().toLowerCase(),
    p_phone: value("editTeacherPhone").trim(),
    p_cpf: normalizeDigitsV2(value("editTeacherCpf")),
    p_pix: value("editTeacherPix").trim(),
    p_cnpj: normalizeDigitsV2(value("editTeacherCnpj")),
    p_work_start_time: value("editTeacherStart"),
    p_work_end_time: value("editTeacherEnd"),
    p_work_days: collectCheckedDaysV2(`editTeacherWorkDay-${teacherId}`),
    p_access_type: teacher.access_type || "paid"
  };

  if (
    params.p_name.length < 3 ||
    !isValidCpfV2(params.p_cpf) ||
    !isValidEmailV2(params.p_email) ||
    normalizeDigitsV2(params.p_phone).length < 10 ||
    !params.p_pix ||
    params.p_cnpj.length !== 14 ||
    params.p_work_days.length === 0 ||
    !params.p_work_start_time ||
    !params.p_work_end_time ||
    timeToMinutes(params.p_work_start_time) >=
      timeToEndBoundaryMinutes(params.p_work_end_time)
  ) {
    alert("Preencha todos os dados obrigatorios com valores validos.");
    return;
  }

  if (
    params.p_email !==
    String(teacher.teacher_email || "").toLowerCase()
  ) {
    const emailResult = await updateUserEmailV2(
      teacher.profile_id,
      params.p_email
    );

    if (emailResult.error) {
      alert(emailResult.error);
      return;
    }
  }

  const { error } = await supabaseClient.rpc("admin_update_teacher_v2", params);
  if (error) {
    alert(error.message || "Nao foi possivel salvar o professor.");
    return;
  }

  await loadAdminTeachers();
}


async function sendAdminTeacherPasswordResetV2(email) {
  if (!email) return;

  const confirmed = window.confirm(
    `Enviar um e-mail de redefinicao de senha para ${email}?`
  );
  if (!confirmed) return;

  const { error } = await supabaseClient.auth.resetPasswordForEmail(
    email,
    { redirectTo: getAppBaseUrlV4() }
  );

  if (error) {
    alert(error.message || "Nao foi possivel enviar a redefinicao.");
    return;
  }

  alert("E-mail de redefinicao enviado.");
}


async function saveTeacherStudentPersonalDataV2(studentId) {
  const value = id => document.getElementById(id)?.value.trim() || "";
  const name = value("teacherStudentPersonalName");
  const emailInput = document.getElementById("teacherStudentPersonalEmail");
  const email = value("teacherStudentPersonalEmail").toLowerCase();
  const phone = value("teacherStudentPersonalPhone");
  const cpf = normalizeDigitsV2(value("teacherStudentPersonalCpf"));
  const message = document.getElementById("teacherStudentPersonalMessage");

  if (name.length < 3 || !isValidEmailV2(email) || !isValidCpfV2(cpf) || normalizeDigitsV2(phone).length < 10) {
    message.textContent = "Informe nome, e-mail, telefone e CPF validos.";
    message.style.color = "red";
    return;
  }

  const originalEmail =
    String(emailInput?.dataset.originalEmail || "").toLowerCase();

  if (email !== originalEmail) {
    const emailResult = await updateUserEmailV2(
      emailInput?.dataset.profileId,
      email
    );

    if (emailResult.error) {
      message.textContent = emailResult.error;
      message.style.color = "red";
      return;
    }
  }

  const { error } = await supabaseClient.rpc(
    "save_teacher_student_personal_data_v2",
    {
      p_student_id: studentId,
      p_name: name,
      p_email: email,
      p_phone: phone,
      p_cpf: cpf
    }
  );

  if (error) {
    message.textContent = error.message || "Nao foi possivel salvar os dados.";
    message.style.color = "red";
    return;
  }

  message.textContent = "Dados pessoais atualizados.";
  message.style.color = "green";
  await loadTeacherStudentOverview();
}


async function updateUserEmailV2(userId, email) {
  if (!userId) {
    return { error: "Nao foi possivel identificar o acesso Auth." };
  }

  const { data, error } = await supabaseClient.functions.invoke(
    "update-user-email",
    {
      body: { userId, email }
    }
  );

  if (error || data?.error) {
    return {
      error:
        data?.error ||
        error?.message ||
        "Nao foi possivel atualizar o e-mail de login."
    };
  }

  return { error: null };
}


const openPublicTeacherRegistrationButtonV2 =
  document.getElementById("openPublicTeacherRegistrationButton");
if (openPublicTeacherRegistrationButtonV2) {
  openPublicTeacherRegistrationButtonV2.addEventListener(
    "click",
    openPublicTeacherRegistrationV2
  );
}

const openPublicSupportButtonV2 =
  document.getElementById("openPublicSupportButton");
if (openPublicSupportButtonV2) {
  openPublicSupportButtonV2.addEventListener(
    "click",
    openPublicSupportV2
  );
}


// =====================================================
// EXPANSAO V3: FERRAMENTAS, IMPORTACAO, RELATORIOS E LGPD
// =====================================================

const LEGAL_VERSION_V3 = "2026-08-26";

function safeHrefV3(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return "#";
    return escapeHtml(url.href);
  } catch {
    return "#";
  }
}

function ensureTeacherToolsNavButtonV3() {
  if (document.querySelector('[data-teacher-page="tools"]')) return;
  const navigation = document.getElementById("teacherNavigation");
  const firstButton = document.querySelector("[data-teacher-page]");
  if (!navigation || !firstButton) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = firstButton.className;
  button.dataset.teacherPage = "tools";
  button.textContent = "Ferramentas";
  button.addEventListener("click", () => setTeacherPage("tools"));
  navigation.appendChild(button);
}

function renderTeacherToolsPageV3(content) {
  if (!content) return;
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const options = (currentTeacherStudents || []).map(student => {
    const id = student.student_id || student.id;
    const name = student.student_name || student.name || "Aluno";
    return `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`;
  }).join("");

  content.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <h3>Recursos do perfil</h3>
      <p>Importacoes, relatorios e opcoes relacionadas aos seus dados.</p>
    </div>

    <div class="v3-tools-grid">
      <section class="card v3-tool-card">
        <h3>Importar alunos por CSV</h3>
        <p>Importe ate 200 alunos por lote. Contas existentes nunca sao vinculadas automaticamente.</p>
        <div class="v3-actions">
          <button type="button" class="secondary-button" id="downloadStudentCsvTemplateV3">Baixar modelo</button>
          <label class="secondary-button v3-file-label">Escolher CSV<input type="file" id="studentCsvFileV3" accept=".csv,text/csv" hidden></label>
          <button type="button" class="action-button" id="importStudentsCsvV3" disabled>Importar alunos</button>
        </div>
        <div id="studentCsvPreviewV3" class="v3-result"></div>
      </section>

      <section class="card v3-tool-card">
        <h3>Relatorio mensal operacional</h3>
        <p>Aulas, presencas, faltas, cancelamentos, reposicoes e resumo dos seus registros financeiros.</p>
        <div class="v3-actions">
          <input type="month" id="monthlyOperationsMonthV3" value="${month}">
          <button type="button" class="action-button" id="loadMonthlyOperationsV3">Gerar resumo</button>
        </div>
        <div id="monthlyOperationsResultV3" class="v3-result"></div>
      </section>

      <section class="card v3-tool-card">
        <h3>Exportacao para contador</h3>
        <p>Baixa em CSV os lancamentos que o professor registrou na Aulora. Nao cria cobrancas.</p>
        <div class="v3-actions">
          <input type="month" id="accountantExportMonthV3" value="${month}">
          <button type="button" class="action-button" id="exportAccountantCsvV3">Baixar CSV</button>
        </div>
      </section>

      <section class="card v3-tool-card v3-wide">
        <h3>Relatorio de evolucao do aluno</h3>
        <div class="v3-form-grid">
          <label>Aluno<select id="progressStudentV3"><option value="">Selecione</option>${options}</select></label>
          <label>Inicio<input type="date" id="progressStartV3"></label>
          <label>Fim<input type="date" id="progressEndV3"></label>
          <label>Modelo<select id="progressTemplateV3"><option value="complete">Completo</option><option value="concise">Resumo curto</option><option value="goals">Foco em metas</option></select></label>
          <label>Participacao (1-5)<input type="number" min="1" max="5" value="3" id="progressParticipationV3"></label>
          <label>Evolucao (1-5)<input type="number" min="1" max="5" value="3" id="progressEvolutionV3"></label>
        </div>
        <label>Pontos fortes<textarea id="progressStrengthsV3" maxlength="3000"></textarea></label>
        <label>Pontos a desenvolver<textarea id="progressImprovementsV3" maxlength="3000"></textarea></label>
        <label>Metas para o proximo periodo<textarea id="progressGoalsV3" maxlength="3000"></textarea></label>
        <label>Observacoes adicionais<textarea id="progressNotesV3" maxlength="3000"></textarea></label>
        <div class="v3-actions">
          <button type="button" class="action-button" id="saveProgressReportV3">Salvar relatorio</button>
          <button type="button" class="secondary-button" id="copyProgressReportV3">Copiar texto</button>
          <button type="button" class="secondary-button" id="printProgressReportV3">Imprimir</button>
        </div>
        <div id="progressReportResultV3" class="v3-result"></div>
      </section>

      <section class="card v3-tool-card v3-wide">
        <h3>Privacidade e seus dados</h3>
        <p>Consulte os <a href="terms.html" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="privacy.html" target="_blank" rel="noopener">Politica de Privacidade</a>.</p>
        <div class="v3-actions">
          <button type="button" class="secondary-button" id="acceptLegalV3">Registrar aceite</button>
          <button type="button" class="secondary-button" id="exportMyDataV3">Exportar meus dados</button>
          <button type="button" class="secondary-button" id="requestCorrectionV3">Solicitar correcao</button>
          <button type="button" class="danger-button" id="requestDeletionV3">Solicitar exclusao</button>
        </div>
        <div id="privacyResultV3" class="v3-result"></div>
      </section>
    </div>
  `;

  document.getElementById("downloadStudentCsvTemplateV3")?.addEventListener("click", downloadStudentCsvTemplateV3);
  document.getElementById("studentCsvFileV3")?.addEventListener("change", previewStudentCsvV3);
  document.getElementById("importStudentsCsvV3")?.addEventListener("click", importStudentsCsvV3);
  document.getElementById("loadMonthlyOperationsV3")?.addEventListener("click", loadMonthlyOperationsV3);
  document.getElementById("exportAccountantCsvV3")?.addEventListener("click", exportAccountantCsvV3);
  document.getElementById("saveProgressReportV3")?.addEventListener("click", saveProgressReportV3);
  document.getElementById("copyProgressReportV3")?.addEventListener("click", () => copyProgressReportV3(false));
  document.getElementById("printProgressReportV3")?.addEventListener("click", () => copyProgressReportV3(true));
  document.getElementById("acceptLegalV3")?.addEventListener("click", acceptLegalV3);
  document.getElementById("exportMyDataV3")?.addEventListener("click", exportMyDataV3);
  document.getElementById("requestCorrectionV3")?.addEventListener("click", () => requestPrivacyV3("correction"));
  document.getElementById("requestDeletionV3")?.addEventListener("click", () => requestPrivacyV3("deletion"));
  populateProgressStudentsV3();
}

async function populateProgressStudentsV3() {
  const select = document.getElementById("progressStudentV3");
  if (!select || select.options.length > 1) return;
  const { data, error } = await supabaseClient.rpc("get_teacher_students");
  if (error) return;
  select.innerHTML = `<option value="">Selecione</option>${(data || []).map(student => `<option value="${escapeHtml(student.student_id || student.id)}">${escapeHtml(student.student_name || student.name || "Aluno")}</option>`).join("")}`;
}

let parsedStudentCsvV3 = [];

function parseCsvV3(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field); if (row.some(value => String(value).trim())) rows.push(row); row = []; field = "";
    } else field += char;
  }
  row.push(field); if (row.some(value => String(value).trim())) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows.shift().map(value => String(value).trim().toLowerCase());
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, String(values[index] || "").trim()])));
}

function csvStudentToPayloadV3(row) {
  const billing = (row.tipo_cobranca || "monthly").toLowerCase();
  const amount = Number(String(row.valor || "0").replace(",", "."));
  const schedule = String(row.dias_horarios || "").split("|").filter(Boolean).map(value => {
    const [day, time] = value.split("@");
    return { day_of_week: Number(day), start_time: time };
  });
  return {
    name: row.nome, email: String(row.email || "").toLowerCase(), phone: row.telefone,
    cpf: normalizeDigitsV2(row.cpf), password: row.senha,
    class_duration_minutes: Number(row.duracao), schedule,
    billing_type: billing, monthly_fee: billing === "monthly" ? amount : null,
    lesson_fee: billing === "per_lesson" ? amount : null,
    payment_due_day: Number(row.vencimento), invoice_required_default: /^(sim|true|1)$/i.test(row.nota_fiscal || ""),
    birth_date: row.nascimento, contract_start_date: row.inicio_contrato,
    contract_end_date: row.fim_contrato, contract_notes: row.observacoes || null,
    class_link: row.link_aula
  };
}

function downloadBlobV3(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadStudentCsvTemplateV3() {
  const csv = "nome;email;telefone;cpf;senha;duracao;nascimento;inicio_contrato;fim_contrato;link_aula;tipo_cobranca;valor;vencimento;dias_horarios;nota_fiscal;observacoes\nMaria Silva;maria@exemplo.com;(11) 99999-9999;12345678909;Senha123;60;2000-01-15;2026-01-01;2026-12-31;https://meet.google.com/sala;monthly;350,00;10;2@09:00|4@09:00;nao;Nivel inicial";
  downloadBlobV3("modelo-importacao-alunos.csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
}

async function previewStudentCsvV3(event) {
  const area = document.getElementById("studentCsvPreviewV3");
  const button = document.getElementById("importStudentsCsvV3");
  try {
    const file = event.target.files?.[0];
    parsedStudentCsvV3 = file ? parseCsvV3(await file.text()).map(csvStudentToPayloadV3) : [];
    if (!parsedStudentCsvV3.length || parsedStudentCsvV3.length > 200) throw new Error("O arquivo deve conter de 1 a 200 alunos.");
    area.textContent = `${parsedStudentCsvV3.length} aluno(s) pronto(s) para validacao e importacao.`;
    button.disabled = false;
  } catch (error) {
    parsedStudentCsvV3 = []; button.disabled = true; area.textContent = error.message || "CSV invalido.";
  }
}

async function importStudentsCsvV3() {
  const area = document.getElementById("studentCsvPreviewV3");
  const button = document.getElementById("importStudentsCsvV3");
  if (!parsedStudentCsvV3.length) return;
  button.disabled = true; area.textContent = "Importando com seguranca...";
  const { data, error } = await supabaseClient.functions.invoke("provision-users", { body: { kind: "student", students: parsedStudentCsvV3 } });
  const results = data?.results || [];
  const successes = results.filter(item => item.ok).length;
  const failures = results.filter(item => !item.ok);
  const confirmationsPending = results.filter(item => item.ok && item.confirmation_sent === false);
  area.innerHTML = `<strong>${successes} importado(s); ${failures.length} nao importado(s).</strong>${confirmationsPending.length ? `<p>${confirmationsPending.length} e-mail(s) de confirmacao precisam ser reenviados pela tela de entrada.</p>` : ""}${failures.length ? `<ul>${failures.map(item => `<li>${escapeHtml(item.email || `linha ${item.index + 2}`)}: ${escapeHtml(item.error)}</li>`).join("")}</ul>` : ""}`;
  if (error) area.textContent = data?.error || error.message || "Falha na importacao.";
  button.disabled = false;
  currentTeacherStudents = [];
  await loadTeacherStudents();
}

async function loadOnboardingV3() {
  const area = document.getElementById("onboardingStepsV3"); if (!area) return;
  const { data, error } = await supabaseClient.rpc("get_my_onboarding_v3");
  if (error) { area.textContent = "A configuracao guiada sera liberada apos a atualizacao do banco."; return; }
  const state = data || {}; const steps = state.steps || {};
  const items = [
    ["profile", "Revisar perfil, dias e horarios"],
    ["rules", "Cadastrar regras de remarcacao"],
    ["students", "Cadastrar ou importar o primeiro aluno"],
    ["materials", "Adicionar um material de exemplo"],
    ["legal", "Ler e aceitar termos e privacidade"]
  ];
  area.innerHTML = items.map(([key,label]) => `<label><input type="checkbox" data-onboarding-v3="${key}" ${steps[key] ? "checked" : ""}> ${label}</label>`).join("") + `<button type="button" class="action-button" id="saveOnboardingV3">Salvar progresso</button>`;
  document.getElementById("saveOnboardingV3")?.addEventListener("click", saveOnboardingV3);
}

async function loadAgendaOnboardingV5() {
  const container = document.getElementById("teacherAgendaOnboardingV5");
  if (!container) return;

  const { data, error } = await supabaseClient.rpc("get_my_onboarding_v3");
  if (error || data?.completed_at) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  container.innerHTML = `
    <section class="card">
      <h3>Configuracao inicial</h3>
      <p>Conclua estes passos para deixar seu espaco na Aulora pronto. Este aviso desaparece quando todos forem marcados.</p>
      <div id="onboardingStepsV3" class="v3-check-list">Carregando...</div>
    </section>
  `;
  await loadOnboardingV3();
}

async function maybeStartOnboardingV3() {
  await loadAgendaOnboardingV5();
}

async function saveOnboardingV3() {
  const checks = [...document.querySelectorAll("[data-onboarding-v3]")];
  const steps = Object.fromEntries(checks.map(item => [item.dataset.onboardingV3, item.checked]));
  const completed = checks.every(item => item.checked);
  const { error } = await supabaseClient.rpc("save_my_onboarding_v3", { p_steps: steps, p_completed: completed });
  alert(error ? (error.message || "Nao foi possivel salvar.") : (completed ? "Configuracao inicial concluida." : "Progresso salvo."));
  if (!error) await loadAgendaOnboardingV5();
}

async function loadMonthlyOperationsV3() {
  const month = document.getElementById("monthlyOperationsMonthV3")?.value;
  const area = document.getElementById("monthlyOperationsResultV3");
  const { data, error } = await supabaseClient.rpc("get_my_monthly_operations_v3", { p_month: `${month}-01` });
  if (error) { area.textContent = error.message || "Nao foi possivel gerar o resumo."; return; }
  const a = data?.attendance || {};
  area.innerHTML = `<div class="v3-stat-grid">
    <span><strong>${data.registered_students || 0}</strong> cadastrados</span><span><strong>${data.active_students || 0}</strong> ativos</span><span><strong>${data.paused_students || 0}</strong> pausados</span>
    <span><strong>${data.lessons_total || 0}</strong> aulas</span><span><strong>${data.lessons_cancelled || 0}</strong> canceladas</span><span><strong>${data.makeups_created || 0}</strong> reposicoes criadas</span>
    <span><strong>${a.present || a.presente || 0}</strong> presencas</span><span><strong>${a.absent || a.falta || 0}</strong> faltas</span>
    <span><strong>${formatCurrency(Number(data.financial_expected || 0))}</strong> registrado</span><span><strong>${formatCurrency(Number(data.financial_paid || 0))}</strong> pago</span><span><strong>${formatCurrency(Number(data.financial_pending || 0))}</strong> pendente</span>
  </div>`;
}

function csvCellV3(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

async function exportAccountantCsvV3() {
  const value = document.getElementById("accountantExportMonthV3")?.value || "";
  const [year, month] = value.split("-").map(Number);
  const { data, error } = await supabaseClient.rpc("get_teacher_financial_records", { p_year: year, p_month: month, p_student_id: null });
  if (error) { alert(error.message || "Nao foi possivel exportar."); return; }
  const headers = ["aluno","competencia","vencimento","valor","desconto","status","pago_em","nota_fiscal","observacoes"];
  const lines = (data || []).map(item => [item.student_name, `${year}-${String(month).padStart(2,"0")}`, item.due_date, item.amount, item.discount, item.payment_status, item.paid_at, item.invoice_issued ? "sim" : "nao", item.notes].map(csvCellV3).join(";"));
  downloadBlobV3(`financeiro-contador-${value}.csv`, "\uFEFF" + [headers.join(";"), ...lines].join("\n"), "text/csv;charset=utf-8");
}

function progressReportTextV3() {
  const select = document.getElementById("progressStudentV3");
  const student = select?.options[select.selectedIndex]?.text || "Aluno";
  return `RELATORIO DE EVOLUCAO\nAluno: ${student}\nPeriodo: ${document.getElementById("progressStartV3")?.value || ""} a ${document.getElementById("progressEndV3")?.value || ""}\n\nParticipacao: ${document.getElementById("progressParticipationV3")?.value || "-"}/5\nEvolucao: ${document.getElementById("progressEvolutionV3")?.value || "-"}/5\n\nPontos fortes\n${document.getElementById("progressStrengthsV3")?.value || ""}\n\nPontos a desenvolver\n${document.getElementById("progressImprovementsV3")?.value || ""}\n\nMetas\n${document.getElementById("progressGoalsV3")?.value || ""}\n\nObservacoes\n${document.getElementById("progressNotesV3")?.value || ""}`;
}

async function saveProgressReportV3() {
  const params = {
    p_id: null, p_student_id: document.getElementById("progressStudentV3")?.value || null,
    p_period_start: document.getElementById("progressStartV3")?.value || null,
    p_period_end: document.getElementById("progressEndV3")?.value || null,
    p_template_type: document.getElementById("progressTemplateV3")?.value || "complete",
    p_ratings: { participation: Number(document.getElementById("progressParticipationV3")?.value), evolution: Number(document.getElementById("progressEvolutionV3")?.value) },
    p_strengths: document.getElementById("progressStrengthsV3")?.value || "",
    p_improvements: document.getElementById("progressImprovementsV3")?.value || "",
    p_goals: document.getElementById("progressGoalsV3")?.value || "",
    p_notes: document.getElementById("progressNotesV3")?.value || null
  };
  const { error } = await supabaseClient.rpc("save_student_progress_report_v3", params);
  const area = document.getElementById("progressReportResultV3"); area.textContent = error ? (error.message || "Nao foi possivel salvar.") : "Relatorio salvo.";
}

async function copyProgressReportV3(print) {
  const text = progressReportTextV3();
  if (!print) { await navigator.clipboard.writeText(text); alert("Relatorio copiado."); return; }
  const popup = window.open("", "_blank");
  popup.document.write(`<pre style="white-space:pre-wrap;font:16px Arial;padding:32px;">${escapeHtml(text)}</pre>`); popup.document.close(); popup.print();
}

async function acceptLegalV3() {
  const results = await Promise.all([
    supabaseClient.rpc("accept_legal_v3", { p_document_type: "terms", p_version: LEGAL_VERSION_V3 }),
    supabaseClient.rpc("accept_legal_v3", { p_document_type: "privacy", p_version: LEGAL_VERSION_V3 })
  ]);
  const error = results.find(item => item.error)?.error;
  document.getElementById("privacyResultV3").textContent = error ? error.message : "Aceite registrado.";
}

async function exportMyDataV3() {
  const { data, error } = await supabaseClient.rpc("export_my_data_v3");
  if (error) { document.getElementById("privacyResultV3").textContent = error.message; return; }
  downloadBlobV3(`meus-dados-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

async function requestPrivacyV3(type) {
  if (type === "deletion" && !window.confirm("Registrar solicitacao de exclusao? O pedido sera analisado antes de qualquer remocao.")) return;
  const { error } = await supabaseClient.rpc("create_my_privacy_request_v3", { p_request_type: type, p_notes: null });
  document.getElementById("privacyResultV3").textContent = error ? error.message : "Solicitacao registrada para analise.";
}

// Substitui o fluxo antigo de responsavel: uma conta existente so e vinculada
// quando a senha correta comprova a posse do acesso.
async function saveTeacherStudentGuardian(studentId) {
  const name = document.getElementById("newGuardianName")?.value.trim() || "";
  const email = document.getElementById("newGuardianEmail")?.value.trim().toLowerCase() || "";
  const password = document.getElementById("newGuardianPassword")?.value || "";
  const confirmPassword = document.getElementById("newGuardianPasswordConfirm")?.value || "";
  const button = document.getElementById("saveTeacherStudentGuardianButton");
  const message = document.getElementById("teacherStudentGuardianMessage");
  if (name.length < 3 || !isValidEmailV2(email) || password.length < 6 || password !== confirmPassword) {
    message.textContent = "Preencha nome, e-mail e senhas iguais com ao menos 6 caracteres."; message.style.color = "red"; return;
  }
  button.disabled = true; button.textContent = "Criando / vinculando...";
  const { data, error } = await supabaseClient.functions.invoke("provision-users", { body: { kind: "guardian", student_id: studentId, name, email, password } });
  button.disabled = false; button.textContent = "Criar / vincular acesso";
  if (error || data?.error) { message.textContent = data?.error || error.message || "Nao foi possivel vincular."; message.style.color = "red"; return; }
  await openTeacherStudentDetail(studentId);
  alert(
    data?.confirmation_sent === false
      ? "Responsavel cadastrado, mas o e-mail de confirmacao precisa ser reenviado pela tela de entrada."
      : "Responsavel cadastrado ou vinculado. Novos acessos so entram depois da confirmacao do e-mail."
  );
}


// =====================================================
// CONTROLES VISIVEIS PARA AGENDAS HORIZONTAIS
// =====================================================

function enhanceAuloraScheduleScrollers() {

  document
    .querySelectorAll(".schedule-wrapper")
    .forEach(wrapper => {

      if (wrapper.dataset.auloraScrollReady === "true") {
        return;
      }

      wrapper.dataset.auloraScrollReady = "true";

      const controls = document.createElement("div");
      controls.className = "aulora-schedule-scroll-controls";
      controls.innerHTML = `
        <span>Veja todos os dias</span>
        <button type="button" class="secondary-button" data-scroll-direction="left" aria-label="Rolar agenda para a esquerda">←</button>
        <button type="button" class="secondary-button" data-scroll-direction="right" aria-label="Rolar agenda para a direita">→</button>
      `;

      wrapper.parentElement?.insertBefore(controls, wrapper);

      const leftButton = controls.querySelector('[data-scroll-direction="left"]');
      const rightButton = controls.querySelector('[data-scroll-direction="right"]');

      const updateButtons = () => {
        const maxScroll = Math.max(0, wrapper.scrollWidth - wrapper.clientWidth);
        leftButton.disabled = wrapper.scrollLeft <= 2;
        rightButton.disabled = wrapper.scrollLeft >= maxScroll - 2;
        controls.classList.toggle("hidden", maxScroll <= 2);
      };

      controls.addEventListener("click", event => {
        const button = event.target.closest("button[data-scroll-direction]");
        if (!button) return;
        const direction = button.dataset.scrollDirection === "left" ? -1 : 1;
        wrapper.scrollBy({
          left: direction * Math.max(280, wrapper.clientWidth * 0.72),
          behavior: "smooth"
        });
      });

      wrapper.addEventListener("scroll", updateButtons, { passive: true });
      window.addEventListener("resize", updateButtons);
      requestAnimationFrame(updateButtons);

    });

}


const auloraScheduleObserver = new MutationObserver(() => {
  requestAnimationFrame(enhanceAuloraScheduleScrollers);
});

document.addEventListener("DOMContentLoaded", () => {
  enhanceAuloraScheduleScrollers();
  auloraScheduleObserver.observe(document.body, { childList: true, subtree: true });
});
