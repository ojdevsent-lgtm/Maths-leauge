import { auth, db, firebaseSignOut } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const message = $("dashboardMessage");
const content = $("dashboardContent");

$("logoutButton")?.addEventListener("click", async () => { await firebaseSignOut(auth); window.location.replace("../auth.html"); });

function showError(text) { message.textContent = text; message.classList.add("error"); message.hidden = false; content.hidden = true; }

async function ensureStudentProfile(user) {
  const ref = doc(db, "students", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const profile = {
    uid: user.uid,
    fullName: user.displayName || (user.email ? user.email.split("@")[0] : "Student"),
    email: user.email || "",
    phone: "",
    school: "Not provided",
    state: "Not provided",
    leaguePoints: 0,
    quizzesTaken: 0,
    averageAccuracy: 0,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, profile);
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
    const leaderboardSnap = await getDoc(doc(db, "leaderboard", user.uid));
    $("rank").textContent = leaderboardSnap.exists() && leaderboardSnap.data().rank ? `#${leaderboardSnap.data().rank}` : "—";
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
  if (!user) { window.location.replace("../auth.html"); return; }
  try { await loadDashboard(user); }
  catch (error) {
    console.error("Dashboard load failed", error);
    showError(error.code === "permission-denied" || error.code === "permission-denied" ? "Firebase signed you in, but Firestore rejected the student profile. Deploy the current Firestore rules before testing again." : "We couldn't load your dashboard. Please try again.");
  }
});
