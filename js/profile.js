import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { db } from "./firebase.js";

const $ = id => document.getElementById(id);
onAuthStateChanged(auth, async user => {
  if (!user) return (location.href = "auth.html");
  try {
    const snap = await getDoc(doc(db, "mlTriviaStudents", user.uid));
    if (!snap.exists()) throw new Error("Student profile not found.");
    const s = snap.data();
    $("fullName").textContent = s.fullName || "—";
    $("registrationNumber").textContent = s.registrationNumber || "—";
    $("memberStatus").textContent = s.status || "Active";
    $("email").textContent = user.email || "—";
    $("phone").textContent = s.phone || "—";
    $("school").textContent = s.school || "—";
    $("state").textContent = s.state || "—";
    $("profileLoading")?.classList.add("hidden");
  } catch (error) {
    console.error(error);
    $("profileError") && ($("profileError").textContent = "Unable to load your profile.");
  }
});
$("logoutButton")?.addEventListener("click", async () => { await signOut(auth); location.href = "auth.html"; });
$("backButton")?.addEventListener("click", () => history.back());

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { home: "dashboard.html", rank: "leaderboard.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) location.href = routes[item.dataset.page];
}));
