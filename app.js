// =====================================================
// AGENDA DE AULAS
// APP.JS COMPLETO
// =====================================================


// =====================================================
// ESTADO
// =====================================================

let currentUser = null;
let currentProfile = null;

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
// MOSTRAR USUÁRIO LOGADO
// =====================================================

async function showLoggedUser(user) {

  currentUser = user;

  currentProfile =
    await loadProfile(user.id);

  if (!currentProfile) {

    loginMessage.textContent =
      "Não foi possível carregar seu perfil.";

    return;
  }

  loginScreen.classList.add("hidden");


  if (
    currentProfile.role === "student"
  ) {

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
      "Tipo de usuário inválido.";
  }
}


// =====================================================
// ÁREA DO ALUNO
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
      <h2>Olá, ${escapeHtml(currentProfile.name)}</h2>
      <p>Área do aluno.</p>
    `;

  }


  setStudentPage("agenda");
}


// =====================================================
// ÁREA DO PROFESSOR
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
      <h2>Olá, ${escapeHtml(currentProfile.name)}</h2>
      <p>Área do professor.</p>
    `;

  }


  setTeacherPage("agenda");
}


// =====================================================
// NAVEGAÇÃO DO ALUNO
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

      <div class="card">

        <h3>Agenda semanal</h3>

        <p>
          Clique em um horário livre para
          escolher uma reposição.
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
            ← Semana anterior
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
            Próxima semana →
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
          class="schedule-legend"
          style="
            margin-top:20px;
            display:flex;
            gap:15px;
            flex-wrap:wrap;
          "
        >

          <span>
            🟢 Livre
          </span>

          <span>
            🔴 Ocupado
          </span>

          <span>
            ⚫ Indisponível
          </span>

          <span>
            🔵 Minha aula
          </span>

          <span>
            🟣 Minha reposição
          </span>

        </div>

      </div>

      <div id="makeupSelectionArea"></div>

    `;


    document
      .getElementById(
        "previousWeekButton"
      )
      .addEventListener(
        "click",
        () => {

          selectedWeekStart =
            addDays(
              selectedWeekStart,
              -7
            );

          loadStudentWeeklySchedule();

        }
      );


    document
      .getElementById(
        "currentWeekButton"
      )
      .addEventListener(
        "click",
        () => {

          selectedWeekStart =
            getMonday(
              new Date()
            );

          loadStudentWeeklySchedule();

        }
      );


    document
      .getElementById(
        "nextWeekButton"
      )
      .addEventListener(
        "click",
        () => {

          selectedWeekStart =
            addDays(
              selectedWeekStart,
              7
            );

          loadStudentWeeklySchedule();

        }
      );


    loadStudentWeeklySchedule();

    return;
  }


  // ===================================================
  // HISTÓRICO
  // ===================================================

  if (page === "history") {

    content.innerHTML = `

      <div class="card">

        <h3>Histórico de aulas</h3>

        <p>
          Aqui você pode acompanhar suas aulas,
          conteúdos, presença e observações.
        </p>

        <div
          id="studentHistoryContent"
          style="margin-top:20px;"
        >
          Carregando histórico...
        </div>

      </div>

    `;


    loadStudentHistory();

    return;
  }


  // ===================================================
  // REPOSIÇÕES
  // ===================================================

  if (page === "makeups") {

    content.innerHTML = `

      <div class="card">

        <h3>Minhas reposições</h3>

        <p>
          Consulte suas reposições,
          duração, validade e situação.
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
          histórico de pagamentos.
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
          Não foi possível carregar as regras.
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
          As regras aparecerão aqui
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
        Não foi possível carregar
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
          uma mensalidade, ela aparecerá aqui.
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
        <strong>Observações:</strong>
        ${
          item.notes ||
          "Nenhuma observação."
        }
      </p>

    </div>

  `;
}


// =====================================================
// MÊS
// =====================================================

function formatMonth(month) {

  const months = [

    "",
    "Janeiro",
    "Fevereiro",
    "Março",
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
    ] || `Mês ${month}`
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

    return "Valor não informado";

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

      return "🟢 Pago";


    case "pending":
    case "pendente":

      return "🟡 Pendente";


    case "overdue":
    case "atrasado":

      return "🔴 Atrasado";


    case "cancelled":
    case "cancelado":

      return "⚫ Cancelado";


    default:

      return (
        status ||
        "Status não informado"
      );

  }
}


// =====================================================
// HISTÓRICO
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
    <p>Carregando histórico...</p>
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
      "Erro ao carregar histórico:",
      error
    );


    container.innerHTML = `
      <p>
        Não foi possível carregar seu histórico.
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
          Seu histórico aparecerá aqui
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
      "Erro ao carregar comentários:",
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
// CARD DO HISTÓRICO
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
      : "Data não informada";


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
          ${end ? " às " + end : ""}
        </strong>

      </div>


      <p>
        <strong>Matéria:</strong>
        ${
          lesson.subject_name ||
          "Não informada"
        }
      </p>


      <p>
        <strong>Conteúdo:</strong>
        ${
          lesson.content_title ||
          "Não informado"
        }
      </p>


      <p>
        <strong>Presença:</strong>
        ${formatAttendanceStatus(
          lesson.attendance_status
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
          Observações do professor
        </strong>

        <p>
          ${
            lesson.teacher_notes ||
            "Nenhuma observação registrada."
          }
        </p>

      </div>


      <div
        style="
          margin-top:18px;
        "
      >

        <strong>
          Comentários do aluno
        </strong>


        ${
          lessonComments.length === 0

            ? `

              <p>
                Você ainda não adicionou
                um comentário nesta aula.
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
            placeholder="Escreva um comentário sobre esta aula..."
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
            Adicionar comentário
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
// ADICIONAR COMENTÁRIO
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
        "Escreva um comentário antes de enviar.";

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
      "Erro ao adicionar comentário:",
      error
    );


    if (message) {

      message.textContent =
        "Não foi possível adicionar o comentário.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled = false;

      button.textContent =
        "Adicionar comentário";

    }

    return;
  }


  if (message) {

    message.textContent =
      "Comentário adicionado com sucesso.";

    message.style.color =
      "green";

  }


  input.value = "";

  await loadStudentHistory();
}


// =====================================================
// PRESENÇA
// =====================================================

function formatAttendanceStatus(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "present":
      return "✅ Presente";

    case "absent":
      return "❌ Falta";

    case "justified_absence":
      return "⚠️ Falta justificada";

    case "cancelled":
      return "🚫 Cancelada";

    case "makeup":
      return "🔄 Reposição";

    default:
      return status || "Não registrado";

  }
}


// =====================================================
// REPOSIÇÕES
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
    <p>Carregando reposições...</p>
  `;


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_makeups"
    );


  if (error) {

    console.error(
      "Erro ao carregar reposições:",
      error
    );


    container.innerHTML = `
      <p>
        Não foi possível carregar suas reposições.
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
          Você não possui reposições cadastradas.
        </strong>

        <p>
          Quando uma falta gerar uma reposição
          ou o professor atribuir uma,
          ela aparecerá aqui.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // Buscar as reservas do próprio aluno.
  // Isso permite colocar o botão de cancelamento
  // somente na reposição que está realmente reservada.
  // ---------------------------------------------------

  const makeupIds =
    makeups.map(
      makeup =>
        makeup.makeup_id ||
        makeup.id
    ).filter(Boolean);


  let reservations = [];


  if (makeupIds.length > 0) {

    const {
      data: reservationData,
      error: reservationError
    } =
      await supabaseClient
        .from("reservations")
        .select(`
          id,
          makeup_id,
          reservation_date,
          start_time,
          end_time,
          status
        `)
        .in(
          "makeup_id",
          makeupIds
        )
        .eq(
          "student_id",
          currentStudentIdForQuery()
        )
        .eq(
          "status",
          "active"
        );


    if (reservationError) {

      console.warn(
        "Não foi possível consultar as reservas do aluno:",
        reservationError
      );

    }
    else {

      reservations =
        reservationData || [];

    }

  }


  const enrichedMakeups =
    makeups.map(
      makeup => {

        const makeupId =
          makeup.makeup_id ||
          makeup.id;


        const reservation =
          reservations.find(
            item =>
              item.makeup_id ===
              makeupId
          );


        return {
          ...makeup,
          reservation_id:
            makeup.reservation_id ||
            reservation?.id ||
            null,
          reservation_date:
            makeup.reservation_date ||
            reservation?.reservation_date ||
            null,
          reservation_start_time:
            makeup.reservation_start_time ||
            reservation?.start_time ||
            null,
          reservation_end_time:
            makeup.reservation_end_time ||
            reservation?.end_time ||
            null
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
          makeup =>
            renderMakeupCard(
              makeup
            )
        )
        .join("")}

    </div>

  `;


  document
    .querySelectorAll(
      ".cancel-makeup-button"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          cancelStudentMakeup(
            button.dataset.reservationId
          );

        }
      );

    });
}


