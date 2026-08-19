let currentUser = null;
let currentProfile = null;

const loginScreen = document.getElementById("loginScreen");
const studentScreen = document.getElementById("studentScreen");
const teacherScreen = document.getElementById("teacherScreen");

const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const logoutButton = document.getElementById("logoutButton");
const forgotPasswordButton = document.getElementById("forgotPasswordButton");


async function loadProfile(userId) {
  const { data, error } = await supabaseClient
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


async function showLoggedUser(user) {
  currentUser = user;

  currentProfile = await loadProfile(user.id);

  if (!currentProfile) {
    loginMessage.textContent =
      "Não foi possível carregar seu perfil.";
    return;
  }

  loginScreen.classList.add("hidden");

  if (currentProfile.role === "teacher") {
    teacherScreen.classList.remove("hidden");
    studentScreen.classList.add("hidden");

    document.getElementById("teacherContent").innerHTML = `
      <h2>Olá, ${currentProfile.name}</h2>
      <p>Área do professor.</p>
    `;
  }

  else if (currentProfile.role === "student") {
    studentScreen.classList.remove("hidden");
    teacherScreen.classList.add("hidden");

    document.getElementById("studentContent").innerHTML = `
      <h2>Olá, ${currentProfile.name}</h2>
      <p>Área do aluno.</p>
    `;
  }

  else {
    await supabaseClient.auth.signOut();

    loginScreen.classList.remove("hidden");

    loginMessage.textContent =
      "Tipo de usuário inválido.";
  }
}


loginForm.addEventListener("submit", async (event) => {

  event.preventDefault();

  loginMessage.textContent = "Entrando...";

  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
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

  await showLoggedUser(data.user);
});


logoutButton.addEventListener("click", async () => {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;

  teacherScreen.classList.add("hidden");
  studentScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  loginForm.reset();
});


forgotPasswordButton.addEventListener("click", async () => {

  const email =
    document.getElementById("email").value.trim();

  if (!email) {
    loginMessage.textContent =
      "Digite seu e-mail primeiro.";

    return;
  }

  const { error } =
    await supabaseClient.auth.resetPasswordForEmail(
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
});


async function initializeApp() {

  const {
    data: {
      session
    }
  } = await supabaseClient.auth.getSession();

  if (session?.user) {
    await showLoggedUser(session.user);
  }
}


supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === "SIGNED_IN" &&
      session?.user
    ) {
      await showLoggedUser(session.user);
    }

  }
);


initializeApp();
