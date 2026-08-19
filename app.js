// =====================================================
// ESTADO DO APLICATIVO
// =====================================================

let currentUser = null;
let currentProfile = null;

let selectedScheduleSlot = null;


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
    console.error("Erro ao carregar perfil:", error);
    return null;
  }

  return data;
}


// =====================================================
// MOSTRAR ÁREA DO ALUNO
// =====================================================

async function showStudentArea() {

  studentScreen.classList.remove("hidden");
  teacherScreen.classList.add("hidden");

  const header =
    document.getElementById("studentHeader");

  header.innerHTML = `
    <h2>Olá, ${currentProfile.name}</h2>
    <p>Área do aluno.</p>
  `;

  setStudentPage("agenda");
}


// =====================================================
// MOSTRAR ÁREA DO PROFESSOR
// =====================================================

async function showTeacherArea() {

  teacherScreen.classList.remove("hidden");
  studentScreen.classList.add("hidden");

  const header =
    document.getElementById("teacherHeader");

  header.innerHTML = `
    <h2>Olá, ${currentProfile.name}</h2>
    <p>Área do professor.</p>
  `;

  setTeacherPage("agenda");
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

  if (currentProfile.role === "student") {

    await showStudentArea();

  }

  else if (currentProfile.role === "teacher") {

    await showTeacherArea();

  }

  else {

    await supabaseClient.auth.signOut();

    loginScreen.classList.remove("hidden");

    loginMessage.textContent =
      "Tipo de usuário inválido.";
  }
}


// =====================================================
// NAVEGAÇÃO DO ALUNO
// =====================================================

function setStudentPage(page) {

  const content =
    document.getElementById("studentContent");

  const buttons =
    document.querySelectorAll(
      "[data-student-page]"
    );

  buttons.forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.studentPage === page
    );

  });


  // ---------------------------------------------------
  // AGENDA
  // ---------------------------------------------------

  if (page === "agenda") {

    content.innerHTML = `

      <div class="card schedule-section">

        <h3>
          Agenda semanal
        </h3>

        <p class="schedule-help">
          Clique em um horário verde para
          escolher uma reposição.
        </p>

        <div class="schedule-wrapper">

          <table
            id="studentScheduleTable"
            class="schedule-table"
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


  // ---------------------------------------------------
  // HISTÓRICO
  // ---------------------------------------------------

  if (page === "history") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Histórico de aulas
        </h3>

        <p>
          Aqui você poderá consultar seu
          histórico de aulas, matérias,
          conteúdos e presença.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // REPOSIÇÕES
  // ---------------------------------------------------

  if (page === "makeups") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Minhas reposições
        </h3>

        <p>
          Aqui aparecerão suas reposições
          disponíveis, utilizadas e expiradas.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // FINANCEIRO
  // ---------------------------------------------------

  if (page === "financial") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Minha mensalidade
        </h3>

        <p>
          Aqui aparecerá o valor da sua
          mensalidade para cada mês.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // REGRAS
  // ---------------------------------------------------

  if (page === "rules") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Regras
        </h3>

        <p>
          Aqui serão exibidas as regras
          definidas pelo seu professor.
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
    document.getElementById("teacherContent");

  const buttons =
    document.querySelectorAll(
      "[data-teacher-page]"
    );

  buttons.forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.teacherPage === page
    );

  });


  if (page === "agenda") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Agenda
        </h3>

        <p>
          Aqui ficará a agenda semanal
          completa do professor.
        </p>

      </div>

    `;

    return;
  }


  if (page === "students") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Alunos
        </h3>

        <p>
          Aqui serão exibidos os alunos
          vinculados a este professor.
        </p>

      </div>

    `;

    return;
  }


  if (page === "attendance") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Presença / Faltas
        </h3>

        <p>
          Aqui o professor poderá registrar
          presença e faltas.
        </p>

      </div>

    `;

    return;
  }


  if (page === "subjects") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Matérias
        </h3>

        <p>
          Aqui serão administradas matérias
          e conteúdos.
        </p>

      </div>

    `;

    return;
  }


  if (page === "planning") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Planejamento
        </h3>

        <p>
          Aqui serão planejadas aulas futuras.
        </p>

      </div>

    `;

    return;
  }


  if (page === "financial") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Financeiro
        </h3>

        <p>
          Aqui será feito o controle financeiro.
        </p>

      </div>

    `;

    return;
  }


  if (page === "rules") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Regras
        </h3>

        <p>
          Aqui o professor poderá definir
          as regras dos alunos.
        </p>

      </div>

    `;

    return;
  }
}


// =====================================================
// EVENTOS DOS BOTÕES DO ALUNO
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