// =====================================================
// ID DO ALUNO ATUAL
// =====================================================

function currentStudentIdForQuery() {

  /*
   * Em todo o sistema o auth user e o profile
   * usam o mesmo id.
   */

  return currentUser?.id || null;
}


// =====================================================
// CARD DE REPOSIÇÃO
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
      makeup.status
    );


  const expires =
    makeup.expires_at
      ? formatDateTime(
          makeup.expires_at
        )
      : "Não informado";


  const cancellationCount =
    Number(
      makeup.cancellation_count || 0
    );


  const isReserved =
    String(
      makeup.status || ""
    ).toLowerCase() ===
    "reserved";


  const reservationId =
    makeup.reservation_id;


  let reservationInfo = "";


  if (
    isReserved &&
    makeup.reservation_date
  ) {

    reservationInfo = `

      <div
        style="
          margin-top:15px;
          padding:12px;
          border-radius:8px;
          background:#eef5ff;
        "
      >

        <strong>
          Reserva:
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
            ? ` às ${normalizeTime(
                makeup.reservation_start_time
              )}`
            : ""
        }

      </div>

    `;

  }


  let cancelButton = "";


  if (
    isReserved &&
    reservationId
  ) {

    cancelButton = `

      <button
        type="button"
        class="secondary-button cancel-makeup-button"
        data-reservation-id="${reservationId}"
        style="
          margin-top:15px;
          border-color:#c0392b;
          color:#c0392b;
        "
      >
        Cancelar reposição
      </button>

      <p
        id="cancel-makeup-message-${reservationId}"
        style="margin-top:8px;"
      ></p>

    `;

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

        <span
          style="font-weight:bold;"
        >
          ${status.label}
        </span>

      </div>


      <div style="margin-top:12px;">

        <p>
          <strong>Origem:</strong>
          ${source}
        </p>

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
// CANCELAR REPOSIÇÃO DO ALUNO
// =====================================================

async function cancelStudentMakeup(
  reservationId
) {

  if (!reservationId) {

    alert(
      "Não foi possível identificar a reserva."
    );

    return;
  }


  const confirmed =
    window.confirm(
      "Tem certeza que deseja cancelar esta reposição?\n\n" +
      "O cancelamento seguirá as regras do sistema. " +
      "Se esta for a segunda vez que você cancela esta reposição, " +
      "ela será perdida."
    );


  if (!confirmed) {
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


  if (button) {

    button.disabled = true;

    button.textContent =
      "Cancelando...";

  }


  const {
    data,
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
      "Erro ao cancelar reposição:",
      error
    );


    if (message) {

      message.textContent =
        error.message ||
        "Não foi possível cancelar a reposição.";

      message.style.color =
        "red";

    }


    if (button) {

      button.disabled = false;

      button.textContent =
        "Cancelar reposição";

    }

    return;
  }


  console.log(
    "Cancelamento realizado:",
    data
  );


  if (message) {

    message.textContent =
      "Reposição cancelada com sucesso.";

    message.style.color =
      "green";

  }


  /*
   * Recarrega a tela para refletir:
   *
   * primeiro cancelamento:
   * available + contador 1
   *
   * segundo cancelamento:
   * lost
   */

  await loadStudentMakeups();


  /*
   * Também atualiza a agenda.
   * Assim o horário volta a ficar disponível
   * imediatamente.
   */

  await loadStudentWeeklySchedule();

}


// =====================================================
// STATUS REPOSIÇÃO
// =====================================================

function formatMakeupStatus(status) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "available":

      return {
        label: "🟢 Disponível"
      };


    case "reserved":

      return {
        label: "🟣 Minha reposição"
      };


    case "used":

      return {
        label: "⚫ Utilizada"
      };


    case "lost":

      return {
        label: "🔴 Perdida"
      };


    case "expired":

      return {
        label: "🟠 Expirada"
      };


    default:

      return {
        label:
          status ||
          "Situação desconhecida"
      };

  }
}


