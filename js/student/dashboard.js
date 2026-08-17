import { auth, db } from "../firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const message = $("dashboardMessage");
const content = $("dashboardContent");

$("logoutButton")?.addEventListener("click", async () => { await signOut(auth); window.location.href = "../auth.html"; });

function showError(text) { message.textContent = text; message.classList.add("error"); content.hidden = true; }

async function loadDashboard(user) {
  const studentSnap = await getDoc(doc(db, "students", user.uid));
  if (!studentSnap.exists()) throw new Error("student-profile-missing");
  const student = studentSnap.data();
  $("studentName").textContent = student.fullName || "Student";
  $("points").textContent = Number(student.leaguePoints || 0).toLocaleString();
  $("quizzesTaken").textContent = Number(student.quizzesTaken || 0);
  $("averageScore").textContent = `${Math.round(Number(student.averageAccuracy || 0))}%`;

  try {
    const leaderboardSnap = await getDoc(doc(db, "leaderboard", user.uid));
    $("rank").textContent = leaderboardSnap.exists() && leaderboardSnap.data().rank ? `#${leaderboardSnap.data().rank}` : "—";
  } catch { $("rank").textContent = "—"; }

  try {
    const quizSnap = await getDocs(query(collection(db, "quizzes"), where("status", "==", "live"), limit(1)));
    if (!quizSnap.empty) {
      const quiz = quizSnap.docs[0]; const data = quiz.data();
      $("challengeTitle").textContent = data.title || "Live challenge";
      $("challengeMeta").textContent = `${data.questionCount || 0} questions · ${Math.round(Number(data.durationSeconds || 0) / 60) || 0} minutes`;
      const button = $("challengeButton"); button.href = `quiz.html?id=${encodeURIComponent(quiz.id)}`; button.hidden = false;
    }
  } catch (error) { console.warn("Live quiz lookup failed", error); }

  try {
    const attemptsSnap = await getDocs(query(collection(db, "attempts"), where("studentId", "==", user.uid), orderBy("submittedAt", "desc"), limit(5)));
    const results = $("recentResults");
    if (!attemptsSnap.empty) results.innerHTML = attemptsSnap.docs.map(item => { const data = item.data(); return `<div class="result-item"><strong>${data.quizTitle || "Quiz"}</strong><span>${data.score ?? "Pending"}/${data.totalQuestions ?? "—"} · ${data.accuracy ?? "—"}%</span></div>`; }).join("");
  } catch (error) { console.warn("Recent results lookup failed", error); }

  try {
    const announcementsSnap = await getDocs(query(collection(db, "announcements"), where("active", "==", true), orderBy("publishedAt", "desc"), limit(3)));
    const announcements = $("announcements");
    if (!announcementsSnap.empty) announcements.innerHTML = announcementsSnap.docs.map(item => { const data = item.data(); return `<div class="result-item"><strong>${data.title || "Announcement"}</strong><span>${data.body || ""}</span></div>`; }).join("");
  } catch (error) { console.warn("Announcements lookup failed", error); }

  message.hidden = true; content.hidden = false;
}

onAuthStateChanged(auth, async user => {
  if (!user) { window.location.replace("../auth.html"); return; }
  try { await loadDashboard(user); }
  catch (error) {
    console.error(error);
    showError(error.message === "student-profile-missing" ? "Your student profile could not be found. If you just registered, wait for the latest deployment and register once more with a new email." : "We couldn't load your dashboard. Please try again.");
  }
});
