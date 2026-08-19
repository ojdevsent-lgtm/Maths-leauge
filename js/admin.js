import { auth, db, firebaseSignOut } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
const state = { students: [], attempts: [], quizzes: [], announcements: [], activeQuizId: null };

function setError(text) {
  const el = $("error");
  if (!el) return;
  el.textContent = text || "";
  el.hidden = !text;
}

function message(text) {
  setError(text);
  if (text) setTimeout(() => setError(""), 5000);
}

async function assertAdmin(user) {
  const snap = await getDoc(doc(db, "admin_users", user.uid));
  if (!snap.exists()) throw new Error("This account is not an administrator.");
}

function stamp(value) {
  if (!value) return "—";
  if (typeof value.toDate === "function") return value.toDate().toLocaleString("en-NG");
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-NG");
}

function buildAggregates() {
  const byStudent = new Map();
  for (const attempt of state.attempts) {
    if (attempt.status !== "submitted" || !attempt.studentId) continue;
    const row = byStudent.get(attempt.studentId) || { points: 0, quizzes: 0, accuracyTotal: 0 };
    row.points += Number(attempt.leaguePointsAwarded ?? attempt.points ?? 0);
    row.quizzes += 1;
    row.accuracyTotal += Number(attempt.accuracy ?? 0);
    byStudent.set(attempt.studentId, row);
  }
  return byStudent;
}

function renderStats() {
  const aggregate = buildAggregates();
  const points = [...aggregate.values()].reduce((sum, row) => sum + row.points, 0);
  const activeAnnouncements = state.announcements.filter(item => item.active).length;
  const stat = (label, value) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
  $("stats").innerHTML = [
    stat("Students", state.students.length),
    stat("Quiz attempts", state.attempts.filter(a => a.status === "submitted").length),
    stat("Points awarded", points),
    stat("Active announcements", activeAnnouncements)
  ].join("");
}

function renderQuizzes() {
  const el = $("quizzes");
  if (!el) return;
  if (!state.quizzes.length) {
    el.innerHTML = '<p class="muted">No quizzes created yet.</p>';
    return;
  }
  el.innerHTML = state.quizzes.map(quiz => `
    <article class="card quiz-admin-card">
      <div><strong>${esc(quiz.title)}</strong><p>${esc(quiz.description || "")}</p><small>${esc(quiz.status || "draft")} · ${Number(quiz.questionCount || 0)} questions · ${Number(quiz.durationMinutes || 10)} min</small></div>
      <div class="actions">
        <button type="button" data-add-question="${esc(quiz.id)}">Add question</button>
        ${quiz.status === "live"
          ? `<button type="button" data-close-quiz="${esc(quiz.id)}">Close quiz</button>`
          : `<button type="button" data-publish-quiz="${esc(quiz.id)}">Publish live</button>`}
      </div>
    </article>
  `).join("");

  el.querySelectorAll("[data-add-question]").forEach(button => button.addEventListener("click", () => openQuestionPanel(button.dataset.addQuestion)));
  el.querySelectorAll("[data-publish-quiz]").forEach(button => button.addEventListener("click", () => changeQuizStatus(button.dataset.publishQuiz, "live")));
  el.querySelectorAll("[data-close-quiz]").forEach(button => button.addEventListener("click", () => changeQuizStatus(button.dataset.closeQuiz, "closed")));
}

