import { requireUser, onSignedOut, displayError } from "./core/session.js";
import { getStudentProgress, getRank } from "./services/student.service.js";

const $ = id => document.getElementById(id);
const set = (id, value) => { const element = $(id); if (element) element.textContent = value; };

function finishLoading() {
  $("progressLoading")?.classList.add("hidden");
}

function showError(error) {
  finishLoading();
  const errorEl = $("progressError");
  if (!errorEl) return;
  errorEl.textContent = displayError(error, "We couldn't load your progress. Please try again.");
  errorEl.classList.add("show");
}

function renderHistory(attempts) {
  const history = $("quizHistory");
  if (!history) return;
  if (!attempts.length) {
    history.innerHTML = '<div class="empty-progress"><i class="ri-bar-chart-box-line"></i><p>You haven\'t completed any quizzes yet.</p></div>';
    return;
  }
  history.innerHTML = attempts.map(a => {
    const date = a.completed_at || a.completedAt;
    const formatted = date ? new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Completed";
    return `<div class="history-item"><div class="history-left"><span class="history-title">${escapeHtml(a.quizTitle)}</span><span class="history-date">${formatted}</span></div><div class="history-right"><span class="history-score">${a.score}/${a.totalQuestions}</span><span class="history-points">${a.points} points</span></div></div>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

async function loadProgress() {
  try {
    const user = await requireUser();
    if (!user) return;
    const overview = await getStudentProgress(user);
    const rank = await getRank(overview.student);

    set("studentName", overview.student.fullName || "Student");
    set("registrationNumber", overview.student.registrationNumber || "Not assigned");
    set("totalPoints", overview.stats.totalPoints);
    set("quizzesCompleted", overview.stats.quizzesCompleted);
    set("averageScore", `${overview.stats.averageScore}%`);
    set("leagueRank", rank ? `#${rank}` : "—");
    renderHistory(overview.attempts);

    finishLoading();
    $("progressError")?.classList.remove("show");
  } catch (error) {
    showError(error);
  }
}

loadProgress();
onSignedOut();

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { home: "dashboard.html", rank: "leaderboard.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) location.href = routes[item.dataset.page];
}));
$("profileButton")?.addEventListener("click", () => location.href = "profile.html");
