import { auth, db } from "../firebase/config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");
const submitButton = form?.querySelector("button[type='submit']");

function friendlyError(error) {
  const code = error?.code || "";
  if (code === "auth/email-already-in-use") return "An account with this email already exists. Try signing in instead.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/weak-password") return "Your password is too weak. Use at least 6 characters.";
  if (code === "auth/operation-not-allowed") return "Email/password sign-in is not enabled in Firebase Authentication.";
  if (code === "permission-denied" || code === "firestore/permission-denied") return "Your account was created, but Firebase blocked the student profile. The profile fields and Firestore rules must match.";
  if (code === "auth/network-request-failed") return "Firebase could not be reached. Check your internet connection and try again.";
  return `Registration failed (${code || "unknown error"}). Please try again.`;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Creating your account…";
  if (submitButton) submitButton.disabled = true;

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
      uid,
      fullName: form.fullName.value.trim(),
      email,
      school: form.school.value.trim(),
      state: form.state.value.trim(),
      leaguePoints: 0,
      quizzesTaken: 0,
      averageAccuracy: 0,
      status: "active",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    message.className = "form-message success";
    message.textContent = "Account created. Opening your dashboard…";
    window.location.href = "student/dashboard.html";
  } catch (error) {
    console.error("Maths League registration failed", { code: error?.code, message: error?.message });
    message.textContent = friendlyError(error);
    if (submitButton) submitButton.disabled = false;
  }
});
