import { auth, db } from "../firebase/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const message = document.getElementById("dashboardMessage");
document.getElementById("logout").addEventListener("click", () => signOut(auth).then(() => { window.location.href = "../login.html"; }));

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "../login.html"; return; }
  try {
    const snapshot = await getDoc(doc(db, "students", user.uid));
    if (!snapshot.exists()) throw new Error("Student profile not found");
    const student = snapshot.data();
    document.getElementById("studentName").textContent = student.fullName || "Student";
    document.getElementById("points").textContent = student.points ?? 0;
    document.getElementById("quizzesTaken").textContent = student.quizzesTaken ?? 0;
    document.getElementById("averageScore").textContent = `${student.averageScore ?? 0}%`;
  } catch (error) {
    console.error(error);
    message.textContent = "We couldn't load your student profile. Please try again.";
  }
});
