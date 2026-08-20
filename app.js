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

let currentStudentSchedule = [];
let selectedScheduleSlot = null;
let selectedWeekStart = getMonday(new Date());


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
      "get_my_notices"
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

    </div>

  `;

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

  `;
}


// =====================================================
// CARD FINANCEIRO
// =====================================================

function renderFinancialCard(item) {

  const month =
    formatMonth(
      item.month
    );


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
          margin:15px 0;
        "
      >
        ${amount}
      </p>


      <p>
        <strong>Observa\xe7\xf5es:</strong>
        ${
          item.notes ||
          "Nenhuma observa\xe7\xe3o."
        }
      </p>

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
      return "\u274c Falta";

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
      return "Falta";

    case "manual":
      return "Professor";

    case "student_cancellation":
      return "Cancelamento de aula";

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
    weeklyMakeupReservations
  );
}



// =====================================================
// RENDERIZAR AGENDA
// =====================================================

function renderStudentWeeklySchedule(
  schedule,
  makeupReservations = []
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


        const status =
          ownMakeupReservation

            ? {
                className:
                  "own-makeup",

                label:
                  "Minha reposi\u00E7\u00E3o"
              }

            : normalizeStudentScheduleStatus(
                slot.status
              );


        cell.classList.add(
          status.className
        );

        cell.textContent =
          status.label;


        // =============================================
        // MINHA REPOSI\u00C7\u00C3O
        // =============================================

        if (
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
            "default";

          cell.title =
            "Esta \u00E9 a sua reposi\u00E7\u00E3o.";

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
      "reserve_makeup",
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
