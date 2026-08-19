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

  document.getElementById(
    "studentHeader"
  ).innerHTML = `
    <h2>Olá, ${currentProfile.name}</h2>
    <p>Área do aluno.</p>
  `;

  setStudentPage("agenda");
}


// =====================================================
// ÁREA DO PROFESSOR
// =====================================================

async function showTeacherArea() {

  teacherScreen.classList.remove("hidden");
  studentScreen.classList.add("hidden");

  document.getElementById(
    "teacherHeader"
  ).innerHTML = `
    <h2>Olá, ${currentProfile.name}</h2>
    <p>Área do professor.</p>
  `;

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

  document
    .querySelectorAll("[data-student-page]")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.studentPage === page
      );

    });


  if (page === "agenda") {

    content.innerHTML = `

      <div class="card schedule-section">

        <h3>
          Agenda semanal
        </h3>

        <p class="schedule-help">
          Escolha a semana e clique em um
          horário verde para fazer uma reposição.
        </p>

        <div
          style="
            display:flex;
            align-items:center;
            justify-content:center;
            gap:12px;
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
            font-weight:700;
            font-size:18px;
            margin-bottom:20px;
          "
        ></div>

        <div class="schedule-wrapper">

          <table
            class="schedule-table"
            id="studentScheduleTable"
          >

            <thead id="studentScheduleHead"></thead>

            <tbody
              id="studentScheduleBody"
            >

              <tr>
                <td colspan="8">
                  Carregando agenda...
                </td>
              </tr>

            </tbody>

          </table>

        </div>

        <div class="schedule-legend">

          <span>
            <span class="legend-box available"></span>
            Livre
          </span>

          <span>
            <span class="legend-box occupied"></span>
            Ocupado
          </span>

          <span>
            <span class="legend-box unavailable"></span>
            Indisponível
          </span>

          <span>
            <span class="legend-box own"></span>
            Minha aula
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


  if (page === "history") {

    content.innerHTML = `
      <div class="card">
        <h3>Histórico de aulas</h3>
        <p>
          Aqui será exibido seu histórico de
          aulas, matérias, conteúdos e presença.
        </p>
      </div>
    `;

    return;
  }


  if (page === "makeups") {

    content.innerHTML = `
      <div class="card">
        <h3>Minhas reposições</h3>
        <p>
          Aqui aparecerão suas reposições.
        </p>
      </div>
    `;

    return;
  }


  if (page === "financial") {

    content.innerHTML = `
      <div class="card">
        <h3>Minha mensalidade</h3>
        <p>
          Aqui aparecerá sua mensalidade por mês.
        </p>
      </div>
    `;

    return;
  }


  if (page === "rules") {

    content.innerHTML = `
      <div class="card">
        <h3>Regras</h3>
        <p>
          Aqui serão exibidas as regras
          definidas pelo professor.
        </p>
      </div>
    `;

    return;
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

  document
    .querySelectorAll("[data-teacher-page]")
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


  const descriptions = {

    agenda:
      "Aqui ficará a agenda semanal completa do professor.",

    students:
      "Aqui serão exibidos os alunos vinculados ao professor.",

    attendance:
      "Aqui o professor poderá registrar presença e faltas.",

    subjects:
      "Aqui serão administradas matérias e conteúdos.",

    planning:
      "Aqui serão planejadas aulas futuras.",

    financial:
      "Aqui será feito o controle financeiro.",

    rules:
      "Aqui o professor poderá definir as regras dos alunos."

  };


  content.innerHTML = `

    <div class="card">

      <h3>
        ${titles[page] || "Página"}
      </h3>

      <p>
        ${descriptions[page] || ""}
      </p>

    </div>

  `;
}


// =====================================================
// BOTÕES DE NAVEGAÇÃO
// =====================================================

document
  .querySelectorAll("[data-student-page]")
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
  .querySelectorAll("[data-teacher-page]")
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
// CARREGAR AGENDA DO ALUNO
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


  // IMPORTANTE:
  // Agora enviamos ao Supabase a segunda-feira
  // da semana que o aluno está visualizando.

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
        p_week_start: weekStart
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


    row.appendChild(timeCell);


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

          cell.title =
            "Clique para escolher uma reposição";


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


      row.appendChild(cell);

    }


    body.appendChild(row);

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
// ENCONTRAR BLOCO
// =====================================================

function findScheduleSlot(
  schedule,
  day,
  time
) {

  return schedule.find(slot => {

    return (
      Number(slot.day_of_week) === day &&
      normalizeTime(slot.start_time) === time
    );

  });
}


// =====================================================
// NORMALIZAR STATUS
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
// REPOSIÇÕES
// =====================================================

async function loadAvailableMakeups() {

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


  return (data || []).filter(
    makeup =>
      makeup.status === "available"
  );
}


// =====================================================
// ABRIR SELEÇÃO DE REPOSIÇÃO
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
      Number(slot.day_of_week)
    );


  area.innerHTML = `

    <div class="card">

      <h3>
        Escolher reposição
      </h3>

      <p>

        <strong>
          ${formatDay(
            slot.day_of_week
          )}
        </strong>

        — ${formatDate(
          reservationDate
        )}

        às

        <strong>
          ${normalizeTime(
            slot.start_time
          )}
        </strong>

      </p>

      <p>
        Carregando suas reposições...
      </p>

    </div>

  `;


  const makeups =
    await loadAvailableMakeups();


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
          Não há uma reposição que possa
          ser utilizada neste horário.
        </p>

        <button
          type="button"
          class="secondary-button"
          id="closeMakeupSelection"
        >
          Fechar
        </button>

      </div>

    `;


    document
      .getElementById(
        "closeMakeupSelection"
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

        <strong>
          ${formatDay(
            slot.day_of_week
          )}
        </strong>

        — ${formatDate(
          reservationDate
        )}

        às

        <strong>
          ${normalizeTime(
            slot.start_time
          )}
        </strong>

      </p>


      <label for="makeupSelect">
        Escolha uma reposição:
      </label>


      <select
        id="makeupSelect"
        style="
          width:100%;
          padding:11px;
          margin-top:8px;
          border:1px solid #cfd5dc;
          border-radius:7px;
          font-size:15px;
        "
      >

        <option value="">
          Selecione...
        </option>

        ${compatibleMakeups
          .map(makeup => `

            <option
              value="${makeup.makeup_id}"
            >

              ${makeup.duration_minutes}
              minutos
              —
              ${formatMakeupSource(
                makeup.source
              )}

            </option>

          `)
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
// REPOSIÇÕES COMPATÍVEIS
// =====================================================

function getCompatibleMakeups(
  slot,
  makeups
) {

  const compatible = [];


  for (
    const makeup of makeups
  ) {

    const duration =
      Number(
        makeup.duration_minutes
      );


    if (duration === 30) {

      compatible.push(
        makeup
      );

      continue;
    }


    if (duration === 60) {

      const nextSlot =
        findNextFreeSlot(
          slot
        );


      if (nextSlot) {

        compatible.push(
          makeup
        );

      }

    }

  }


  return compatible;
}


// =====================================================
// VERIFICAR SEGUNDO BLOCO
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
      Number(slot.day_of_week),
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


  const selectedMakeup =
    select.options[
      select.selectedIndex
    ].textContent.trim();


  const reservationDate =
    getDateForDay(
      selectedWeekStart,
      Number(
        selectedScheduleSlot.day_of_week
      )
    );


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
        <strong>Dia:</strong>
        ${formatDay(
          selectedScheduleSlot.day_of_week
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
        ${selectedMakeup}
      </p>

      <p>
        Deseja confirmar esta reserva?
      </p>

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
          id="confirmRealReservationButton"
        >
          Confirmar reserva
        </button>

        <button
          type="button"
          class="secondary-button"
          id="backToMakeupSelection"
        >
          Voltar
        </button>

      </div>

      <p
        id="reservationMessage"
        style="
          margin-top:16px;
          font-weight:600;
        "
      ></p>

    </div>

  `;


  document
    .getElementById(
      "confirmRealReservationButton"
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
      "backToMakeupSelection"
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
      "confirmRealReservationButton"
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


  message.textContent =
    "";


  const dateString =
    formatDateForDatabase(
      reservationDate
    );


  const timeString =
    normalizeTime(
      startTime
    );


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
          dateString,

        p_start_time:
          timeString
      }
    );


  if (error) {

    console.error(
      "Erro ao reservar:",
      error
    );


    button.disabled = false;

    button.textContent =
      "Confirmar reserva";


    message.textContent =
      translateReservationError(
        error.message
      );

    return;
  }


  console.log(
    "Reserva criada:",
    data
  );


  message.innerHTML = `
    Reserva realizada com sucesso!<br>
    ${formatDate(reservationDate)}
    às
    ${timeString}.
  `;


  message.style.color =
    "#176b2c";


  button.remove();


  const backButton =
    document.getElementById(
      "backToMakeupSelection"
    );


  if (backButton) {

    backButton.textContent =
      "Voltar para a agenda";

    backButton.onclick = () => {

      closeMakeupSelection();

      loadStudentWeeklySchedule();

    };

  }


  await loadStudentWeeklySchedule();
}


// =====================================================
// ERROS
// =====================================================

function translateReservationError(
  message
) {

  const text =
    String(message || "")
      .toLowerCase();


  if (
    text.includes("não está disponível") ||
    text.includes("nao esta disponivel")
  ) {

    return (
      "Essa reposição não está mais disponível."
    );

  }


  if (
    text.includes("acabou de ser ocupado")
  ) {

    return (
      "Esse horário acabou de ser ocupado. Escolha outro horário."
    );

  }


  if (
    text.includes("usuário não autorizado") ||
    text.includes("usuario nao autorizado")
  ) {

    return (
      "Você não tem autorização para fazer esta reserva."
    );

  }


  if (
    text.includes("sobreposição") ||
    text.includes("sobreposicao")
  ) {

    return (
      "Esse horário entra em conflito com outra aula."
    );

  }


  return (
    "Não foi possível realizar a reserva. Tente novamente."
  );
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
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
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

function normalizeTime(time) {

  return String(time)
    .substring(0, 5);
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
    String(hours)
      .padStart(2, "0") +
    ":" +
    String(mins)
      .padStart(2, "0")
  );
}


// =====================================================
// TEXTOS
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


  return days[
    Number(day)
  ] || "";
}


function formatMakeupSource(
  source
) {

  if (source === "absence") {
    return "falta";
  }

  if (source === "manual") {
    return "professor";
  }

  return source || "reposição";
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
