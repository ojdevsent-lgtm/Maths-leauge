import { auth, db, functions, firebaseSignOut, httpsCallable } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const message = $("dashboardMessage");
const content = $("dashboardContent");

$("logoutButton")?.addEventListener("click", async () => { await firebaseSignOut(auth); window.location.replace("../login.html"); });

function showError(text) { message.textContent = text; message.classList.add("error"); message.hidden = false; content.hidden = true; }

async function ensureStudentProfile(user) {
  const ref = doc(db, "students", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const registerStudent = httpsCallable(functions, "registerStudent");
  await registerStudent({ fullName: user.displayName || (user.email ? user.email.split("@")[0] : "Student"), school: "Not provided", state: "Not provided" });
  const created = await getDoc(ref);
  if (!created.exists()) throw new Error("student-profile-create-failed");
  return created.data();
}

async function loadDashboard(user) {
  const student = await ensureStudentProfile(user);
  $("studentName").textContent = student.fullName || "Student";
  $("points").textContent = Number(student.leaguePoints || 0).toLocaleString();
  $("quizzesTaken").textContent = Number(student.quizzesTaken || 0);
  $("averageScore").textContent = `${Math.round(Number(student.averageAccuracy || 0))}%`;

  try {
    const getStudentRank = httpsCallable(functions, "getStudentRank");
    const rank = await getStudentRank({});
    $("rank").textContent = rank.data ? `#${rank.data}` : "—";
  } catch { $("rank").textContent = "—"; }

  try {
    const quizSnap = await getDocs(query(collection(db, "quizzes"), where("status", "==", "live"), limit(1)));
    if (!quizSnap.empty) {
      const quizSnapDoc = quizSnap.docs[0]; const data = quizSnapDoc.data();
      $("challengeTitle").textContent = data.title || "Live challenge";
      $("challengeMeta").textContent = `${data.questionCount || 0} questions · ${Math.round(Number(data.durationSeconds || 0) / 60) || 0} minutes`;
      const button = $("challengeButton"); button.href = `quiz.html?id=${encodeURIComponent(quizSnapDoc.id)}`; button.hidden = false;
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
  if (!user) { window.location.replace("../login.html"); return; }
  try { await loadDashboard(user); }
  catch (error) {
    console.error("Dashboard load failed", error);
    const code = `${error?.code || ""} ${error?.message || ""}`;
    if (/functions\/|unavailable|deadline|internal/i.test(code)) showError("Your account is signed in, but the student profile service is not available yet. Deploy the current Firebase Cloud Functions, then refresh this page.");
    else if (/permission-denied|unauthenticated/i.test(code)) showError("Your account is signed in, but Firebase rejected the student profile. Deploy the current Firestore rules and Cloud Functions, then refresh.");
    else showError("We couldn't load your dashboard. Please try again.");
  }
});