// =====================================================
// ORIGEM REPOSIÇÃO
// =====================================================

function formatMakeupSource(source) {

  switch (
    String(source || "").toLowerCase()
  ) {

    case "absence":
      return "Falta";

    case "manual":
      return "Professor";

    default:
      return source || "Não informado";

  }
}


// =====================================================
// AGENDA DO ALUNO
// =====================================================

async function loadStudentWeeklySchedule() {

  const body =
    document.getElementById(
      "studentScheduleBody"
    );


  if (!body) {
    return;
  }


  const label =
    document.getElementById(
      "selectedWeekLabel"
    );


  if (label) {

    label.textContent =
      formatWeekLabel(
        selectedWeekStart
      );

  }


  body.innerHTML = `
    <tr>
      <td colspan="8">
        Carregando agenda...
      </td>
    </tr>
  `;


  const weekStart =
    formatDateForDatabase(
      selectedWeekStart
    );


  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_student_weekly_schedule",
      {
        p_week_start:
          weekStart
      }
    );


  if (error) {

    console.error(
      "Erro ao carregar agenda:",
      error
    );


    body.innerHTML = `
      <tr>
        <td colspan="8">
          Erro ao carregar a agenda.
        </td>
      </tr>
    `;

    return;
  }


  currentStudentSchedule =
    data || [];


  renderStudentWeeklySchedule(
    currentStudentSchedule
  );
}


