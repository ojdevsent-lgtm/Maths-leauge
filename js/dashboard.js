import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getStudentDashboard = httpsCallable(functions, "getStudentDashboard");
const $ = id => document.getElementById(id);

function set(id, value) { const el = $(id); if (el) el.textContent = value; }
function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }

onAuthStateChanged(auth, async user => {
  if (!user) return (window.location.href = "auth.html");
  try {
    const { data } = await getStudentDashboard();
    const student = data.student || {};
    set("studentName", (student.fullName || "Student").trim().split(" ")[0]);
    set("registrationNumber", student.registrationNumber || "Not assigned");
    set("totalPoints", data.stats.totalPoints);
    set("quizzesCompleted", data.stats.quizzesCompleted);
    set("averageScore", `${data.stats.averageScore}%`);
    set("leagueRank", data.stats.leagueRank ? `#${data.stats.leagueRank}` : "—");

    const list = $("activityList");
    const empty = $("activityEmpty");
    if (data.recentAttempts?.length) {
      empty && (empty.style.display = "none");
      list.innerHTML = data.recentAttempts.map(a => `
        <div class="activity-item">
          <div class="activity-item-left">
            <div class="activity-item-icon"><i class="ri-brain-line"></i></div>
            <div><strong>${esc(a.quizTitle || "Daily Quiz")}</strong><span>${a.score}/${a.totalQuestions} · ${a.points} points</span></div>
          </div>
        </div>`).join("");
    } else {
      empty && (empty.style.display = "block");
      list && (list.innerHTML = "");
    }
  } catch (error) {
    console.error(error);
  }
});

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { quiz: "quiz.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) window.location.href = routes[item.dataset.page];
}));

$("quizAction")?.addEventListener("click", () => location.href = "quiz.html");
$("progressAction")?.addEventListener("click", () => location.href = "progress.html");
$("startFirstQuiz")?.addEventListener("click", () => location.href = "quiz.html");
$("viewAllActivity")?.addEventListener("click", () => location.href = "progress.html");
