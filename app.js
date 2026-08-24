console.log(
  "ERP build: cadastro-horarios-v2-20260824"
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
let editingTeacherFinancialId = null;
let editingTeacherPlanId = null;

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

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

  if (error) {

    console.error(
      "Erro ao carregar perfil:",
      error
    );

    return null;
  }

  return data;
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

    await showTeacherArea();

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
// \xc1REA DO ALUNO
// =====================================================

async function showStudentArea() {

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


  setStudentPage("agenda");
}


// =====================================================
// \xc1REA DO PROFESSOR
// =====================================================

async function showTeacherArea() {

  teacherScreen.classList.remove(
    "hidden"
  );

  studentScreen.classList.add(
    "hidden"
  );


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
// NAVEGA\xc7\xc3O DO ALUNO
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
            margin-bottom:20px;
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
      "get_student_rules"
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
          N\xe3o foi poss\xedvel carregar as regras.
        </strong>

        <p>
          Tente novamente mais tarde.
        </p>

      </div>

    `;

    return;
  }


  const rules =
    typeof data === "string"
      ? data.trim()
      : "";


  if (!rules) {

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

        <p>
          As regras aparecer\xe3o aqui
          quando forem definidas pelo professor.
        </p>

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

      ${escapeHtml(rules)}

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


  const amount =
    formatCurrency(
      item.amount
    );


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


      <p
        style="
          font-size:24px;
          font-weight:bold;
          margin:15px 0 7px;
        "
      >
        ${amount}
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
    await supabaseClient
      .from("lesson_comments")
      .select(
        "id, lesson_id, student_id, comment, created_at"
      )
      .in(
        "lesson_id",
        lessonIds
      )
      .eq(
        "student_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending: true
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
    await supabaseClient
      .from("lesson_comments")
      .insert({
        lesson_id: lessonId,
        student_id: currentUser.id,
        comment
      });


  if (error) {

    console.error(
      "Erro ao adicionar coment\xe1rio:",
      error
    );


    if (message) {

      message.textContent =
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
          <strong>Cancelamentos do aluno:</strong>
          ${cancellationCount}
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


  const button =
    document.querySelector(
      `.cancel-makeup-button[data-reservation-id="${reservationId}"]`
    );

  const message =
    document.getElementById(
      `cancel-makeup-message-${reservationId}`
    );


  const {
    data: reservation,
    error: reservationError
  } =
    await supabaseClient
      .from("reservations")
      .select(`
        id,
        reservation_date,
        start_time,
        status
      `)
      .eq(
        "id",
        reservationId
      )
      .single();


  if (reservationError) {

    console.error(
      "Erro ao consultar reserva:",
      reservationError
    );

    if (message) {

      message.textContent =
        "N\u00E3o foi poss\u00EDvel consultar a reserva.";

      message.style.color =
        "red";

    }

    return;
  }


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


  const minimumHours =
    2;

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


  let confirmationText;


  if (lateCancellation) {

    confirmationText =
      "Tem certeza que deseja cancelar esta reposi\u00E7\u00E3o?\n\n" +
      "Faltam menos de 2 horas para a aula.\n\n" +
      "Essa aula n\u00E3o poder\u00E1 ser reposta depois.";

  }

  else {

    confirmationText =
      "Tem certeza que deseja cancelar esta reposi\u00E7\u00E3o?\n\n" +
      "No primeiro cancelamento, a reposi\u00E7\u00E3o volta uma vez. " +
      "No segundo cancelamento, ela ser\u00E1 perdida.";

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
      "cancel_reservation",
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
        "Reposi\u00E7\u00E3o cancelada. Como o cancelamento foi feito com menos de 2 horas de anteced\u00EAncia, o direito \u00E0 reposi\u00E7\u00E3o foi perdido.";

    }

    else {

      message.textContent =
        "Reposi\u00E7\u00E3o cancelada com sucesso.";

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

  currentStudentSchedule = data || [];

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


    releasedSlots.forEach(
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
    } = await supabaseClient
      .from("reservations")
      .select(`
        id,
        makeup_id,
        student_id,
        reservation_date,
        start_time,
        end_time,
        status
      `)
      .eq("student_id", currentStudentId)
      .eq("status", "active")
      .not("makeup_id", "is", null)
      .gte("reservation_date", formatDateForDatabase(selectedWeekStart))
      .lte("reservation_date", formatDateForDatabase(weekEnd));

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
              Ver registro
            </small>

          `;

          cell.title =
            "Clique para ver o registro desta aula.";


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

          cell.title =
            "Clique para cancelar ou adiar esta aula.";


          cell.addEventListener(
            "click",
            () => {

              openLessonCancellation(
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


function openStudentAgendaLessonHistory(
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
      "get_my_lesson_for_slot",
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

  const minimumHours =
    Number(
      lesson.minimum_cancellation_hours ||
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
      "cancel_lesson_by_student_with_message",
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
      "reserve_makeup_v2",
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
            margin-bottom:20px;
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
  invoiceRequired
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
        invoiceRequired

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
  invoiceRequired
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
        invoiceRequired

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
    !passwordInput ||
    !confirmInput ||
    !durationSelect ||
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


  const password =
    passwordInput.value;


  const confirmPassword =
    confirmInput.value;


  const duration =
    Number(
      durationSelect.value
    );


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
          invoiceRequired
        );


      if (!recoveryError) {

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
          invoiceRequired
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
      invoiceRequired
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

  passwordInput.value =
    "";

  confirmInput.value =
    "";

  durationSelect.value =
    "60";


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
        Aluno, acesso e horarios cadastrados com sucesso.
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
    data || [];


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
    scheduleResult,
    financialSettingsResult,
    historyResult,
    makeupResult
  ] =
    await Promise.all([

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
      )

    ]);


  if (
    scheduleResult.error ||
    financialSettingsResult.error ||
    historyResult.error ||
    makeupResult.error
  ) {

    console.error(
      "Erro ao carregar detalhes do aluno:",
      scheduleResult.error ||
      financialSettingsResult.error ||
      historyResult.error ||
      makeupResult.error
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
            display:grid;
            grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
            gap:12px;
          "
        >

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
                  renderTeacherStudentHistoryRow
                )
                .join("")}

            </div>

          `
      }

    </div>

  `;


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
          )

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
  record
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
              ${escapeHtml(
                record.teacher_notes
              )}
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
// AGENDA SEMANAL DO PROFESSOR
// =====================================================

async function loadTeacherWeeklySchedule() {

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
      (data || []).map(
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


    days.push({
      date,
      schedule
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
                  studentName ||
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
                  studentName ||
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
                  studentName ||
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
                  studentName ||
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
                  studentName ||
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
                  studentName ||
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
      "teacher_reserve_makeup",
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

async function loadTeacherRules() {

  const input =
    document.getElementById(
      "teacherRulesInput"
    );


  if (!input) {
    return;
  }


  input.value =
    "Carregando regras...";


  const {
    data: teacherId,
    error: teacherError
  } =
    await supabaseClient.rpc(
      "get_current_teacher_id"
    );


  if (teacherError) {

    console.error(
      "Erro ao descobrir professor:",
      teacherError
    );


    input.value = "";


    const message =
      document.getElementById(
        "teacherRulesMessage"
      );


    if (message) {

      message.textContent =
        "N\xe3o foi poss\xedvel identificar o professor.";

      message.style.color =
        "red";

    }


    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("teacher_settings")
      .select("rules_text")
      .eq(
        "teacher_id",
        teacherId
      )
      .maybeSingle();


  if (error) {

    console.error(
      "Erro ao carregar regras:",
      error
    );


    input.value = "";


    const message =
      document.getElementById(
        "teacherRulesMessage"
      );


    if (message) {

      message.textContent =
        "N\xe3o foi poss\xedvel carregar as regras.";

      message.style.color =
        "red";

    }


  }

  else {

    input.value =
      data?.rules_text || "";

  }


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
// SALVAR REGRAS DO PROFESSOR
// =====================================================

async function saveTeacherRules() {

  const input =
    document.getElementById(
      "teacherRulesInput"
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


  if (button) {

    button.disabled = true;

    button.textContent =
      "Salvando...";

  }


  if (message) {

    message.textContent =
      "";

  }


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "update_rules",
      {
        p_rules_text:
          rules
      }
    );


  if (error) {

    console.error(
      "Erro ao salvar regras:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "N\xe3o foi poss\xedvel salvar as regras.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled = false;

      button.textContent =
        "Salvar regras";

    }


    return;
  }


  if (message) {

    message.textContent =
      "Regras salvas com sucesso.";

    message.style.color =
      "green";

  }


  if (button) {

    button.disabled = false;

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