function renderAttempts() {
  const el = $("attempts");
  if (!el) return;
  const students = new Map(state.students.map(student => [student.uid, student]));
  const quizzes = new Map(state.quizzes.map(quiz => [quiz.id, quiz]));
  const rows = [...state.attempts]
    .filter(a => a.status === "submitted")
    .sort((a, b) => (b.submittedAt?.toMillis?.() ?? 0) - (a.submittedAt?.toMillis?.() ?? 0))
    .slice(0, 30);

  if (!rows.length) {
    el.innerHTML = '<p class="muted">No submitted attempts yet.</p>';
    return;
  }

  el.innerHTML = `<table><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Accuracy</th><th>Points</th><th>Submitted</th></tr></thead><tbody>${rows.map(attempt => {
    const student = students.get(attempt.studentId) || {};
    const quiz = quizzes.get(attempt.quizId) || {};
    return `<tr><td>${esc(student.fullName || "Student")}</td><td>${esc(quiz.title || "Quiz")}</td><td>${Number(attempt.score || 0)}/${Number(attempt.totalQuestions || 0)}</td><td>${Number(attempt.accuracy || 0)}%</td><td>${Number(attempt.leaguePointsAwarded || 0)}</td><td>${stamp(attempt.submittedAt)}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderStudents(filter = "") {
  const el = $("students");
  if (!el) return;
  const q = filter.trim().toLowerCase();
  const aggregate = buildAggregates();
  const rows = state.students.filter(student => !q || [student.fullName, student.email, student.registrationNumber, student.school, student.state].some(value => String(value || "").toLowerCase().includes(q)));

  if (!rows.length) {
    el.innerHTML = '<p class="muted">No matching students.</p>';
    return;
  }

  el.innerHTML = `<table><thead><tr><th>Student</th><th>School</th><th>Points</th><th>Quizzes</th><th>Accuracy</th><th>Status</th></tr></thead><tbody>${rows.map(student => {
    const stats = aggregate.get(student.uid) || { points: 0, quizzes: 0, accuracyTotal: 0 };
    const accuracy = stats.quizzes ? Math.round(stats.accuracyTotal / stats.quizzes) : 0;
    return `<tr><td><strong>${esc(student.fullName || "Student")}</strong><br><small>${esc(student.email)}</small></td><td>${esc(student.school || "—")}</td><td><strong>${stats.points}</strong></td><td>${stats.quizzes}</td><td>${accuracy}%</td><td><button type="button" class="status-btn" data-student-id="${esc(student.uid)}">${esc(student.status || "active")}</button></td></tr>`;
  }).join("")}</tbody></table>`;

  el.querySelectorAll("[data-student-id]").forEach(button => button.addEventListener("click", () => toggleStudent(button.dataset.studentId)));
}

function renderAnnouncements() {
  const el = $("announcements");
  if (!el) return;
  el.innerHTML = state.announcements.length
    ? state.announcements.map(item => `<article class="card"><strong>${esc(item.title)}</strong><p>${esc(item.body)}</p><small>${item.active ? "Active" : "Hidden"}</small><br><button type="button" data-announcement-id="${esc(item.id)}">${item.active ? "Hide" : "Publish"}</button></article>`).join("")
    : '<p class="muted">No announcements yet.</p>';
  el.querySelectorAll("[data-announcement-id]").forEach(button => button.addEventListener("click", () => toggleAnnouncement(button.dataset.announcementId)));
}

async function loadDashboard() {
  const [studentsSnap, attemptsSnap, quizzesSnap, announcementsSnap] = await Promise.all([
    getDocs(collection(db, "students")),
    getDocs(collection(db, "attempts")),
    getDocs(collection(db, "quizzes")),
    getDocs(collection(db, "announcements"))
  ]);
  state.students = studentsSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
  state.attempts = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  state.quizzes = quizzesSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.createdAt?.toMillis?.() ?? "").localeCompare(String(a.createdAt?.toMillis?.() ?? "")));
  state.announcements = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.publishedAt?.toMillis?.() ?? 0) - (a.publishedAt?.toMillis?.() ?? 0));
  renderStats();
  renderQuizzes();
  renderAttempts();
  renderStudents($("studentSearch")?.value || "");
  renderAnnouncements();
}

async function changeQuizStatus(quizId, status) {
  try {
    await updateDoc(doc(db, "quizzes", quizId), { status, updatedAt: serverTimestamp() });
    message(status === "live" ? "Quiz is now live." : "Quiz closed.");
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error.message || "Unable to update quiz.");
  }
}

function openQuestionPanel(quizId) {
  state.activeQuizId = quizId;
  $("questionPanel").hidden = false;
  const quiz = state.quizzes.find(item => item.id === quizId);
  $("questionHeading").textContent = `Add question — ${quiz?.title || "Quiz"}`;
  $("questionForm").reset();
  $("questionPoints").value = "1";
  $("questionOrder").value = String((quiz?.questionCount || 0) + 1);
  window.scrollTo({ top: $("questionPanel").offsetTop - 20, behavior: "smooth" });
}

$("questionForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!state.activeQuizId) return;
  const inputs = [...document.querySelectorAll(".optionInput")].map(input => input.value.trim()).filter(Boolean);
  try {
    await addDoc(collection(db, "quizzes", state.activeQuizId, "questions"), {
      text: $("questionText").value.trim(),
      options: inputs,
      correctIndex: Number($("correctIndex").value),
      points: Number($("questionPoints").value || 1),
      order: Number($("questionOrder").value || 1),
      active: true,
      createdAt: serverTimestamp()
    });
    const quizRef = doc(db, "quizzes", state.activeQuizId);
    const quiz = state.quizzes.find(item => item.id === state.activeQuizId);
    await updateDoc(quizRef, { questionCount: Number(quiz?.questionCount || 0) + 1, updatedAt: serverTimestamp() });
    $("questionPanel").hidden = true;
    message("Question saved.");
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error.message || "Unable to save question.");
  }
});

