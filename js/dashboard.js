import { requireUser, onSignedOut, displayError } from "./core/session.js";
import { getStudentOverview, getRank } from "./services/student.service.js";

const $ = id => document.getElementById(id);
const set = (id, value) => { const element = $(id); if (element) element.textContent = value ?? ""; };
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

async function loadDashboard() {
  try {
    const user = await requireUser();
    if (!user) return;
    const overview = await getStudentOverview(user);
    const rank = await getRank(overview.student);

    set("studentName", (overview.student.fullName || "Student").trim().split(" ")[0]);
    set("registrationNumber", overview.student.registrationNumber || "Not assigned");
    set("totalPoints", overview.stats.totalPoints);
    set("quizzesCompleted", overview.stats.quizzesCompleted);
    set("averageScore", `${overview.stats.averageScore}%`);
    set("leagueRank", rank ? `#${rank}` : "—");

    const announcements = $("announcementsList");
    if (announcements) {
      announcements.innerHTML = overview.announcements.map(a => `<article class="dashboard-announcement"><strong>${esc(a.title)}</strong><p>${esc(a.body)}</p></article>`).join("");
      announcements.closest(".dashboard-section")?.classList.toggle("hidden", !overview.announcements.length);
    }

    const list = $("activityList");
    const empty = $("activityEmpty");
    if (overview.attempts.length) {
      if (empty) empty.style.display = "none";
      if (list) list.innerHTML = overview.attempts.slice(0, 5).map(a => `<div class="activity-item"><div class="activity-item-left"><div class="activity-item-icon"><i class="ri-brain-line"></i></div><div><strong>${esc(a.quizTitle)}</strong><span>${a.score}/${a.totalQuestions} · ${a.points} points</span></div></div></div>`).join("");
    } else {
      if (empty) empty.style.display = "block";
      if (list) list.innerHTML = "";
    }
  } catch (error) {
    console.error("Dashboard load failed:", error);
    const errorEl = $("dashboardError");
    if (errorEl) errorEl.textContent = displayError(error, "Unable to load your dashboard. Please try again.");
  }
}

loadDashboard();
onSignedOut();

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { quiz: "quiz.html", rank: "leaderboard.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) location.href = routes[item.dataset.page];
}));
$("quizAction")?.addEventListener("click", () => location.href = "quiz.html");
$("progressAction")?.addEventListener("click", () => location.href = "progress.html");
$("startFirstQuiz")?.addEventListener("click", () => location.href = "quiz.html");
$("viewAllActivity")?.addEventListener("click", () => location.href = "progress.html");
