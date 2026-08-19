// =====================================================
// ESTADO DO APLICATIVO
// =====================================================

let currentUser = null;
let currentProfile = null;


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


  // Agenda é a página inicial
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


  // Agenda é a página inicial
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
          Os horários verdes estão disponíveis
          para reposição.
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

        <p>
          Esta tela será conectada ao
          histórico do Supabase na próxima etapa.
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

        <p>
          A reserva será feita pela agenda.
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

        <p>
          Você verá somente seus próprios
          dados financeiros.
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


  // ---------------------------------------------------
  // AGENDA
  // ---------------------------------------------------

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

        <p>
          O professor poderá visualizar
          alunos, horários livres,
          indisponíveis e reposições.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // ALUNOS
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // PRESENÇA / FALTAS
  // ---------------------------------------------------

  if (page === "attendance") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Presença / Faltas
        </h3>

        <p>
          Aqui o professor poderá registrar
          presença, falta e demais situações
          da aula.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // MATÉRIAS
  // ---------------------------------------------------

  if (page === "subjects") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Matérias
        </h3>

        <p>
          Aqui o professor poderá administrar
          matérias e conteúdos.
        </p>

      </div>

    `;

    return;
  }


  // ---------------------------------------------------
  // PLANEJAMENTO
  // ---------------------------------------------------

  if (page === "planning") {

    content.innerHTML = `

      <div class="card">

        <h3>
          Planejamento
        </h3>

        <p>
          Aqui o professor poderá planejar
          conteúdos e matérias para aulas futuras.
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
          Financeiro
        </h3>

        <p>
          Aqui o professor poderá controlar
          mensalidades e pagamentos.
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
          Aqui o professor poderá definir
          as regras exibidas aos alunos.
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

        const page =
          button.dataset.studentPage;

        setStudentPage(page);

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

        const page =
          button.dataset.teacherPage;

        setTeacherPage(page);

      }
    );

  });


// =====================================================
// AGENDA SEMANAL DO ALUNO
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

          Não foi possível carregar
          a agenda.

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
// RENDERIZAR AGENDA DO ALUNO
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


  // ---------------------------------------------------
  // Horários existentes
  // ---------------------------------------------------

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


  // ---------------------------------------------------
  // Criar linhas
  // ---------------------------------------------------

  times.forEach(time => {

    const row =
      document.createElement("tr");


    const timeCell =
      document.createElement("td");


    timeCell.textContent =
      time;


    row.appendChild(timeCell);


    // Segunda até domingo
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


      // ------------------------------------------------
      // Sem horário cadastrado
      // ------------------------------------------------

      if (!slot) {

        cell.textContent = "—";

        cell.classList.add(
          "unavailable"
        );

      }


      // ------------------------------------------------
      // Horário existente
      // ------------------------------------------------

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

      }


      row.appendChild(cell);

    }


    scheduleBody.appendChild(row);

  });


  // ---------------------------------------------------
  // Nenhum horário
  // ---------------------------------------------------

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
// INICIALIZAR APLICATIVO
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
