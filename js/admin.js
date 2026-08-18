import { auth, functions, watchAuth, firebaseSignOut, httpsCallable } from "./firebase.js";

const $ = id => document.getElementById(id);
const getAdminAccess = httpsCallable(functions, "getAdminAccess");
const getAdminDashboard = httpsCallable(functions, "getAdminDashboard");
const setStudentStatus = httpsCallable(functions, "setStudentStatus");
const setAnnouncementStatus = httpsCallable(functions, "setAnnouncementStatus");
let dashboard = { students: [], recentAttempts: [], announcements: [] };

const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function message(text) {
  const el = $("adminMessage");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(message.timer);
  message.timer = setTimeout(() => el.classList.remove("show"), 4500);
}

function renderStats(stats) {
  $("statStudents") && ($("statStudents").textContent = stats.students ?? 0);
  $("statAttempts") && ($("statAttempts").textContent = stats.quizzesTaken ?? 0);
  $("statPoints") && ($("statPoints").textContent = stats.pointsAwarded ?? 0);
  $("statAnnouncements") && ($("statAnnouncements").textContent = stats.activeAnnouncements ?? 0);
}

function renderAttempts() {
  const el = $("recentAttempts");
  if (!el) return;
  if (!dashboard.recentAttempts.length) {
    el.innerHTML = '<div class="admin-empty">No quiz attempts yet.</div>';
    return;
  }
  el.innerHTML = `<table class="admin-table"><thead><tr><th>Student</th><th>Quiz</th><th>Score</th><th>Points</th><th>Completed</th></tr></thead><tbody>${dashboard.recentAttempts.map(a => `<tr><td>${esc(a.studentName || "Student")}<br><small>${esc(a.registrationNumber)}</small></td><td>${esc(a.quizTitle)}</td><td>${Number(a.score || 0)}/${Number(a.total_questions || a.totalQuestions || 0)}</td><td>${Number(a.points || 0)}</td><td>${a.completedAt ? new Date(a.completedAt).toLocaleString("en-NG") : "—"}</td></tr>`).join("")}</tbody></table>`;
}

function renderStudents(filter = "") {
  const el = $("studentsTable");
  if (!el) return;
  const q = filter.toLowerCase();
  const rows = dashboard.students.filter(s => !q || [s.full_name, s.email, s.registration_number, s.school, s.state].some(v => String(v || "").toLowerCase().includes(q)));
  el.innerHTML = rows.length
    ? `<table class="admin-table"><thead><tr><th>Student</th><th>Registration</th><th>School</th><th>Points</th><th>Quizzes</th><th>Status</th></tr></thead><tbody>${rows.map(s => `<tr><td><strong>${esc(s.full_name)}</strong><br><small>${esc(s.email)}</small></td><td>${esc(s.registration_number)}</td><td>${esc(s.school)}<br><small>${esc(s.state)}</small></td><td>${Number(s.points || 0)}</td><td>${Number(s.quizzes_taken || 0)}</td><td><button class="status-btn" data-student-id="${esc(s.id)}">${esc(s.status || "active")}</button></td></tr>`).join("")}</tbody></table>`
    : '<div class="admin-empty">No matching students.</div>';

  el.querySelectorAll("[data-student-id]").forEach(button => button.addEventListener("click", async () => {
    const student = dashboard.students.find(item => item.id === button.dataset.studentId);
    if (!student) return;
    button.disabled = true;
    try {
      await setStudentStatus({ studentId: student.id, status: student.status === "Suspended" ? "active" : "Suspended" });
      await loadDashboard();
      message("Student status updated.");
    } catch (error) {
      message(error.message || "Unable to update student status.");
      button.disabled = false;
    }
  }));
}

function renderAnnouncements() {
  const el = $("announcementsList");
  if (!el) return;
  const data = dashboard.announcements || [];
  el.innerHTML = data.map(a => `<article class="announcement-item"><strong>${esc(a.title)}</strong><p>${esc(a.body)}</p><small>${a.active ? "Active" : "Hidden"}</small><br><button class="status-btn" data-announcement-id="${esc(a.id)}">${a.active ? "Hide" : "Publish"}</button></article>`).join("") || '<div class="admin-empty">No announcements.</div>';
  el.querySelectorAll("[data-announcement-id]").forEach(button => button.addEventListener("click", async () => {
    const row = data.find(item => item.id === button.dataset.announcementId);
    if (!row) return;
    try {
      await setAnnouncementStatus({ announcementId: row.id, active: !row.active });
      await loadDashboard();
      message("Announcement updated.");
    } catch (error) {
      message(error.message || "Unable to update announcement.");
    }
  }));
}

async function loadDashboard() {
  const result = await getAdminDashboard();
  dashboard = result.data || {};
  renderStats(dashboard.stats || {});
  renderAttempts();
  renderStudents($("studentSearch")?.value || "");
  renderAnnouncements();
}

$("studentSearch")?.addEventListener("input", event => renderStudents(event.target.value));
$("logoutButton")?.addEventListener("click", async () => {
  await firebaseSignOut(auth);
  location.href = "auth.html";
});

watchAuth(async user => {
  if (!user) return location.replace("auth.html");
  try {
    await getAdminAccess();
    await loadDashboard();
  } catch (error) {
    console.error("Admin access denied", error);
    message("Administrator access is required.");
    setTimeout(() => location.replace("dashboard.html"), 900);
  }
});
