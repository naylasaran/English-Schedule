// HISTÓRICO
// ===================================================

  if (page === "history") {
 if (page === "history") {

    content.innerHTML = `
  content.innerHTML = `

      <div class="card">
    <div class="card">

        <h3>Histórico de aulas</h3>
      <h3>Histórico de aulas</h3>

        <p>
          Em breve serão exibidos aqui
          seu histórico, matérias,
          conteúdos e presença.
        </p>
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

    `;
    </div>

    return;
  }
  `;

  loadStudentHistory();

  return;
}


// ===================================================
@@ -402,7 +410,605 @@ function setStudentPage(page) {
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
