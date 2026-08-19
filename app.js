// =====================================================
// ESTADO DO APLICATIVO
// =====================================================

let currentUser = null;
let currentProfile = null;

let selectedScheduleSlot = null;
let currentStudentSchedule = [];


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
    console.error(error);
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
// NAVEGAÇÃO ALUNO
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

        <h3>Agenda semanal</h3>

        <p class="schedule-help">
          Clique em um horário verde para
          escolher uma reposição.
        </p>

        <div class="schedule-wrapper">

          <table
            class="schedule-table"
            id="studentScheduleTable"
          >

            <thead>

              <tr>

                <th>Horário</th>
                <th>Segunda</th>
                <th>Terça</th>
                <th>Quarta</th>
                <th>Quinta</th>
                <th>Sexta</th>
                <th>Sábado</th>
                <th>Domingo</th>

              </tr>

            </thead>

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


      <div
        id="makeupSelectionArea"
      ></div>

    `;

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
          Aqui aparecerá sua mensalidade
          por mês.
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
// NAVEGAÇÃO PROFESSOR
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


  const { data, error } =
    await supabaseClient.rpc(
      "get_student_weekly_schedule"
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

  const body =
    document.getElementById(
      "studentScheduleBody"
    );

  if (!body) {
    return;
  }


  body.innerHTML = "";


  const times = [];


  schedule.forEach(slot => {

    const time =
      normalizeTime(slot.start_time);

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

    timeCell.textContent = time;

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
          status.className === "available"
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
// NORMALIZAR HORÁRIO
// =====================================================

function normalizeTime(time) {

  return String(time)
    .substring(0, 5);
}


// =====================================================
// STATUS
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
// BUSCAR REPOSIÇÕES
// =====================================================

async function loadAvailableMakeups() {

  const { data, error } =
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
// ABRIR SELEÇÃO
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


  area.innerHTML = `

    <div class="card">

      <h3>
        Escolher reposição
      </h3>

      <p>
        Horário selecionado:
      </p>

      <p>

        <strong>
          ${formatDay(
            slot.day_of_week
          )}
        </strong>

        às

        <strong>
          ${normalizeTime(
            slot.start_time
          )}
        </strong>

      </p>

      <p>
        Carregando reposições...
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
        class="form-group"
        style="
          width:100%;
          padding:11px;
          margin-top:8px;
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
// VERIFICAR REPOSIÇÕES COMPATÍVEIS
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


    // -----------------------------------------------
    // 30 minutos
    // -----------------------------------------------

    if (duration === 30) {

      compatible.push(
        makeup
      );

      continue;
    }


    // -----------------------------------------------
    // 60 minutos
    // -----------------------------------------------

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
// VERIFICAR SEGUNDO BLOCO PARA 60 MIN
// =====================================================

function findNextFreeSlot(
  slot
) {

  const currentStart =
    timeToMinutes(
      slot.start_time
    );


  const nextStart =
    currentStart + 30;


  const nextTime =
    minutesToTime(
      nextStart
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
    status.className !== "available"
  ) {

    return null;

  }


  return nextSlot;
}


// =====================================================
// HORÁRIO → MINUTOS
// =====================================================

function timeToMinutes(time) {

  const parts =
    normalizeTime(time)
      .split(":");


  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
  );
}


// =====================================================
// MINUTOS → HORÁRIO
// =====================================================

function minutesToTime(minutes) {

  const hours =
    Math.floor(minutes / 60);

  const mins =
    minutes % 60;


  return (
    String(hours).padStart(2, "0") +
    ":" +
    String(mins).padStart(2, "0")
  );
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


  const area =
    document.getElementById(
      "makeupSelectionArea"
    );


  area.innerHTML = `

    <div class="card">

      <h3>
        Confirmar escolha
      </h3>

      <p>
        Horário:
      </p>

      <p>

        <strong>
          ${formatDay(
            selectedScheduleSlot.day_of_week
          )}
        </strong>

        às

        <strong>
          ${normalizeTime(
            selectedScheduleSlot.start_time
          )}
        </strong>

      </p>


      <p>
        Reposição:
        <strong>
          ${selectedMakeup}
        </strong>
      </p>


      <p>
        A reserva real será ativada
        na próxima etapa.
      </p>


      <button
        type="button"
        class="secondary-button"
        id="backToMakeupSelection"
      >
        Voltar
      </button>

    </div>

  `;


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


  return days[
    Number(day)
  ] || "";
}


// =====================================================
// ORIGEM DA REPOSIÇÃO
// =====================================================

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


    const { data, error } =
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


    const { error } =
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
// OBSERVAR AUTENTICAÇÃO
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