$("closeQuestion")?.addEventListener("click", () => { $("questionPanel").hidden = true; state.activeQuizId = null; });

$("quizForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const ref = await addDoc(collection(db, "quizzes"), {
      title: $("quizTitle").value.trim(),
      description: $("quizDescription").value.trim(),
      durationMinutes: Number($("quizDuration").value || 10),
      questionCount: 0,
      status: "draft",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    $("quizForm").reset();
    $("quizDuration").value = "10";
    message(`Draft quiz created: ${ref.id}`);
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error.message || "Unable to create quiz.");
  }
});

$("announcementForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await addDoc(collection(db, "announcements"), {
      title: $("announcementTitle").value.trim(),
      body: $("announcementBody").value.trim(),
      active: true,
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
    $("announcementForm").reset();
    message("Announcement published.");
    await loadDashboard();
  } catch (error) {
    console.error(error);
    message(error.message || "Unable to create announcement.");
  }
});

async function toggleAnnouncement(id) {
  const item = state.announcements.find(row => row.id === id);
  if (!item) return;
  try {
    await updateDoc(doc(db, "announcements", id), { active: !item.active, updatedAt: serverTimestamp() });
    await loadDashboard();
  } catch (error) {
    message(error.message || "Unable to update announcement.");
  }
}

async function toggleStudent(uid) {
  const student = state.students.find(row => row.uid === uid);
  if (!student) return;
  const status = String(student.status || "active").toLowerCase() === "suspended" ? "active" : "suspended";
  try {
    await updateDoc(doc(db, "students", uid), { status, updatedAt: serverTimestamp() });
    await loadDashboard();
  } catch (error) {
    message(error.message || "Unable to update student.");
  }
}

async function rebuildStatistics() {
  const aggregate = buildAggregates();
  const batches = [];
  let batch = writeBatch(db);
  let writes = 0;

  for (const student of state.students) {
    const stats = aggregate.get(student.uid) || { points: 0, quizzes: 0, accuracyTotal: 0 };
    const averageAccuracy = stats.quizzes ? Math.round(stats.accuracyTotal / stats.quizzes) : 0;
    batch.update(doc(db, "students", student.uid), {
      leaguePoints: stats.points,
      quizzesTaken: stats.quizzes,
      averageAccuracy,
      updatedAt: serverTimestamp()
    });
    writes += 1;
    if (writes === 450) {
      batches.push(batch.commit());
      batch = writeBatch(db);
      writes = 0;
    }
  }
  if (writes) batches.push(batch.commit());
  await Promise.all(batches);

  const leaderboardBatches = [];
  batch = writeBatch(db);
  writes = 0;
  for (const student of state.students) {
    const stats = aggregate.get(student.uid) || { points: 0, quizzes: 0, accuracyTotal: 0 };
    const averageAccuracy = stats.quizzes ? Math.round(stats.accuracyTotal / stats.quizzes) : 0;
    batch.set(doc(db, "leaderboard", student.uid), {
      studentId: student.uid,
      displayName: student.fullName || "Student",
      school: student.school || "",
      status: student.status || "active",
      leaguePoints: stats.points,
      quizzesTaken: stats.quizzes,
      averageAccuracy,
      updatedAt: serverTimestamp()
    }, { merge: true });
    writes += 1;
    if (writes === 450) {
      leaderboardBatches.push(batch.commit());
      batch = writeBatch(db);
      writes = 0;
    }
  }
  if (writes) leaderboardBatches.push(batch.commit());
  await Promise.all(leaderboardBatches);
}

$("refresh")?.addEventListener("click", async () => {
  const button = $("refresh");
  button.disabled = true;
  button.textContent = "Rebuilding…";
  try {
    await rebuildStatistics();
    await loadDashboard();
    message("Statistics rebuilt from submitted attempts.");
  } catch (error) {
    console.error(error);
    message(error.message || "Statistics rebuild failed.");
  } finally {
    button.disabled = false;
    button.textContent = "Rebuild statistics";
  }
});

$("studentSearch")?.addEventListener("input", event => renderStudents(event.target.value));
$("logout")?.addEventListener("click", async () => { await firebaseSignOut(auth); location.replace("index.html"); });

onAuthStateChanged(auth, async user => {
  if (!user) return location.replace("index.html");
  try {
    await assertAdmin(user);
    await loadDashboard();
  } catch (error) {
    console.error(error);
    await firebaseSignOut(auth).catch(() => {});
    location.replace("index.html");
  }
});
