import { supabase, watchAuth } from "./supabase.js";
const $ = id => document.getElementById(id);
const set = (id, value) => { const element = $(id); if (element) element.textContent = value; };

watchAuth(async user => {
  if (!user) return location.href = "auth.html";
  try {
    const { data, error } = await supabase.rpc("get_student_dashboard");
    if (error) throw error;
    const s = data?.student || {}, stats = data?.stats || {};
    set("studentName", s.fullName || "Student");
    set("registrationNumber", s.registrationNumber || "Not assigned");
    set("totalPoints", stats.totalPoints ?? 0);
    set("quizzesCompleted", stats.quizzesCompleted ?? 0);
    set("averageScore", `${stats.averageScore ?? 0}%`);
    set("leagueRank", stats.leagueRank ? `#${stats.leagueRank}` : "—");
    renderHistory(data?.attempts || data?.recentAttempts || []);
    $("progressLoading")?.classList.add("hidden");
    $("progressError")?.classList.remove("show");
  } catch (error) {
    console.error("Progress load failed:", error);
    $("progressLoading")?.classList.add("hidden");
    const errorEl = $("progressError");
    if (errorEl) {
      errorEl.textContent = "We couldn't load your progress. Please refresh and try again.";
      errorEl.classList.add("show");
    }
  }
});

function renderHistory(attempts) {
  const history = $("quizHistory");
  if (!history) return;
  if (!attempts.length) {
    history.innerHTML = '<div class="empty-progress"><i class="ri-bar-chart-box-line"></i><p>You haven\'t completed any quizzes yet.</p></div>';
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
