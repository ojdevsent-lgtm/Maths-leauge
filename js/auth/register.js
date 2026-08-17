import { auth, db } from "../firebase/config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Creating your account…";
  try {
    const credential = await createUserWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    const { uid, email } = credential.user;
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      role: "student",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    });
    await setDoc(doc(db, "students", uid), {
      fullName: form.fullName.value.trim(),
      email,
      school: form.school.value.trim(),
      state: form.state.value.trim(),
      points: 0,
      quizzesTaken: 0,
      averageScore: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    window.location.href = "student/dashboard.html";
  } catch (error) {
    console.error(error);
    message.textContent = error.code === "auth/email-already-in-use" ? "An account with this email already exists." : "We couldn't create your account. Please try again.";
  }
});
