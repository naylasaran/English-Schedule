console.log(
  "ERP build: regras-remarcacao-professor-20260824"
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


// =====================================================
// CARREGAR PERFIL
// =====================================================

async function loadProfile(userId) {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_current_profile"
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

    loginMessage.textContent =
      "N\xe3o foi poss\xedvel carregar seu perfil.";

    return;
  }

  loginScreen.classList.add("hidden");


  if (
    currentProfile.role === "student"
  ) {

    await loadCurrentStudentId();


    if (!currentStudentId) {

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
        "Este acesso de aluno foi desativado.";

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
        "get_my_teacher_account"
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
      teacherAccount.account_status !==
        "active"
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
        teacherAccount &&
        teacherAccount.account_status ===
          "paused"

          ? "Este acesso de professor esta pausado pelo administrador."

          : "Este acesso de professor foi desativado.";


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

      button.style.display =
        "";

    });


  ensureStudentMaterialsNavButton();


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
      <p>\xc1rea do aluno.</p>
    `;

  }


  await loadStudentTeacherRescheduleRules();


  setStudentPage("agenda");
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
          border:1px solid #d9e3f2;
          border-radius:10px;
          background:#f7faff;
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
                background:#f7faff;
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
        border:1px solid #d9e3f2;
        border-radius:8px;
        background:#f7faff;
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
        border:1px solid #d9e3f2;
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


  await loadCurrentTeacherProfileSettings();


  const header =
    document.getElementById(
      "teacherHeader"
    );


  if (header) {

    header.innerHTML = `
      <h2>Ol\xe1, ${escapeHtml(currentProfile.name)}</h2>
      <p>\xc1rea do professor.</p>
    `;

  }


  setTeacherPage("agenda");
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

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_teacher_profile"
    );


  if (error) {

    console.warn(
      "Nao foi possivel carregar o perfil do professor:",
      error
    );


    currentTeacherProfileSettings = {
      work_start_time:
        "08:00",
      work_end_time:
        "20:00"
    };


    return currentTeacherProfileSettings;
  }


  currentTeacherProfileSettings =
    (
      Array.isArray(
        data
      )
        ? data[0]
        : data
    )
    || {
      work_start_time:
        "08:00",
      work_end_time:
        "20:00"
    };


  return currentTeacherProfileSettings;

}


// =====================================================
// HORARIO DENTRO DA JANELA DE ATENDIMENTO
// =====================================================

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
    timeToMinutes(
      settings.work_end_time ||
      "23:59"
    );


  const slotStart =
    timeToMinutes(
      startTime
    );


  const slotEnd =
    timeToMinutes(
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

    `;

  }


  renderAdminTeacherManagement();

  await loadAdminTeachers();

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
          background:#f7faff;
          border:1px solid #d9e3f2;
        "
      ></div>


      <div
        style="
          margin-top:18px;
          padding:14px;
          border-radius:9px;
          background:#eef5ff;
          border:1px solid #d9e3f2;
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
          background:#f7faff;
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
              Seguranca do ERP
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
              Integridade do ERP
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
              aqui o resultado antes de liberar o ERP.
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
        "No ADM, execute Seguranca do ERP.",
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
        "No ADM, execute Integridade do ERP.",
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
                  : "#f7faff"
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

            : "#f7faff"
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
          background:#f7faff;
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
        background:#f7faff;
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
                        background:#f7faff;
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
      saveAdminTeacher
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
    timeToMinutes(
      endTime
    )
  ) {

    showError(
      "Informe um horario de atendimento valido."
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
    systemFinancialResult
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
      )

    ]);


  if (
    teachersResult.error ||
    systemFinancialResult.error
  ) {

    console.error(
      "Erro ao carregar professores:",
      teachersResult.error ||
      systemFinancialResult.error
    );


    container.innerHTML = `

      <p>
        ${escapeHtml(
          (
            teachersResult.error ||
            systemFinancialResult.error
          ).message ||
          "Nao foi possivel carregar os professores."
        )}
      </p>

    `;


    return;
  }


  currentAdminTeacherSystemFinancial =
    systemFinancialResult.data || [];


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


          return {
            ...teacher,
            ...billing,
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
          background:#f7faff;
        "
      >
        Nenhum professor cadastrado.
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

      ${currentAdminTeachers
        .map(
          renderAdminTeacherCard
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".admin-teacher-status-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          changeAdminTeacherStatus(
            button.dataset.teacherId,
            button.dataset.status,
            button.dataset.teacherName
          );

        }
      );

    });


  document
    .querySelectorAll(
      ".save-admin-teacher-system-billing-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          saveAdminTeacherSystemBilling(
            button.dataset.teacherId
          );

        }
      );

    });

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
          <strong>Alunos ativos:</strong>
          ${Number(
            teacher.student_count || 0
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
          background:#f7faff;
          border:1px solid #d9e3f2;
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
        border-left:5px solid #2f6fed;
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
        href="${escapeHtml(
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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#f7faff;
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
        border:1px solid #d9e3f2;
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
                        background:#eef5ff;
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
          background:#eef5ff;
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
        border-left:5px solid #6f42c1;
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
            "#eadcf8";

          cell.style.color =
            "#6f42c1";

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
          "#dcecff",
        color:
          "#245a9a"
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
          "#eadcf8",
        color:
          "#6f42c1"
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
            "#dcecff",
          color:
            "#245a9a"
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
        border-left:5px solid #2f6fed;
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
        border-left:5px solid #2f6fed;
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
          background:#f7faff;
          border-radius:8px;
          border:1px solid #d9e3f2;
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
        border-left:5px solid #2f6fed;
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
          background:#f7faff;
          border:1px solid #d9e3f2;
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
            background:#eef5ff;
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

    `;


    loadTeacherProfilePage();

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


            <div
              style="
                grid-column:1 / -1;
                padding:14px;
                border:1px solid #d9e3f2;
                border-radius:9px;
                background:#eef5ff;
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
              background:#eef5ff;
              border-radius:8px;
              font-size:13px;
            "
          >
            A senha nao sera salva nas tabelas do ERP.
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
        saveNewStudentWithAccess
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

  return days
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
        max="${normalizeTime(
          (
            currentTeacherProfileSettings &&
            currentTeacherProfileSettings.work_end_time
          )
          ||
          "23:30"
        )}"
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
        timeToMinutes(
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
          background:#eef5ff;
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
          Ele continua podendo entrar no ERP,
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

      "O aluno sumira da lista, o acesso ao ERP sera bloqueado " +
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
        border-left:5px solid #2f6fed;
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
    classLinkResult
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
    classLinkResult.error
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
      classLinkResult.error
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


  area.innerHTML = `

    <div
      class="card"
      style="
        border-left:5px solid #2f6fed;
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


      <div
        style="
          margin-top:24px;
          padding:16px;
          border:1px solid #d9e3f2;
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
                      background:#f7faff;
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
          border:1px solid #d9e3f2;
          border-radius:10px;
          background:#eef5ff;
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
                  href="${escapeHtml(
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
          border:1px solid #d9e3f2;
          border-radius:10px;
          background:#f7faff;
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
          border:1px solid #d9e3f2;
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
          border:1px solid #d9e3f2;
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
                    background:#f7faff;
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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#f7faff;
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
        border:1px solid #d9e3f2;
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
                  background:#f7faff;
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
        background:#f7faff;
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
          color:#6f42c1;
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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#f7faff;
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
        border:1px solid #d9e3f2;
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
            background:#f7faff;
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
            background:#f7faff;
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
            background:#f7faff;
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
            background:#f7faff;
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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#f7faff;
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
      "#eef5ff";

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
          background:#eef5ff;
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
    timeToMinutes(
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
      minutesToTime(
        minutes
      );


    const endTime =
      minutesToTime(
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
      holiday
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
              "#f3e8ff";

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
              "#eadcf8";

            cell.style.color =
              "#6f42c1";

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
              "#dcecff";

            cell.style.color =
              "#245a9a";

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
              "#eadcf8";

            cell.style.color =
              "#6f42c1";

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

    return (
      combineDateAndTime(
        date,
        slot.attendance.end_time
      )
      <=
      new Date()
    );

  }


  let occurrenceStart =
    timeToMinutes(
      slot.start_time
    );


  let occurrenceEnd =
    timeToMinutes(
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
            timeToMinutes(
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
    minutesToTime(
      occurrenceEnd
    );


  return (
    combineDateAndTime(
      date,
      endTime
    )
    <=
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
        border-left:5px solid #2f6fed;
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
                background:#eef5ff;
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
                background:#f3e8ff;
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
            background:#eef5ff;
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
        border-left:5px solid #2f6fed;
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
      "#6f42c1";


    moveButton.style.color =
      "#6f42c1";


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
      "#6f42c1";


    makeupButton.style.color =
      "#6f42c1";


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
        border-left:5px solid #6f42c1;
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
        border-left:5px solid #6f42c1;
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
          background:#eef5ff;
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
        border-left:5px solid #6f42c1;
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
          background:#eef5ff;
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

      </div>

    </div>


    <div
      style="
        margin-top:18px;
        padding:15px;
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#eef5ff;
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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#f7faff;
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
        background:#eef5ff;
        font-size:13px;
      "
    >
      Exemplo: 08:00 ate 20:00 faz a agenda exibir somente
      esse intervalo. Se ja existir aluno ou reposicao fora
      do novo horario, o sistema pede para voce reagendar
      antes de reduzir a janela.
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
    !startTime ||
    !endTime ||
    timeToMinutes(
      startTime
    ) >=
    timeToMinutes(
      endTime
    )
  ) {

    if (message) {

      message.textContent =
        "Informe um horario inicial e final validos.";

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
      "save_my_teacher_profile_with_rules",
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


  currentProfile.name =
    name;


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
      "Perfil e regras atualizados com sucesso.";

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
        border:1px solid #d9e3f2;
        border-radius:10px;
        background:#eef5ff;
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
                href="${escapeHtml(
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
        border:1px solid #d9c9ee;
        border-radius:10px;
        background:#faf6ff;
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
        background:#faf6ff;
        border:1px solid #d9c9ee;
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
          background:#f7faff;
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
                href="${escapeHtml(
                  item.url
                )}"
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
          background:#f7faff;
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
                href="${escapeHtml(
                  item.url
                )}"
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
    financialGenerationResult
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
            Resumo do professor
          </h3>


          <p
            style="
              margin:6px 0 0;
              color:#666;
            "
          >
            Pendencias e informacoes importantes do ERP.
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


      <div
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
        style="
          margin-top:20px;
        "
      >

        <h4
          style="
            margin-bottom:10px;
          "
        >
          Precisa de atencao
        </h4>


        ${
          alerts.length === 0

            ? `

              <div
                style="
                  padding:14px;
                  border-radius:9px;
                  background:#eef8f0;
                "
              >
                Nenhuma pendencia importante no momento.
              </div>

            `

            : `

              <div
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
      style="
        padding:13px;
        border:1px solid #ddd;
        border-radius:9px;
        background:#ffffff;
      "
    >

      <div
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
          "E-mail ou senha incorretos.";


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
                window.location.origin
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

    await showLoggedUser(
      session.user
    );

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
