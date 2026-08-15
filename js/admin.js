import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getAdminDashboard = httpsCallable(functions, "getAdminDashboard");
const getAdminQuiz = httpsCallable(functions, "getAdminQuiz");
const saveAdminQuiz = httpsCallable(functions, "saveAdminQuiz");
const updateStudentStatus = httpsCallable(functions, "updateStudentStatus");
const createAnnouncement = httpsCallable(functions, "createAnnouncement");
const toggleAnnouncement = httpsCallable(functions, "toggleAnnouncement");
const rebuildStats = httpsCallable(functions, "rebuildStats");

const $ = id => document.getElementById(id);
let dashboard = { students: [], recentAttempts: [], announcements: [] };

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"
  }[c]));
}

function message(text, error = false) {
  const el = $("adminMessage");
  if (!el) return;
  el.textContent = text;
  el.className = `admin-message show${error ? "" : ""}`;
  window.clearTimeout(message.timer);
  message.timer = window.setTimeout(() => el.classList.remove("show"), 4500);
}

function renderStats(stats) {
  $("statStudents").textContent = stats.students ?? 0;
  $("statAttempts").textContent = stats.quizzesTaken ?? 0;
  $("statPoints").textContent = stats.pointsAwarded ?? 0;
  $("statAnnouncements").textContent = stats.activeAnnouncements ?? 0;
}

