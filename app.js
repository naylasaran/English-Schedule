// =====================================================
// ESTADO DO APLICATIVO
// =====================================================

let currentUser = null;
let currentProfile = null;

let currentStudentSchedule = [];
let selectedScheduleSlot = null;
let selectedWeekStart = getMonday(new Date());


// =====================================================
// ELEMENTOS
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
// PERFIL
// =====================================================

async function loadProfile(userId) {

  const { data, error } =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

  if (error) {
    console.error("Erro ao carregar perfil:", error);
    return null;
  }

  return data;
}


// =====================================================
// USUÁRIO LOGADO
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

  if (currentProfile.role === "student") {

    await showStudentArea();

  } else if (currentProfile.role === "teacher") {

    await showTeacherArea();

  } else {

    await supabaseClient.auth.signOut();

    loginScreen.classList.remove("hidden");

    loginMessage.textContent =
      "Tipo de usuário inválido.";
  }
}


// =====================================================
// ÁREA DO ALUNO
// =====================================================

async function showStudentArea() {

  studentScreen.classList.remove("hidden");
  teacherScreen.classList.add("hidden");

  const header =
    document.getElementById("studentHeader");

  if (header) {

    header.innerHTML = `
      <h2>Olá, ${currentProfile.name}</h2>
      <p>Área do aluno.</p>
    `;

  }

  setStudentPage("agenda");
}


// =====================================================
// ÁREA DO PROFESSOR
// =====================================================

async function showTeacherArea() {

  teacherScreen.classList.remove("hidden");
  studentScreen.classList.add("hidden");

  const header =
    document.getElementById("teacherHeader");

  if (header) {

    header.innerHTML = `
      <h2>Olá, ${currentProfile.name}</h2>
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
    document.getElementById("studentContent");

  if (!content) {
    return;
  }

  document
    .querySelectorAll("[data-student-page]")
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
          style="margin-top:20px;"
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

        </div>

      </div>

      <div id="makeupSelectionArea"></div>

    `;


    document
      .getElementById("previousWeekButton")
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
      .getElementById("currentWeekButton")
      .addEventListener(
        "click",
        () => {

          selectedWeekStart =
            getMonday(new Date());

          loadStudentWeeklySchedule();

        }
      );


    document
      .getElementById("nextWeekButton")
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


  // Mais recente primeiro
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

function renderFinancialCard(
  item
) {

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

function formatMonth(
  month
) {

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
// VALOR
// =====================================================

function formatCurrency(
  amount
) {

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
// STATUS DO PAGAMENTO
// =====================================================

function formatPaymentStatus(
  status
) {

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

// =====================================================
// HISTÓRICO DO ALUNO
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


  // Buscar comentários do aluno
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


  // Botões de comentário
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
// RENDERIZAR UMA AULA DO HISTÓRICO
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
            class="lesson-comment-input"
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
            style="
              margin-top:8px;
            "
          >
            Adicionar comentário
          </button>


          <p
            id="comment-message-${lesson.lesson_id}"
            style="
              margin-top:8px;
            "
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


  const button =
    document.querySelector(
      `.add-lesson-comment-button[data-lesson-id="${lessonId}"]`
    );


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
        comment: comment
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

function formatAttendanceStatus(
  status
) {

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
// PROTEÇÃO DE TEXTO
// =====================================================

function escapeHtml(
  value
) {

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
        Carregando...
      </div>

    </div>

  `;

  loadStudentFinancialHistory();

  return;
}


// =====================================================
// REPOSIÇÕES DO ALUNO
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


  container.innerHTML = `

    <div
      style="
        display:grid;
        gap:15px;
      "
    >

      ${makeups
        .map(
          makeup =>
            renderMakeupCard(makeup)
        )
        .join("")}

    </div>

  `;
}


// =====================================================
// CARD DE REPOSIÇÃO
// =====================================================

function renderMakeupCard(
  makeup
) {

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
          style="
            font-weight:bold;
          "
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

      </div>

    </div>

  `;
}


// =====================================================
// STATUS DA REPOSIÇÃO
// =====================================================

function formatMakeupStatus(
  status
) {

  switch (
    String(status || "").toLowerCase()
  ) {

    case "available":

      return {
        label: "🟢 Disponível"
      };


    case "reserved":

      return {
        label: "🔵 Reservada"
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
          status || "Situação desconhecida"
      };

  }
}


// =====================================================
// ORIGEM DA REPOSIÇÃO
// =====================================================

function formatMakeupSource(
  source
) {

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
        .map(day => `

          <th>

            ${day.name}<br>

            <small>
              ${formatDate(day.date)}
            </small>

          </th>

        `)
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

      } else {

        const status =
          normalizeStudentScheduleStatus(
            slot.status
          );


        cell.classList.add(
          status.className
        );


        cell.textContent =
          status.label;


        if (
          status.className ===
          "available"
        ) {

          cell.style.cursor =
            "pointer";


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

  switch (status) {

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
// SELEÇÃO DE REPOSIÇÃO
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
                value="${makeup.makeup_id}"
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
// BUSCAR REPOSIÇÕES DISPONÍVEIS
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


    // 30 minutos
    if (
      duration === 30
    ) {

      result.push(
        makeup
      );

      continue;
    }


    // 60 minutos
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
// VERIFICAR BLOCO SEGUINTE
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
        ${makeup}
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
// RESERVA REAL
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


  button.disabled = true;

  button.textContent =
    "Reservando...";


  const {
    data,
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
      "Não foi possível realizar a reserva.";


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
// FECHAR SELEÇÃO
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
// NAVEGAÇÃO PROFESSOR
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


  const titles = {

    agenda: "Agenda",
    students: "Alunos",
    attendance: "Presença / Faltas",
    subjects: "Matérias",
    planning: "Planejamento",
    financial: "Financeiro",
    rules: "Regras"

  };


  content.innerHTML = `

    <div class="card">

      <h3>
        ${titles[page] || "Página"}
      </h3>

      <p>
        Esta área será implementada
        nas próximas etapas.
      </p>

    </div>

  `;
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
// SEMANAS
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


function formatDateTime(
  value
) {

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
    ).padStart(2, "0");


  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


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

function normalizeTime(
  time
) {

  return String(
    time
  ).substring(0, 5);
}


function timeToMinutes(
  time
) {

  const parts =
    normalizeTime(time)
      .split(":");


  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}


function minutesToTime(
  minutes
) {

  const hours =
    Math.floor(
      minutes / 60
    );


  const mins =
    minutes % 60;


  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(mins).padStart(2, "0")
  );
}


// =====================================================
// TEXTOS
// =====================================================

function formatDay(
  day
) {

  const days = {

    1: "Segunda-feira",
    2: "Terça-feira",
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira",
    6: "Sábado",
    7: "Domingo"

  };


  return days[
    Number(day)
  ] || "";
}


// =====================================================
// LOGIN
// =====================================================

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


// =====================================================
// LOGOUT
// =====================================================

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


    loginForm.reset();

  }
);


// =====================================================
// RECUPERAÇÃO DE SENHA
// =====================================================

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
// AUTH
// =====================================================

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

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