// =====================================================
// RENDERIZAR AGENDA
// =====================================================

function renderStudentWeeklySchedule(
  schedule
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

      <th>Horário</th>

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

        cell.textContent = "—";

        cell.classList.add(
          "unavailable"
        );

      }

      else {

        const status =
          normalizeStudentScheduleStatus(
            slot.status
          );


        cell.classList.add(
          status.className
        );


        cell.textContent =
          status.label;


        // ------------------------------------------------
        // Minha reposição
        // ------------------------------------------------

        if (
          status.className ===
          "own-makeup"
        ) {

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "default";

          cell.title =
            "Esta é a sua reposição.";

        }


        // ------------------------------------------------
        // Minha aula
        // ------------------------------------------------

        else if (
          status.className ===
          "own"
        ) {

          cell.style.fontWeight =
            "bold";

          cell.style.cursor =
            "default";

          cell.title =
            "Esta é a sua aula.";

        }


        // ------------------------------------------------
        // Horário livre
        // ------------------------------------------------

        else if (
          status.className ===
          "available"
        ) {

          cell.style.cursor =
            "pointer";

          cell.title =
            "Clique para escolher uma reposição.";

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
          Nenhum horário cadastrado.
        </td>
      </tr>
    `;

  }
}


// =====================================================
// ENCONTRAR HORÁRIO
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
        label: "Indisponível"
      };


    case "own_makeup":
    case "my_makeup":

      return {
        className: "own-makeup",
        label: "Minha reposição"
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


// =====================================================
// SELECIONAR REPOSIÇÃO
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
          Nenhuma reposição compatível
        </h3>

        <p>
          Você não possui uma reposição
          compatível com este horário.
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
        Escolher reposição
      </h3>

      <p>

        ${formatDay(
          slot.day_of_week
        )}

        — ${formatDate(
          reservationDate
        )}

        às

        ${normalizeTime(
          slot.start_time
        )}

      </p>


      <label>
        Reposição:
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
          Selecione uma reposição
        </option>

        ${compatibleMakeups
          .map(
            makeup => `

              <option
                value="${makeup.makeup_id || makeup.id}"
              >

                ${makeup.duration_minutes}
                minutos —
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
// REPOSIÇÕES DISPONÍVEIS
// =====================================================

async function getAvailableMakeups() {

  const {
    data,
    error
  } =
    await supabaseClient.rpc(
      "get_my_makeups"
    );


  if (error) {

    console.error(
      "Erro ao carregar reposições:",
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
// REPOSIÇÕES COMPATÍVEIS
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
// HORÁRIO SEGUINTE
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
      "Selecione uma reposição."
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
        <strong>Horário:</strong>
        ${normalizeTime(
          selectedScheduleSlot.start_time
        )}
      </p>

      <p>
        <strong>Reposição:</strong>
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
// RESERVAR REPOSIÇÃO
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
      "Não foi possível realizar a reserva.";

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
    às
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
// NAVEGAÇÃO DO PROFESSOR
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
          Defina as regras que serão
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
  // DEMAIS PÁGINAS DO PROFESSOR
  // ===================================================

  const titles = {

    agenda: "Agenda",

    students: "Alunos",

    attendance:
      "Presença / Faltas",

    subjects:
      "Matérias",

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
          "Página"
        }
      </h3>

      <p>
        Esta área será implementada
        nas próximas etapas.
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
        "Não foi possível identificar o professor.";

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
        "Não foi possível carregar as regras.";

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
        "Não foi possível salvar as regras.";

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
// BOTÕES DE NAVEGAÇÃO
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
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
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
    " → " +
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
// HORÁRIOS
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

    2: "Terça-feira",

    3: "Quarta-feira",

    4: "Quinta-feira",

    5: "Sexta-feira",

    6: "Sábado",

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
// RECUPERAÇÃO DE SENHA
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
          "Não foi possível enviar o e-mail de recuperação.";


        return;
      }


      loginMessage.textContent =
        "E-mail de recuperação enviado.";

    }
  );

}


// =====================================================
// INICIALIZAÇÃO
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
// ALTERAÇÃO DE AUTENTICAÇÃO
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