function renderAttempts() {
  const el = $("recentAttempts");
  if (!dashboard.recentAttempts.length) {
    el.innerHTML = '<div class="admin-empty">No quiz attempts yet.</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Points</th><th>Completed</th></tr></thead><tbody>${
    dashboard.recentAttempts.map(a => `
      <tr>
        <td>${esc(findStudent(a)?.fullName || "Student")}</td>
        <td>${esc(a.quizTitle)}</td>
        <td>${a.score}/${a.totalQuestions}</td>
        <td>${a.points}</td>
        <td>${a.completedAt ? new Date(a.completedAt).toLocaleString("en-NG") : "—"}</td>
      </tr>`).join("")
  }</tbody></table>`;
}

function findStudent(attempt) {
  return dashboard.students.find(s => s.id === attempt.studentId);
}

function renderStudents(filter = "") {
  const el = $("studentsTable");
  const q = filter.trim().toLowerCase();
  const rows = dashboard.students.filter(s =>
    !q || [s.fullName, s.email, s.registrationNumber, s.school, s.state]
      .some(v => String(v || "").toLowerCase().includes(q))
  );

  if (!rows.length) {
    el.innerHTML = '<div class="admin-empty">No matching students.</div>';
    return;
  }

  el.innerHTML = `<table class="admin-table"><thead><tr><th>Student</th><th>Registration</th><th>School</th><th>Points</th><th>Quizzes</th><th>Status</th></tr></thead><tbody>${
    rows.map(s => `
      <tr>
        <td><strong>${esc(s.fullName)}</strong><br><small>${esc(s.email)}</small></td>
        <td>${esc(s.registrationNumber)}</td>
        <td>${esc(s.school)}<br><small>${esc(s.state)}</small></td>
        <td>${s.totalPoints}</td>
        <td>${s.quizzesCompleted}</td>
        <td><button class="status-btn ${s.status === "Suspended" ? "suspended" : "active"}" data-status-uid="${esc(s.id)}" data-status="${s.status === "Suspended" ? "Active" : "Suspended"}">${esc(s.status)}</button></td>
      </tr>`).join("")
  }</tbody></table>`;

  el.querySelectorAll("[data-status-uid]").forEach(btn => btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await updateStudentStatus({ uid: btn.dataset.statusUid, status: btn.dataset.status });
      message("Student status updated.");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      message(error?.message || "Unable to update student.", true);
      btn.disabled = false;
    }
  }));
}

function renderAnnouncements() {
  const el = $("announcementsList");
  if (!dashboard.announcements.length) {
    el.innerHTML = '<div class="admin-empty">No announcements.</div>';
    return;
  }
  el.innerHTML = dashboard.announcements.map(a => `
    <article class="announcement-item">
      <strong>${esc(a.title)}</strong>
      <p>${esc(a.body)}</p>
      <small>${a.active ? "Active" : "Hidden"}</small>
      <br>
      <button class="status-btn" data-announcement-id="${esc(a.id)}" data-announcement-active="${a.active ? "false" : "true"}">${a.active ? "Hide" : "Publish"}</button>
    </article>
  `).join("");

  el.querySelectorAll("[data-announcement-id]").forEach(btn => btn.addEventListener("click", async () => {
    try {
      await toggleAnnouncement({ id: btn.dataset.announcementId, active: btn.dataset.announcementActive === "true" });
      message("Announcement updated.");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      message(error?.message || "Unable to update announcement.", true);
    }
  }));
}

function renderQuestionEditor(questions) {
  const editor = $("questionEditor");
  editor.innerHTML = questions.map((q, i) => `
    <article class="question-card" data-question="${i}">
      <div class="question-card-head"><strong>Question ${i + 1}</strong><button type="button" class="status-btn delete-question">Remove</button></div>
      <textarea class="admin-input q-text" rows="3">${esc(q.question)}</textarea>
      <div class="answer-grid">
        ${q.answers.map((a, j) => `
          <label class="answer-row">
            <input type="radio" name="correct-${i}" value="${j}" ${Number(q.correct) === j ? "checked" : ""}>
            <input class="admin-input q-answer" type="text" value="${esc(a)}" maxlength="300" placeholder="Answer ${j + 1}">
          </label>`).join("")}
      </div>
    </article>
  `).join("");

  editor.querySelectorAll(".delete-question").forEach(button => button.addEventListener("click", () => {
    const cards = editor.querySelectorAll(".question-card");
    if (cards.length <= 1) return message("A quiz must contain at least one question.", true);
    button.closest(".question-card")?.remove();
    renumberQuestions();
  }));
}

function renumberQuestions() {
  document.querySelectorAll(".question-card").forEach((card, i) => {
    card.dataset.question = i;
    const title = card.querySelector(".question-card-head strong");
    if (title) title.textContent = `Question ${i + 1}`;
    card.querySelectorAll('input[type="radio"]').forEach(radio => {
      radio.name = `correct-${i}`;
    });
  });
}

async function loadQuiz() {
  try {
    const { data } = await getAdminQuiz();
    $("quizTitle").value = data.title || "Daily Quiz";
    $("quizActive").checked = data.active !== false;
    renderQuestionEditor(data.questions || []);
  } catch (error) {
    console.error(error);
    message(error?.message || "Unable to load quiz.", true);
  }
}

function collectQuestions() {
  return [...document.querySelectorAll(".question-card")].map((card, i) => ({
    id: `q${i + 1}`,
    question: card.querySelector(".q-text").value.trim(),
    answers: [...card.querySelectorAll(".q-answer")].map(input => input.value.trim()),
    correct: Number(card.querySelector(`input[name="correct-${i}"]:checked`)?.value ?? -1)
  }));
}

async function loadDashboard() {
  const { data } = await getAdminDashboard();
  dashboard = data;
  renderStats(data.stats || {});
  renderAttempts();
  renderStudents($("studentSearch").value);
  renderAnnouncements();
}

document.querySelectorAll(".admin-tab").forEach(tab => tab.addEventListener("click", async () => {
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
  tab.classList.add("active");
  document.querySelector(`[data-panel="${tab.dataset.tab}"]`)?.classList.add("active");
  if (tab.dataset.tab === "quiz") await loadQuiz();
}));

$("studentSearch")?.addEventListener("input", e => renderStudents(e.target.value));

$("addQuestion")?.addEventListener("click", () => {
  const cards = document.querySelectorAll(".question-card");
  const next = cards.length;
  if (next >= 50) return message("The maximum is 50 questions.", true);
  const wrapper = $("questionEditor");
  const card = document.createElement("article");
  card.className = "question-card";
  card.dataset.question = next;
  card.innerHTML = `
    <div class="question-card-head"><strong>Question ${next + 1}</strong><button type="button" class="status-btn delete-question">Remove</button></div>
    <textarea class="admin-input q-text" rows="3" placeholder="Question text"></textarea>
    <div class="answer-grid">
      ${[0,1,2,3].map(j => `<label class="answer-row"><input type="radio" name="correct-${next}" value="${j}" ${j === 0 ? "checked" : ""}><input class="admin-input q-answer" type="text" maxlength="300" placeholder="Answer ${j + 1}"></label>`).join("")}
    </div>`;
  wrapper.appendChild(card);
  card.querySelector(".delete-question").addEventListener("click", () => {
    if (wrapper.querySelectorAll(".question-card").length <= 1) return message("A quiz must contain at least one question.", true);
    card.remove();
    renumberQuestions();
  });
});

$("saveQuiz")?.addEventListener("click", async () => {
  const button = $("saveQuiz");
  button.disabled = true;
  try {
    await saveAdminQuiz({
      title: $("quizTitle").value.trim(),
      active: $("quizActive").checked,
      questions: collectQuestions()
    });
    message("Daily Quiz saved successfully.");
  } catch (error) {
    console.error(error);
    message(error?.message || "Unable to save quiz.", true);
  } finally {
    button.disabled = false;
  }
});

$("rebuildStats")?.addEventListener("click", async () => {
  const button = $("rebuildStats");
  if (!confirm("Recalculate points, quiz counts, averages and rankings from stored quiz attempts?")) return;
  button.disabled = true;
  try {
    const { data } = await rebuildStats();
    message(`Statistics rebuilt for ${data.students} students.`);
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error?.message || "Unable to rebuild statistics.", true);
  } finally {
    button.disabled = false;
  }
});

$("announcementForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await createAnnouncement({
      title: $("announcementTitle").value.trim(),
      body: $("announcementBody").value.trim()
    });
    event.target.reset();
    message("Announcement published.");
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error?.message || "Unable to publish announcement.", true);
  }
});

$("logoutButton")?.addEventListener("click", async () => {
  await signOut(auth);
  location.href = "auth.html";
});

onAuthStateChanged(auth, async user => {
  if (!user) return (location.href = "auth.html");
  try {
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error?.message || "Administrator access denied.", true);
    setTimeout(() => location.href = "dashboard.html", 1200);
  }
});