// =====================================================
// EVENTOS DOS BOTÕES DO PROFESSOR
// =====================================================

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

  const scheduleBody =
    document.getElementById(
      "studentScheduleBody"
    );

  if (!scheduleBody) {
    return;
  }

  scheduleBody.innerHTML = `

    <tr>

      <td colspan="8">
        Carregando agenda...
      </td>

    </tr>

  `;


  const { data, error } =
    await supabaseClient.rpc(
      "get_student_weekly_schedule"
    );


  if (error) {

    console.error(
      "Erro ao carregar agenda:",
      error
    );

    scheduleBody.innerHTML = `

      <tr>

        <td colspan="8">
          Não foi possível carregar a agenda.
        </td>

      </tr>

    `;

    return;
  }


  renderStudentWeeklySchedule(
    data || []
  );
}


// =====================================================
// RENDERIZAR AGENDA
// =====================================================

function renderStudentWeeklySchedule(
  schedule
) {

  const scheduleBody =
    document.getElementById(
      "studentScheduleBody"
    );

  if (!scheduleBody) {
    return;
  }

  scheduleBody.innerHTML = "";


  const times = [];


  schedule.forEach(slot => {

    const time =
      String(slot.start_time)
        .substring(0, 5);

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
        schedule.find(item => {

          const itemTime =
            String(item.start_time)
              .substring(0, 5);

          return (
            Number(item.day_of_week) === day &&
            itemTime === time
          );

        });


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


        // ---------------------------------------------
        // HORÁRIO LIVRE
        // ---------------------------------------------

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


    scheduleBody.appendChild(row);

  });


  if (times.length === 0) {

    scheduleBody.innerHTML = `

      <tr>

        <td colspan="8">
          Nenhum horário cadastrado.
        </td>

      </tr>

    `;

  }
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
// BUSCAR REPOSIÇÕES DO ALUNO
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

  selectedScheduleSlot = slot;


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
        <strong>
          ${formatDay(slot.day_of_week)}
          às
          ${String(slot.start_time).substring(0, 5)}
        </strong>
      </p>

      <p>
        Carregando suas reposições...
      </p>

    </div>

  `;


  const makeups =
    await loadAvailableMakeups();


  const matchingMakeups =
    makeups.filter(
      makeup =>
        makeup.duration_minutes ===
        getSlotDuration(slot)
    );


  if (matchingMakeups.length === 0) {

    area.innerHTML = `

      <div class="card">

        <h3>
          Nenhuma reposição compatível
        </h3>

        <p>
          Você não possui uma reposição de
          ${getSlotDuration(slot)} minutos
          disponível para este horário.
        </p>

        <button
          type="button"
          class="secondary-button"
          id="cancelMakeupSelection"
        >
          Fechar
        </button>

      </div>

    `;


    document
      .getElementById(
        "cancelMakeupSelection"
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
        Horário:
        <strong>
          ${formatDay(slot.day_of_week)}
          às
          ${String(slot.start_time).substring(0, 5)}
        </strong>
      </p>


      <div>

        <label for="makeupSelect">
          Escolha uma reposição:
        </label>

        <select
          id="makeupSelect"
          class="makeup-select"
        >

          <option value="">
            Selecione...
          </option>

          ${matchingMakeups
            .map(makeup => `

              <option value="${makeup.makeup_id}">

                ${makeup.duration_minutes}
                minutos
                —
                ${formatMakeupSource(makeup.source)}

              </option>

            `)
            .join("")}

        </select>

      </div>


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
          id="confirmMakeupButton"
        >
          Continuar
        </button>


        <button
          type="button"
          class="secondary-button"
          id="cancelMakeupSelection"
        >
          Cancelar
        </button>

      </div>

    </div>

  `;


  document
    .getElementById(
      "confirmMakeupButton"
    )
    .addEventListener(
      "click",
      prepareMakeupReservation
    );


  document
    .getElementById(
      "cancelMakeupSelection"
    )
    .addEventListener(
      "click",
      closeMakeupSelection
    );
}


// =====================================================
// DURAÇÃO DO HORÁRIO
// =====================================================

function getSlotDuration(slot) {

  const start =
    timeToMinutes(
      slot.start_time
    );

  const end =
    timeToMinutes(
      slot.end_time
    );


  return end - start;
}


// =====================================================
// CONVERTER HORÁRIO
// =====================================================

function timeToMinutes(time) {

  const parts =
    String(time)
      .substring(0, 5)
      .split(":");


  return (
    Number(parts[0]) * 60 +
    Number(parts[1])
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
        Você selecionou:
      </p>

      <p>
        <strong>
          ${formatDay(
            selectedScheduleSlot.day_of_week
          )}
        </strong>
        às
        <strong>
          ${String(
            selectedScheduleSlot.start_time
          ).substring(0, 5)}
        </strong>
      </p>

      <p>
        A reserva será realizada
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

  selectedScheduleSlot = null;


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


  return days[Number(day)] || "";
}


// =====================================================
// ORIGEM DA REPOSIÇÃO
// =====================================================

function formatMakeupSource(source) {

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


    loginMessage.textContent = "";


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
