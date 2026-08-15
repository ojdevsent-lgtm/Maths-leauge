import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getStudentDashboard = httpsCallable(functions, "getStudentDashboard");
const $ = id => document.getElementById(id);
const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };

onAuthStateChanged(auth, async user => {
  if (!user) return (location.href = "auth.html");
  try {
    const { data } = await getStudentDashboard();
    const s = data.student || {};
    set("studentName", s.fullName || "Student");
    set("registrationNumber", s.registrationNumber || "Not assigned");
    set("totalPoints", data.stats.totalPoints);
    set("quizzesCompleted", data.stats.quizzesCompleted);
    set("averageScore", `${data.stats.averageScore}%`);
    set("leagueRank", data.stats.leagueRank ? `#${data.stats.leagueRank}` : "—");
    renderHistory(data.attempts || []);
  } catch (error) {
    console.error(error);
    const el = $("progressError"); if (el) { el.textContent = "Unable to load progress."; el.classList.add("show"); }
  }
});

function renderHistory(attempts) {
  const history = $("quizHistory");
  if (!history) return;
  if (!attempts.length) {
    history.innerHTML = `<div class="empty-progress"><i class="ri-bar-chart-box-line"></i><p>You haven't completed any quizzes yet.</p></div>`;
    return;
  }
  history.innerHTML = attempts.map(a => {
    const date = a.completedAt ? new Date(a.completedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "Completed";
    return `<div class="history-item"><div class="history-left"><span class="history-title">${a.quizTitle || "Daily Quiz"}</span><span class="history-date">${date}</span></div><div class="history-right"><span class="history-score">${a.score}/${a.totalQuestions}</span><span class="history-points">${a.points} points</span></div></div>`;
  }).join("");
}

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { home: "dashboard.html", rank: "leaderboard.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) location.href = routes[item.dataset.page];
}));
$("profileButton")?.addEventListener("click", () => location.href = "profile.html");
